import { Queue, Worker, QueueEvents } from "bullmq";
import { redis } from "../lib/redis";

// ─── Queue definitions ───────────────────────────────────────────────────────
export const tryOnQueue = new Queue("try-on", { connection: redis });
export const emailQueue = new Queue("email", { connection: redis });
export const notificationQueue = new Queue("notification", { connection: redis });

// ─── Job type interfaces ──────────────────────────────────────────────────────
export interface TryOnJobData {
  sessionId: string;
  predictionId: string;
}

export interface EmailJobData {
  type: "order_confirmation" | "password_reset" | "try_on_complete";
  to: string;
  payload: Record<string, unknown>;
}

export async function enqueueTryOnPolling(data: TryOnJobData) {
  await tryOnQueue.add("poll-result", data, {
    attempts: 30,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

export async function enqueueEmail(data: EmailJobData) {
  await emailQueue.add("send", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
  });
}
