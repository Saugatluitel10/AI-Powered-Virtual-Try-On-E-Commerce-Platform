import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [0, 5_000, 30_000];

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function deliverWebhook(
  tenantId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { webhookUrl: true, webhookSecret: true },
  });

  if (!tenant?.webhookUrl) return;

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  const signature = tenant.webhookSecret
    ? signPayload(payload, tenant.webhookSecret)
    : undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt - 1] ?? 0;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));

    let statusCode: number | undefined;
    let responseBody: string | undefined;
    let success = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(tenant.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VTryon-Event": event,
          ...(signature ? { "X-VTryon-Signature": `sha256=${signature}` } : {}),
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = res.status;
      responseBody = await res.text().catch(() => "");
      success = res.ok;
    } catch (err) {
      responseBody = err instanceof Error ? err.message : "Request failed";
    }

    await prisma.webhookLog.create({
      data: {
        tenantId,
        event,
        payload: data as unknown as Prisma.InputJsonValue,
        url: tenant.webhookUrl,
        statusCode,
        response: responseBody?.slice(0, 1000),
        attempt,
        success,
      },
    });

    if (success) return;
  }
}
