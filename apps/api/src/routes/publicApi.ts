import { Router } from "express";
import { verifyApiKey, requireScope, type ApiKeyRequest } from "../middleware/apiKeyAuth";
import { tenantRateLimit } from "../middleware/tenantRateLimiter";
import { logApiUsage } from "../middleware/usageLogger";
import { validate } from "../middleware/validate";
import { publicTryOnSchema, sizeRecommendationSchema } from "../schemas";
import { prisma } from "../lib/prisma";

const router: ReturnType<typeof Router> = Router();

router.use(verifyApiKey, tenantRateLimit, logApiUsage);

// ─── GET /api/v1/public/products — list products ───────────────────────────
router.get("/products", requireScope("products:read"), async (req: ApiKeyRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const category = req.query.category as string | undefined;
    const gender = req.query.gender as string | undefined;
    const tryonOnly = req.query.tryonOnly === "true";

    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;
    if (gender) where.gender = gender;
    if (tryonOnly) where.isTryonEnabled = true;

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true, name: true, slug: true, price: true, currency: true,
          sizes: true, category: true, garmentType: true, gender: true,
          images: true, isTryonEnabled: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      data: {
        items: products,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching products";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/public/products/:id ────────────────────────────────────────
router.get("/products/:id", requireScope("products:read"), async (req: ApiKeyRequest, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string, isActive: true },
      select: {
        id: true, name: true, slug: true, description: true, price: true,
        currency: true, sizes: true, category: true, garmentType: true,
        gender: true, images: true, isTryonEnabled: true, suitableBodyTypes: true,
      },
    });

    if (!product) return res.status(404).json({ error: "Product not found." });

    return res.json({ data: product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching product";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/public/tryon — submit a try-on job ────────────────────────
router.post("/tryon", requireScope("tryon:write"), validate(publicTryOnSchema), async (req: ApiKeyRequest, res) => {
  try {
    const { productId, userPhotoUrl } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true, isTryonEnabled: true },
      select: { id: true, images: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found or try-on not enabled." });
    }

    const tryOnResult = await prisma.tryOnResult.create({
      data: {
        userId: "api",
        productId: product.id,
        userPhotoUrl,
        garmentImageUrl: product.images[0] ?? "",
        status: "pending",
      },
    });

    return res.status(202).json({
      data: {
        jobId: tryOnResult.id,
        status: "pending",
        pollUrl: `/api/v1/public/tryon/${tryOnResult.id}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating try-on job";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/public/tryon/:jobId — poll try-on status ──────────────────
router.get("/tryon/:jobId", requireScope("tryon:read"), async (req: ApiKeyRequest, res) => {
  try {
    const result = await prisma.tryOnResult.findUnique({
      where: { id: req.params.jobId as string },
      select: {
        id: true, status: true, resultImageUrl: true,
        sizeRecommended: true, processingTimeMs: true,
        errorMessage: true, createdAt: true,
      },
    });

    if (!result) return res.status(404).json({ error: "Try-on job not found." });

    return res.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching try-on status";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/public/size-recommendation ────────────────────────────────
router.post("/size-recommendation", requireScope("products:read"), validate(sizeRecommendationSchema), async (req: ApiKeyRequest, res) => {
  try {
    const { productId, bust, waist, hips } = req.body;

    const { recommendSize } = await import("../lib/sizeRecommender");

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Product not found." });

    const tempUserId = `api-temp-${Date.now()}`;
    await prisma.bodyProfile.create({
      data: { userId: tempUserId, bust: bust ?? null, waist: waist ?? null, hips: hips ?? null },
    }).catch(() => null);

    const recommendation = await recommendSize(tempUserId, productId);

    prisma.bodyProfile.delete({ where: { userId: tempUserId } }).catch(() => {});

    if (!recommendation) {
      return res.json({ data: { size: null, confidence: 0, reasoning: "Could not determine size." } });
    }

    return res.json({ data: recommendation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error getting size recommendation";
    return res.status(500).json({ error: message });
  }
});

export default router;
