import { Worker } from "bullmq";
import { prisma } from "../lib/prisma";
import { uploadTryonResult } from "../lib/supabase";
import { sendOrderConfirmation } from "../lib/resend";
import type { TryOnJobData, EmailJobData } from "./queues";
// tryonQueue / emailQueue are consumed by the workers below via BullMQ's Worker name matching

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

// ─── Try-on polling worker ────────────────────────────────────────────────────
export const tryOnWorker = new Worker<TryOnJobData>(
  "try-on",
  async (job) => {
    const { resultId, predictionId } = job.data;
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8001";

    const response = await fetch(`${AI_SERVICE_URL}/try-on/status/${predictionId}`);
    const result = (await response.json()) as {
      status: string;
      output?: string;
      error?: string;
    };

    if (result.status === "succeeded" && result.output) {
      const imgRes = await fetch(result.output);
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      // resultId encodes userId:productId — stored as "userId_productId" in job data
      const [userId = "unknown", productId = "unknown"] = resultId.split("_");
      const storagePath = await uploadTryonResult(userId, productId, buffer, "image/jpeg");

      await prisma.tryOnResult.update({
        where: { id: resultId },
        data: { status: "completed", resultImageUrl: storagePath },
      });
    } else if (result.status === "failed") {
      await prisma.tryOnResult.update({
        where: { id: resultId },
        data: { status: "failed" },
      });
    } else {
      throw new Error(`Prediction still ${result.status}`);
    }
  },
  { connection, concurrency: 5 }
);

// ─── Email worker ─────────────────────────────────────────────────────────────
export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job) => {
    const { type, to, payload } = job.data;
    if (type === "order_confirmation") {
      await sendOrderConfirmation(
        to,
        payload.orderId as string,
        payload.total as number,
        payload.currency as string
      );
    }
  },
  { connection, concurrency: 10 }
);

tryOnWorker.on("failed", (job, err) => {
  console.error(`[TryOn worker] job ${job?.id} failed:`, err.message);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Email worker] job ${job?.id} failed:`, err.message);
});
