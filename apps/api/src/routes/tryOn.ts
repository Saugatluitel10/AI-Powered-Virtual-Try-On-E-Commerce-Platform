import { Router } from "express";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { getSignedUrl, BUCKETS } from "../lib/supabase";
import { enqueueTryOn } from "../jobs/queues";

const router = Router();

// ─── POST /api/v1/try-on ────────────────────────────────────────────────────
// Submit a new try-on job.
// Body: { productId: string }
// The user must already have a body photo uploaded (BodyProfile.photoUrl).
router.post("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { productId } = req.body as { productId?: string };
    if (!productId) {
      return res.status(400).json({ error: "productId is required." });
    }

    // Fetch user's photo
    const bodyProfile = await prisma.bodyProfile.findUnique({
      where: { userId: req.userId! },
      select: { photoUrl: true },
    });
    if (!bodyProfile?.photoUrl) {
      return res.status(400).json({
        error: "No body photo found. Please upload a photo first.",
      });
    }

    // Fetch product + garment image
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, images: true, isTryonEnabled: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (!product.isTryonEnabled) {
      return res.status(400).json({ error: "Virtual try-on is not available for this product." });
    }
    if (product.images.length === 0) {
      return res.status(400).json({ error: "Product has no images." });
    }

    // Build signed URLs
    const userPhotoUrl = await getSignedUrl(
      BUCKETS.USER_PHOTOS,
      bodyProfile.photoUrl,
      600
    );

    // Try to get a pre-segmented garment; fall back to the product's primary image
    let garmentImageUrl: string;
    try {
      garmentImageUrl = await getSignedUrl(
        BUCKETS.GARMENT_SEGMENTS,
        `${productId}.png`,
        600
      );
    } catch {
      // No pre-segmented garment — use the product's primary image directly
      garmentImageUrl = product.images[0];
    }

    // Create TryOnResult record
    const result = await prisma.tryOnResult.create({
      data: {
        userId: req.userId!,
        productId,
        userPhotoUrl: bodyProfile.photoUrl,
        garmentImageUrl,
        status: "queued",
      },
    });

    // Enqueue the job
    await enqueueTryOn({
      resultId: result.id,
      userId: req.userId!,
      productId,
      userPhotoUrl,
      garmentImageUrl,
      productName: product.name,
    });

    return res.json({
      data: {
        id: result.id,
        status: result.status,
        productId,
        createdAt: result.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create try-on job";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/try-on/history ─────────────────────────────────────────────
// Returns the authenticated user's try-on history, newest first.
router.get("/history", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const [total, results] = await Promise.all([
      prisma.tryOnResult.count({ where: { userId: req.userId! } }),
      prisma.tryOnResult.findMany({
        where: { userId: req.userId! },
        include: {
          product: { select: { id: true, name: true, slug: true, images: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = await Promise.all(
      results.map(async (r) => {
        let resultImageUrl: string | null = null;
        if (r.resultImageUrl) {
          try {
            resultImageUrl = await getSignedUrl(
              BUCKETS.TRYON_RESULTS,
              r.resultImageUrl,
              3600
            );
          } catch {
            // Signed URL generation failed — leave as null
          }
        }

        return {
          id: r.id,
          productId: r.productId,
          productName: r.product.name,
          productSlug: r.product.slug,
          productImage: r.product.images[0] ?? null,
          status: r.status,
          resultImageUrl,
          sizeRecommended: r.sizeRecommended,
          processingTimeMs: r.processingTimeMs,
          errorMessage: r.errorMessage,
          createdAt: r.createdAt.toISOString(),
        };
      })
    );

    return res.json({
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch history";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/try-on/:id ────────────────────────────────────────────────
// Poll status of a specific try-on result.
router.get("/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.tryOnResult.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: {
        product: { select: { id: true, name: true, slug: true, images: true } },
      },
    });

    if (!result) {
      return res.status(404).json({ error: "Try-on result not found." });
    }

    let resultImageUrl: string | null = null;
    if (result.resultImageUrl) {
      try {
        resultImageUrl = await getSignedUrl(
          BUCKETS.TRYON_RESULTS,
          result.resultImageUrl,
          3600
        );
      } catch {
        // leave null
      }
    }

    return res.json({
      data: {
        id: result.id,
        productId: result.productId,
        productName: result.product.name,
        productSlug: result.product.slug,
        productImage: result.product.images[0] ?? null,
        status: result.status,
        resultImageUrl,
        sizeRecommended: result.sizeRecommended,
        processingTimeMs: result.processingTimeMs,
        errorMessage: result.errorMessage,
        createdAt: result.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch try-on result";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/try-on/body-scan (legacy placeholder) ────────────────────
router.post("/body-scan", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "POST /try-on/body-scan" });
});

export default router;
