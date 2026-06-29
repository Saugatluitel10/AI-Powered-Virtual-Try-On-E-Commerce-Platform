import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

export const tryonQueue = new Queue("try-on", { connection });
export const emailQueue = new Queue("email", { connection });
export const bodyAnalysisQueue = new Queue("body-analysis", { connection });
export const notificationQueue = new Queue("notification", { connection });

export interface TryOnJobData {
  resultId: string;
  userId: string;
  productId: string;
  userPhotoUrl: string;
  garmentImageUrl: string;
  productName: string;
}

export interface EmailJobData {
  type: "order_confirmation" | "order_status_update" | "return_request_update" | "password_reset" | "try_on_complete" | "order_receipt" | "refund_confirmation" | "price_alert" | "brand_verified" | "weekly_digest";
  to: string;
  payload: Record<string, unknown>;
}

export interface BodyAnalysisJobData {
  userId: string;
  storagePath: string;
}

export async function enqueueTryOn(data: TryOnJobData) {
  await tryonQueue.add("try-on", data, {
    attempts: 1,
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

export async function enqueueBodyAnalysis(data: BodyAnalysisJobData) {
  await bodyAnalysisQueue.add("analyze", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: true,
    removeOnFail: 50,
  });
}
