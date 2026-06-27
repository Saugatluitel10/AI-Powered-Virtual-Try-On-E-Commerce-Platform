import { Router } from "express";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: ReturnType<typeof Router> = Router();

// ─── GET /api/v1/wishlist ──────────────────────────────────────────────────
router.get("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.userId! },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            currency: true,
            images: true,
            brand: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      data: items.map((item: typeof items[number]) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        productSlug: item.product.slug,
        price: item.product.price,
        currency: item.product.currency,
        image: item.product.images[0] ?? null,
        brandName: item.product.brand?.name ?? null,
        addedAt: item.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching wishlist";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/wishlist ─────────────────────────────────────────────────
router.post("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { productId } = req.body as { productId?: string };

    if (!productId) {
      return res.status(400).json({ error: "productId is required." });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const item = await prisma.wishlistItem.upsert({
      where: {
        userId_productId: { userId: req.userId!, productId },
      },
      update: {},
      create: { userId: req.userId!, productId },
    });

    return res.status(201).json({ data: { id: item.id, productId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error adding to wishlist";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/wishlist/:productId ────────────────────────────────────
router.delete("/:productId", verifyJwt, async (req: AuthRequest, res) => {
  try {
    await prisma.wishlistItem.deleteMany({
      where: {
        userId: req.userId!,
        productId: req.params.productId as string,
      },
    });

    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error removing from wishlist";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/wishlist/check/:productId ─────────────────────────────────
router.get("/check/:productId", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const item = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: req.userId!,
          productId: req.params.productId as string,
        },
      },
    });

    return res.json({ data: { wishlisted: !!item } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error checking wishlist";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/wishlist/share ───────────────────────────────────────────
router.post("/share", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.userId! },
      select: { productId: true },
    });

    const productIds = items.map((i: typeof items[number]) => i.productId);
    const encoded = Buffer.from(JSON.stringify(productIds)).toString("base64url");
    const shareUrl = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/wishlist/shared?ids=${encoded}`;

    return res.json({ data: { shareUrl } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generating share link";
    return res.status(500).json({ error: message });
  }
});

export default router;
