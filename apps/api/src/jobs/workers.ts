import { Worker } from "bullmq";
import { BodyType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { uploadTryonResult, getSignedUrl, BUCKETS } from "../lib/supabase";
import { sendOrderConfirmation, sendOrderStatusUpdate, sendReturnRequestUpdate, sendOrderReceipt, sendRefundConfirmation, sendPriceAlert } from "../lib/resend";
import type { TryOnJobData, EmailJobData, BodyAnalysisJobData } from "./queues";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8001";

// ─── Try-on worker ───────────────────────────────────────────────────────────
// Calls the AI service's synchronous /try-on/try-on endpoint (up to 60s),
// downloads the result image, and saves it to Supabase Storage + Postgres.
export const tryOnWorker = new Worker<TryOnJobData>(
  "try-on",
  async (job) => {
    const { resultId, userId, productId, userPhotoUrl, garmentImageUrl, productName } =
      job.data;

    // Mark as processing
    await prisma.tryOnResult.update({
      where: { id: resultId },
      data: { status: "processing" },
    });

    // Call AI service — synchronous try-on (polls internally up to 60s)
    const aiRes = await fetch(`${AI_SERVICE_URL}/try-on/try-on`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_photo_url: userPhotoUrl,
        garment_url: garmentImageUrl,
        product_id: productId,
        garment_description: productName,
      }),
    });

    if (aiRes.status === 408) {
      // Timeout — AI service returns 408
      const body = (await aiRes.json()) as { detail?: string };
      await prisma.tryOnResult.update({
        where: { id: resultId },
        data: {
          status: "failed",
          errorMessage: body.detail ?? "Try-on timed out.",
        },
      });
      return;
    }

    if (!aiRes.ok) {
      const body = (await aiRes.json().catch(() => ({}))) as { detail?: string };
      await prisma.tryOnResult.update({
        where: { id: resultId },
        data: {
          status: "failed",
          errorMessage: body.detail ?? `AI service returned ${aiRes.status}`,
        },
      });
      return;
    }

    const result = (await aiRes.json()) as {
      prediction_id: string;
      result_url: string;
      processing_time_ms: number;
    };

    // Download the result image from Replicate and re-upload to our storage
    const imgRes = await fetch(result.result_url);
    if (!imgRes.ok) {
      await prisma.tryOnResult.update({
        where: { id: resultId },
        data: {
          status: "failed",
          predictionId: result.prediction_id,
          processingTimeMs: result.processing_time_ms,
          errorMessage: "Failed to download result image from model.",
        },
      });
      return;
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const storagePath = await uploadTryonResult(userId, productId, buffer, "image/jpeg");

    await prisma.tryOnResult.update({
      where: { id: resultId },
      data: {
        status: "completed",
        resultImageUrl: storagePath,
        predictionId: result.prediction_id,
        processingTimeMs: result.processing_time_ms,
      },
    });
  },
  { connection, concurrency: 3 }
);

// ─── Body analysis worker ─────────────────────────────────────────────────────
const VALID_BODY_TYPES = new Set<string>(Object.values(BodyType));

export const bodyAnalysisWorker = new Worker<BodyAnalysisJobData>(
  "body-analysis",
  async (job) => {
    const { userId, storagePath } = job.data;

    const signedUrl = await getSignedUrl(BUCKETS.USER_PHOTOS, storagePath, 300);
    const imgRes = await fetch(signedUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download photo: ${imgRes.statusText}`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const imageBase64 = buffer.toString("base64");

    const aiRes = await fetch(`${AI_SERVICE_URL}/body/analyze-body`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });

    if (!aiRes.ok) {
      const errBody = (await aiRes.json()) as { detail?: string };
      throw new Error(errBody.detail ?? `AI service error ${aiRes.status}`);
    }

    const result = (await aiRes.json()) as {
      height_cm: number;
      shoulder_cm: number;
      bust_cm: number;
      waist_cm: number;
      hips_cm: number;
      body_type: string;
      confidence: number;
    };

    if (!VALID_BODY_TYPES.has(result.body_type)) {
      throw new Error(`Unrecognised body type: ${result.body_type}`);
    }

    const confidence = result.confidence;
    const highConf = confidence >= 0.8 ? confidence : confidence * 0.9;
    const medConf = confidence * 0.85;

    const profile = await prisma.bodyProfile.upsert({
      where: { userId },
      update: {
        height: result.height_cm,
        bust: result.bust_cm,
        waist: result.waist_cm,
        hips: result.hips_cm,
        shoulders: result.shoulder_cm,
        bodyType: result.body_type as BodyType,
        overallConfidence: confidence,
        heightConfidence: highConf,
        bustConfidence: medConf,
        waistConfidence: medConf,
        hipsConfidence: medConf,
        shouldersConfidence: highConf,
      },
      create: {
        userId,
        height: result.height_cm,
        bust: result.bust_cm,
        waist: result.waist_cm,
        hips: result.hips_cm,
        shoulders: result.shoulder_cm,
        bodyType: result.body_type as BodyType,
        overallConfidence: confidence,
        heightConfidence: highConf,
        bustConfidence: medConf,
        waistConfidence: medConf,
        hipsConfidence: medConf,
        shouldersConfidence: highConf,
      },
    });

    await prisma.measurementHistory.create({
      data: {
        bodyProfileId: profile.id,
        height: result.height_cm,
        bust: result.bust_cm,
        waist: result.waist_cm,
        hips: result.hips_cm,
        shoulders: result.shoulder_cm,
        bodyType: result.body_type as BodyType,
        source: "ai_estimated",
      },
    });
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
    } else if (type === "order_status_update") {
      await sendOrderStatusUpdate(
        to,
        payload.orderId as string,
        payload.status as string
      );
    } else if (type === "return_request_update") {
      await sendReturnRequestUpdate(
        to,
        payload.orderId as string,
        payload.status as string
      );
    } else if (type === "order_receipt") {
      await sendOrderReceipt(
        to,
        payload.orderId as string,
        payload.total as number,
        payload.currency as string,
        payload.paymentMethod as string,
        payload.invoiceUrl as string
      );
    } else if (type === "refund_confirmation") {
      await sendRefundConfirmation(
        to,
        payload.orderId as string,
        payload.refundAmount as number,
        payload.currency as string,
        payload.reason as string
      );
    } else if (type === "price_alert") {
      await sendPriceAlert(
        to,
        payload.productName as string,
        payload.productSlug as string,
        payload.currentPrice as number,
        payload.targetPrice as number,
        payload.currency as string
      );
    }
  },
  { connection, concurrency: 10 }
);

tryOnWorker.on("failed", (job, err) => {
  console.error(`[TryOn worker] job ${job?.id} failed:`, err.message);
});

bodyAnalysisWorker.on("failed", (job, err) => {
  console.error(`[BodyAnalysis worker] job ${job?.id} failed:`, err.message);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Email worker] job ${job?.id} failed:`, err.message);
});
