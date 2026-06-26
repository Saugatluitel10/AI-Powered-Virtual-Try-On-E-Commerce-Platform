import { Router, type Request, type Response } from "express";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";

const router: ReturnType<typeof Router> = Router();

const SAAS_WEBHOOK_SECRET = process.env.STRIPE_SAAS_WEBHOOK_SECRET ?? "";

const TIER_MAP: Record<string, "STARTER" | "GROWTH" | "ENTERPRISE"> = {};
if (process.env.STRIPE_PRICE_STARTER) TIER_MAP[process.env.STRIPE_PRICE_STARTER] = "STARTER";
if (process.env.STRIPE_PRICE_GROWTH) TIER_MAP[process.env.STRIPE_PRICE_GROWTH] = "GROWTH";
if (process.env.STRIPE_PRICE_ENTERPRISE) TIER_MAP[process.env.STRIPE_PRICE_ENTERPRISE] = "ENTERPRISE";

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
      SAAS_WEBHOOK_SECRET,
    );
  } catch {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const tenantId = session.metadata?.tenantId;
        const tier = session.metadata?.tier as keyof typeof TIER_MAP | undefined;
        if (tenantId && tier) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              tier: (tier as "STARTER" | "GROWTH" | "ENTERPRISE") ?? "STARTER",
              subscriptionId: session.subscription as string,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer as string;
        const priceId = sub.items.data[0]?.price.id;
        const newTier = TIER_MAP[priceId ?? ""] ?? "STARTER";

        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { tier: newTier, subscriptionId: sub.id },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { tier: "FREE", subscriptionId: null },
        });
        break;
      }
    }
  } catch (err) {
    console.error("[SaaS Webhook] Error:", err);
  }

  return res.json({ received: true });
});

export default router;
