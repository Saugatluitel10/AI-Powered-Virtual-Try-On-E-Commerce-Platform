import { Router, type Request, type Response } from "express";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { enqueueEmail } from "../jobs/queues";

const router: ReturnType<typeof Router> = Router();

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

router.post("/", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      WEBHOOK_SECRET,
    );
  } catch {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        if (!orderId) break;

        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { user: { select: { email: true } } },
        });

        if (!order || order.status !== "pending") break;

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "confirmed",
            paymentMethod: "stripe",
            paymentRef: pi.id,
          },
        });

        await Promise.all([
          enqueueEmail({
            type: "order_confirmation",
            to: order.user.email,
            payload: { orderId: order.id, total: order.totalAmount, currency: order.currency },
          }),
          enqueueEmail({
            type: "order_receipt",
            to: order.user.email,
            payload: {
              orderId: order.id,
              total: order.totalAmount,
              currency: order.currency,
              paymentMethod: "stripe",
              paymentRef: pi.id,
              invoiceUrl: `${FRONTEND_URL}/api/v1/orders/${order.id}/invoice`,
            },
          }),
        ]);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const pi = charge.payment_intent;
        if (!pi || typeof pi !== "string") break;

        const order = await prisma.order.findFirst({
          where: { paymentRef: pi, status: "refund_requested" },
        });
        if (!order) break;

        await prisma.order.update({
          where: { id: order.id },
          data: { status: "refunded" },
        });
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error:", err);
  }

  return res.json({ received: true });
});

export default router;
