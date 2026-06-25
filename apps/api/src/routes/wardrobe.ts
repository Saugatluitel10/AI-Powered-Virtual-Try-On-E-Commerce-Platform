import { Router, type Request } from "express";
import crypto from "crypto";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { getSignedUrl, BUCKETS } from "../lib/supabase";

const router: ReturnType<typeof Router> = Router();

// ─── Helper: resolve signed URL for a try-on result ─────────────────────────
async function resolveResultUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null;
  try {
    return await getSignedUrl(BUCKETS.TRYON_RESULTS, storagePath, 3600);
  } catch {
    return null;
  }
}

// ─── GET /api/v1/wardrobe ───────────────────────────────────────────────────
router.get("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { collectionId, page: pageStr, pageSize: pageSizeStr } = req.query as {
      collectionId?: string;
      page?: string;
      pageSize?: string;
    };

    const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pageSizeStr ?? "20") || 20));

    const where: { userId: string; collectionId?: string | null } = {
      userId: req.userId!,
    };
    if (collectionId) {
      where.collectionId = collectionId;
    }

    const [total, items] = await Promise.all([
      prisma.wardrobeItem.count({ where }),
      prisma.wardrobeItem.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              currency: true,
              images: true,
              category: true,
              garmentType: true,
              brandId: true,
              brand: { select: { name: true } },
              suitableBodyTypes: true,
            },
          },
          collection: { select: { id: true, name: true } },
        },
        orderBy: { savedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = await Promise.all(
      items.map(async (item: typeof items[number]) => {
        let tryOnImageUrl: string | null = null;
        if (item.tryOnResultId) {
          const result = await prisma.tryOnResult.findUnique({
            where: { id: item.tryOnResultId },
            select: { resultImageUrl: true },
          });
          tryOnImageUrl = await resolveResultUrl(result?.resultImageUrl ?? null);
        }

        return {
          id: item.id,
          productId: item.product.id,
          productName: item.product.name,
          productSlug: item.product.slug,
          productImage: item.product.images[0] ?? null,
          price: item.product.price,
          currency: item.product.currency,
          category: item.product.category,
          garmentType: item.product.garmentType,
          brandName: item.product.brand?.name ?? null,
          suitableBodyTypes: item.product.suitableBodyTypes,
          tryOnResultId: item.tryOnResultId,
          tryOnImageUrl,
          collectionId: item.collectionId,
          collectionName: item.collection?.name ?? null,
          savedAt: item.savedAt.toISOString(),
        };
      })
    );

    return res.json({
      data: {
        items: data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching wardrobe";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/wardrobe ──────────────────────────────────────────────────
router.post("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { productId, tryOnResultId, collectionId } = req.body as {
      productId?: string;
      tryOnResultId?: string;
      collectionId?: string;
    };

    if (!productId) {
      return res.status(400).json({ error: "productId is required." });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Check for duplicate
    const existing = await prisma.wardrobeItem.findFirst({
      where: {
        userId: req.userId!,
        productId,
        tryOnResultId: tryOnResultId ?? null,
      },
    });
    if (existing) {
      return res.json({ data: { id: existing.id, message: "Already in wardrobe." } });
    }

    if (collectionId) {
      const collection = await prisma.wardrobeCollection.findFirst({
        where: { id: collectionId, userId: req.userId! },
      });
      if (!collection) {
        return res.status(404).json({ error: "Collection not found." });
      }
    }

    const item = await prisma.wardrobeItem.create({
      data: {
        userId: req.userId!,
        productId,
        tryOnResultId: tryOnResultId ?? null,
        collectionId: collectionId ?? null,
      },
    });

    return res.status(201).json({
      data: {
        id: item.id,
        productId: item.productId,
        tryOnResultId: item.tryOnResultId,
        collectionId: item.collectionId,
        savedAt: item.savedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error saving to wardrobe";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/wardrobe/:id ─────────────────────────────────────────────
router.delete("/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const item = await prisma.wardrobeItem.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!item) {
      return res.status(404).json({ error: "Wardrobe item not found." });
    }

    await prisma.wardrobeItem.delete({ where: { id: item.id } });
    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error removing from wardrobe";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/wardrobe/:id/move ────────────────────────────────────────
router.patch("/:id/move", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { collectionId } = req.body as { collectionId: string | null };

    const item = await prisma.wardrobeItem.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!item) {
      return res.status(404).json({ error: "Wardrobe item not found." });
    }

    if (collectionId) {
      const collection = await prisma.wardrobeCollection.findFirst({
        where: { id: collectionId, userId: req.userId! },
      });
      if (!collection) {
        return res.status(404).json({ error: "Collection not found." });
      }
    }

    const updated = await prisma.wardrobeItem.update({
      where: { id: item.id },
      data: { collectionId: collectionId ?? null },
    });

    return res.json({
      data: { id: updated.id, collectionId: updated.collectionId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error moving item";
    return res.status(500).json({ error: message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Collections
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/v1/wardrobe/collections ────────────────────────────────────────
router.get("/collections", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const collections = await prisma.wardrobeCollection.findMany({
      where: { userId: req.userId! },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      data: collections.map((c: typeof collections[number]) => ({
        id: c.id,
        name: c.name,
        isPublic: c.isPublic,
        shareToken: c.shareToken,
        itemCount: c._count.items,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching collections";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/wardrobe/collections ───────────────────────────────────────
router.post("/collections", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Collection name is required." });
    }

    const collection = await prisma.wardrobeCollection.create({
      data: {
        userId: req.userId!,
        name: name.trim(),
      },
    });

    return res.status(201).json({
      data: {
        id: collection.id,
        name: collection.name,
        isPublic: collection.isPublic,
        shareToken: collection.shareToken,
        itemCount: 0,
        createdAt: collection.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating collection";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/wardrobe/collections/:id ─────────────────────────────────
router.delete("/collections/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const collection = await prisma.wardrobeCollection.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!collection) {
      return res.status(404).json({ error: "Collection not found." });
    }

    // Unlink items from the collection, then delete
    await prisma.wardrobeItem.updateMany({
      where: { collectionId: collection.id },
      data: { collectionId: null },
    });
    await prisma.wardrobeCollection.delete({ where: { id: collection.id } });

    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error deleting collection";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/wardrobe/collections/:id/share ────────────────────────────
router.post("/collections/:id/share", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const collection = await prisma.wardrobeCollection.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!collection) {
      return res.status(404).json({ error: "Collection not found." });
    }

    const shareToken = collection.shareToken ?? crypto.randomBytes(16).toString("hex");

    const updated = await prisma.wardrobeCollection.update({
      where: { id: collection.id },
      data: { shareToken, isPublic: true },
    });

    return res.json({
      data: {
        shareToken: updated.shareToken,
        shareUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/wardrobe/shared/${updated.shareToken}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error sharing collection";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/wardrobe/shared/:token (public) ────────────────────────────
router.get("/shared/:token", async (req: Request, res) => {
  try {
    const collection = await prisma.wardrobeCollection.findUnique({
      where: { shareToken: req.params.token as string },
      include: {
        user: { select: { name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                currency: true,
                images: true,
                category: true,
                brand: { select: { name: true } },
              },
            },
          },
          orderBy: { savedAt: "desc" },
        },
      },
    });

    if (!collection || !collection.isPublic) {
      return res.status(404).json({ error: "Collection not found or is private." });
    }

    const items = await Promise.all(
      collection.items.map(async (item: typeof collection.items[number]) => {
        let tryOnImageUrl: string | null = null;
        if (item.tryOnResultId) {
          const result = await prisma.tryOnResult.findUnique({
            where: { id: item.tryOnResultId },
            select: { resultImageUrl: true },
          });
          tryOnImageUrl = await resolveResultUrl(result?.resultImageUrl ?? null);
        }

        return {
          id: item.id,
          productId: item.product.id,
          productName: item.product.name,
          productSlug: item.product.slug,
          productImage: item.product.images[0] ?? null,
          price: item.product.price,
          currency: item.product.currency,
          category: item.product.category,
          brandName: item.product.brand?.name ?? null,
          tryOnImageUrl,
          savedAt: item.savedAt.toISOString(),
        };
      })
    );

    return res.json({
      data: {
        collectionName: collection.name,
        userName: collection.user.name ?? "Anonymous",
        items,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching shared collection";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/wardrobe/:id/complete-the-look ─────────────────────────────
router.get("/:id/complete-the-look", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const item = await prisma.wardrobeItem.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
      include: {
        product: {
          select: {
            category: true,
            garmentType: true,
            gender: true,
            suitableBodyTypes: true,
            brandId: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Wardrobe item not found." });
    }

    // Determine complementary categories
    const complementMap: Record<string, string[]> = {
      tops: ["bottoms", "accessories", "outerwear"],
      bottoms: ["tops", "accessories", "outerwear"],
      dresses: ["accessories", "outerwear"],
      sets: ["accessories"],
      outerwear: ["tops", "bottoms", "accessories"],
      accessories: ["tops", "dresses", "bottoms"],
    };

    const category = item.product.category;
    const complementaryCategories = complementMap[category] ?? ["tops", "bottoms", "accessories"];

    const suggestions = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: item.productId },
        category: { in: complementaryCategories },
        gender: item.product.gender === "unisex" ? undefined : { in: [item.product.gender ?? "unisex", "unisex"] },
        suitableBodyTypes: item.product.suitableBodyTypes.length > 0
          ? { hasSome: item.product.suitableBodyTypes }
          : undefined,
      },
      include: { brand: { select: { name: true } } },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      data: suggestions.map((p: typeof suggestions[number]) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        currency: p.currency,
        primaryImageUrl: p.images[0] ?? null,
        category: p.category,
        brandName: p.brand?.name ?? null,
        suitableBodyTypes: p.suitableBodyTypes,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching suggestions";
    return res.status(500).json({ error: message });
  }
});

export default router;
