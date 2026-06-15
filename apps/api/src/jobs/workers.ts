import { Worker } from "bullmq";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { uploadToStorage } from "../lib/supabase";
import { sendOrderConfirmation } from "../lib/resend";
import type { TryOnJobData, EmailJobData } from "./queues";

// ─── Try-on polling worker ────────────────────────────────────────────────────
export const tryOnWorker = new Worker<TryOnJobData>(
  "try-on",
  async (job) => {
    const { sessionId, predictionId } = job.data;

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8001";
    const response = await fetch(`${AI_SERVICE_URL}/try-on/status/${predictionId}`);
    const result = (await response.json()) as {
      status: string;
      output?: string;
      error?: string;
    };

    if (result.status === "succeeded" && result.output) {
      // Download result image and re-upload to Supabase Storage
      const imgRes = await fetch(result.output);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const storageUrl = await uploadToStorage(
        "try-on-results",
        `${sessionId}.jpg`,
        buffer,
        "image/jpeg"
      );

      await prisma.tryOnSession.update({
        where: { id: sessionId },
        data: { status: "completed", resultImageUrl: storageUrl },
      });
    } else if (result.status === "failed") {
      await prisma.tryOnSession.update({
        where: { id: sessionId },
        data: { status: "failed", errorMessage: result.error ?? "Prediction failed" },
      });
    } else {
      // Still processing — throw so BullMQ retries
      throw new Error(`Prediction still ${result.status}`);
    }
  },
  { connection: redis, concurrency: 5 }
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
  { connection: redis, concurrency: 10 }
);

tryOnWorker.on("failed", (job, err) => {
  console.error(`[TryOn worker] job ${job?.id} failed:`, err.message);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Email worker] job ${job?.id} failed:`, err.message);
});
