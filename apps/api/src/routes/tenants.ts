import crypto from "crypto";
import { Router } from "express";
import { verifyJwt, requireRole, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { generateApiKey } from "../middleware/apiKeyAuth";
import { stripe } from "../lib/stripe";

const router: ReturnType<typeof Router> = Router();

router.use(verifyJwt);

// ─── POST /api/v1/tenants — create a new SaaS tenant ────────────────────────
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { name, slug } = req.body as { name?: string; slug?: string };
    if (!name || !slug) {
      return res.status(400).json({ error: "name and slug are required." });
    }

    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens." });
    }

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: "Slug already taken." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(401).json({ error: "User not found." });

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { tenantSlug: slug },
    });

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        ownerEmail: user.email,
        stripeCustomerId: customer.id,
      },
    });

    const { raw, hash, prefix } = generateApiKey();
    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        keyHash: hash,
        keyPrefix: prefix,
        label: "Default",
        scopes: ["tryon:read", "tryon:write", "products:read"],
      },
    });

    return res.status(201).json({
      data: {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, tier: tenant.tier },
        apiKey: raw,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating tenant";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/tenants/:slug ──────────────────────────────────────────────
router.get("/:slug", async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug as string },
      select: {
        id: true, name: true, slug: true, tier: true, isActive: true, createdAt: true,
        apiKeys: { select: { id: true, keyPrefix: true, label: true, scopes: true, isActive: true, lastUsedAt: true, createdAt: true } },
      },
    });

    if (!tenant) return res.status(404).json({ error: "Tenant not found." });

    return res.json({ data: tenant });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching tenant";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/tenants/:slug/api-keys — generate a new API key ──────────
router.post("/:slug/api-keys", async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug as string } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });

    const { label, scopes } = req.body as { label?: string; scopes?: string[] };
    const { raw, hash, prefix } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        keyHash: hash,
        keyPrefix: prefix,
        label: label ?? "API Key",
        scopes: scopes ?? ["tryon:read", "tryon:write", "products:read"],
      },
    });

    return res.status(201).json({
      data: {
        id: apiKey.id,
        key: raw,
        prefix: apiKey.keyPrefix,
        label: apiKey.label,
        scopes: apiKey.scopes,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating API key";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/tenants/:slug/api-keys/:keyId — revoke an API key ───────
router.delete("/:slug/api-keys/:keyId", async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug as string } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });

    await prisma.apiKey.update({
      where: { id: req.params.keyId as string },
      data: { isActive: false },
    });

    return res.json({ data: { revoked: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error revoking API key";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/tenants/:slug/usage — usage stats ─────────────────────────
router.get("/:slug/usage", async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug as string } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const logs = await prisma.apiUsageLog.groupBy({
      by: ["endpoint"],
      where: { tenantId: tenant.id, timestamp: { gte: since } },
      _count: true,
      _avg: { latencyMs: true },
    });

    const totalRequests = await prisma.apiUsageLog.count({
      where: { tenantId: tenant.id, timestamp: { gte: since } },
    });

    return res.json({
      data: {
        period: "last_30_days",
        totalRequests,
        tier: tenant.tier,
        endpoints: logs.map((l) => ({
          endpoint: l.endpoint,
          requests: l._count,
          avgLatencyMs: Math.round(l._avg.latencyMs ?? 0),
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching usage";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/tenants/:slug/subscribe — start Stripe subscription ──────
router.post("/:slug/subscribe", async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug as string } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });
    if (!tenant.stripeCustomerId) return res.status(400).json({ error: "No billing account." });

    const { tier } = req.body as { tier?: string };

    const priceMap: Record<string, string> = {
      STARTER: process.env.STRIPE_PRICE_STARTER ?? "",
      GROWTH: process.env.STRIPE_PRICE_GROWTH ?? "",
      ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE ?? "",
    };

    const priceId = priceMap[tier ?? ""];
    if (!priceId) return res.status(400).json({ error: "Invalid tier. Use STARTER, GROWTH, or ENTERPRISE." });

    const session = await stripe.checkout.sessions.create({
      customer: tenant.stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard/billing?success=1`,
      cancel_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard/billing?cancelled=1`,
      metadata: { tenantId: tenant.id, tier: tier ?? "" },
    });

    return res.json({ data: { checkoutUrl: session.url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating subscription";
    return res.status(500).json({ error: message });
  }
});

// ─── PUT /api/v1/tenants/:slug/webhook — register or update webhook URL ────
router.put("/:slug/webhook", async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug as string } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });

    const { url } = req.body as { url?: string | null };

    if (url !== null && url !== undefined) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL." });
      }
      if (!url.startsWith("https://")) {
        return res.status(400).json({ error: "Webhook URL must use HTTPS." });
      }
    }

    const webhookSecret = url
      ? tenant.webhookSecret ?? crypto.randomBytes(32).toString("hex")
      : null;

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { webhookUrl: url ?? null, webhookSecret },
    });

    return res.json({
      data: {
        webhookUrl: url ?? null,
        webhookSecret: url ? webhookSecret : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating webhook";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/tenants/:slug/webhook/logs — recent webhook deliveries ────
router.get("/:slug/webhook/logs", async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug as string } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const [total, logs] = await Promise.all([
      prisma.webhookLog.count({ where: { tenantId: tenant.id } }),
      prisma.webhookLog.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, event: true, statusCode: true, success: true,
          attempt: true, createdAt: true, url: true,
        },
      }),
    ]);

    return res.json({
      data: {
        items: logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching webhook logs";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/tenants/:slug/webhook/test — send a test event ───────────
router.post("/:slug/webhook/test", async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug as string } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });
    if (!tenant.webhookUrl) return res.status(400).json({ error: "No webhook URL configured." });

    const { deliverWebhook } = await import("../lib/webhooks");
    await deliverWebhook(tenant.id, "test.ping", { message: "Webhook test event" });

    return res.json({ data: { sent: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error sending test webhook";
    return res.status(500).json({ error: message });
  }
});

export default router;
