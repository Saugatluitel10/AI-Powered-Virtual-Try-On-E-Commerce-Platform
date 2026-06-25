import { Router, type Request } from "express";
import crypto from "crypto";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { enqueueEmail } from "../jobs/queues";

const router: ReturnType<typeof Router> = Router();

const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE ?? "EPAYTEST";
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY ?? "8gBm/:&EnhH.1/q";
const ESEWA_PAYMENT_URL = process.env.ESEWA_PAYMENT_URL ?? "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const ESEWA_VERIFY_URL = process.env.ESEWA_VERIFY_URL ?? "https://uat.esewa.com.np/epay/transrec";

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY ?? "";
const KHALTI_VERIFY_URL = process.env.KHALTI_VERIFY_URL ?? "https://a.khalti.com/api/v2/epayment/lookup/";
const KHALTI_INITIATE_URL = process.env.KHALTI_INITIATE_URL ?? "https://a.khalti.com/api/v2/epayment/initiate/";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

// ═══════════════════════════════════════════════════════════════════════════════
// eSewa
// ═══════════════════════════════════════════════════════════════════════════════

function generateEsewaSignature(message: string): string {
  return crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");
}

// ─── POST /api/v1/payments/esewa/initiate ────────────────────────────────────
router.post("/esewa/initiate", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required." });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.userId!, status: "pending" },
    });
    if (!order) {
      return res.status(404).json({ error: "Pending order not found." });
    }

    const totalAmount = order.totalAmount;
    const taxAmount = 0;
    const productServiceCharge = 0;
    const productDeliveryCharge = 0;
    const transactionUuid = `${order.id}-${Date.now()}`;

    const signedFieldNames = "total_amount,transaction_uuid,product_code";
    const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
    const signature = generateEsewaSignature(signatureMessage);

    return res.json({
      data: {
        paymentUrl: ESEWA_PAYMENT_URL,
        formData: {
          amount: totalAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          transaction_uuid: transactionUuid,
          product_code: ESEWA_MERCHANT_CODE,
          product_service_charge: productServiceCharge,
          product_delivery_charge: productDeliveryCharge,
          success_url: `${FRONTEND_URL}/checkout/esewa/success?orderId=${order.id}`,
          failure_url: `${FRONTEND_URL}/checkout/esewa/failure?orderId=${order.id}`,
          signed_field_names: signedFieldNames,
          signature,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error initiating eSewa payment";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/payments/esewa/verify ──────────────────────────────────────
router.post("/esewa/verify", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { orderId, encodedResponse } = req.body as {
      orderId?: string;
      encodedResponse?: string;
    };

    if (!orderId || !encodedResponse) {
      return res.status(400).json({ error: "orderId and encodedResponse are required." });
    }

    // Decode the base64 response from eSewa
    const decoded = JSON.parse(
      Buffer.from(encodedResponse, "base64").toString("utf-8")
    ) as {
      transaction_code?: string;
      status?: string;
      total_amount?: string;
      transaction_uuid?: string;
      product_code?: string;
      signed_field_names?: string;
      signature?: string;
    };

    if (decoded.status !== "COMPLETE") {
      return res.status(400).json({ error: "Payment was not completed." });
    }

    // Verify signature
    const signedFields = decoded.signed_field_names?.split(",") ?? [];
    const signatureMessage = signedFields
      .map((field) => `${field}=${decoded[field as keyof typeof decoded] ?? ""}`)
      .join(",");
    const expectedSignature = generateEsewaSignature(signatureMessage);

    if (decoded.signature !== expectedSignature) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    // Confirm the order
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.userId!, status: "pending" },
      include: { user: { select: { email: true } } },
    });
    if (!order) {
      return res.status(404).json({ error: "Pending order not found." });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "confirmed",
        paymentMethod: "esewa",
        paymentRef: decoded.transaction_code ?? decoded.transaction_uuid ?? null,
      },
    });

    // Send confirmation email
    await enqueueEmail({
      type: "order_confirmation",
      to: order.user.email,
      payload: {
        orderId: order.id,
        total: order.totalAmount,
        currency: order.currency,
      },
    });

    return res.json({
      data: {
        orderId: order.id,
        status: "confirmed",
        paymentRef: decoded.transaction_code ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error verifying eSewa payment";
    return res.status(500).json({ error: message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Khalti
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/v1/payments/khalti/initiate ───────────────────────────────────
router.post("/khalti/initiate", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required." });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.userId!, status: "pending" },
      include: {
        items: {
          include: { product: { select: { name: true } } },
          take: 1,
        },
      },
    });
    if (!order) {
      return res.status(404).json({ error: "Pending order not found." });
    }

    // Khalti expects amount in paisa (1 NPR = 100 paisa)
    const amountInPaisa = Math.round(order.totalAmount * 100);
    const productName = order.items[0]?.product.name ?? "VTryon Order";

    const khaltiRes = await fetch(KHALTI_INITIATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: `${FRONTEND_URL}/checkout/khalti/success?orderId=${order.id}`,
        website_url: FRONTEND_URL,
        amount: amountInPaisa,
        purchase_order_id: order.id,
        purchase_order_name: productName,
      }),
    });

    if (!khaltiRes.ok) {
      const body = await khaltiRes.json().catch(() => ({}));
      throw new Error((body as Record<string, unknown>).detail as string ?? `Khalti returned ${khaltiRes.status}`);
    }

    const result = (await khaltiRes.json()) as {
      pidx: string;
      payment_url: string;
    };

    return res.json({
      data: {
        pidx: result.pidx,
        paymentUrl: result.payment_url,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error initiating Khalti payment";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/payments/khalti/verify ─────────────────────────────────────
router.post("/khalti/verify", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { orderId, pidx } = req.body as {
      orderId?: string;
      pidx?: string;
    };

    if (!orderId || !pidx) {
      return res.status(400).json({ error: "orderId and pidx are required." });
    }

    // Verify with Khalti
    const khaltiRes = await fetch(KHALTI_VERIFY_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    });

    if (!khaltiRes.ok) {
      return res.status(400).json({ error: "Khalti verification failed." });
    }

    const result = (await khaltiRes.json()) as {
      status: string;
      total_amount: number;
      transaction_id: string;
      pidx: string;
    };

    if (result.status !== "Completed") {
      return res.status(400).json({ error: `Payment status: ${result.status}` });
    }

    // Confirm the order
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.userId!, status: "pending" },
      include: { user: { select: { email: true } } },
    });
    if (!order) {
      return res.status(404).json({ error: "Pending order not found." });
    }

    // Verify amount matches (Khalti returns amount in paisa)
    const expectedPaisa = Math.round(order.totalAmount * 100);
    if (result.total_amount !== expectedPaisa) {
      return res.status(400).json({ error: "Payment amount mismatch." });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "confirmed",
        paymentMethod: "khalti",
        paymentRef: result.transaction_id,
      },
    });

    await enqueueEmail({
      type: "order_confirmation",
      to: order.user.email,
      payload: {
        orderId: order.id,
        total: order.totalAmount,
        currency: order.currency,
      },
    });

    return res.json({
      data: {
        orderId: order.id,
        status: "confirmed",
        paymentRef: result.transaction_id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error verifying Khalti payment";
    return res.status(500).json({ error: message });
  }
});

export default router;
