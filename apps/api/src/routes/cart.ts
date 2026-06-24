import { Router } from "express";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── GET /api/v1/cart ────────────────────────────────────────────────────────
router.get("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.cartItem.findMany({
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
      orderBy: { addedAt: "desc" },
    });

    const cartItems = items.map((ci: typeof items[number]) => ({
      id: ci.id,
      productId: ci.product.id,
      productName: ci.product.name,
      productSlug: ci.product.slug,
      productImage: ci.product.images[0] ?? null,
      brandName: ci.product.brand?.name ?? null,
      size: ci.size,
      quantity: ci.quantity,
      unitPrice: ci.product.price,
      currency: ci.product.currency,
      addedAt: ci.addedAt.toISOString(),
    }));

    const subtotal = cartItems.reduce((sum: number, i: typeof cartItems[number]) => sum + i.unitPrice * i.quantity, 0);

    return res.json({
      data: {
        items: cartItems,
        subtotal,
        itemCount: cartItems.reduce((sum: number, i: typeof cartItems[number]) => sum + i.quantity, 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching cart";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/cart ───────────────────────────────────────────────────────
router.post("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { productId, size, quantity = 1 } = req.body as {
      productId?: string;
      size?: string;
      quantity?: number;
    };

    if (!productId || !size) {
      return res.status(400).json({ error: "productId and size are required." });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { id: true, sizes: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (!product.sizes.includes(size)) {
      return res.status(400).json({ error: `Size "${size}" is not available for this product.` });
    }

    const item = await prisma.cartItem.upsert({
      where: {
        userId_productId_size: {
          userId: req.userId!,
          productId,
          size,
        },
      },
      update: { quantity: { increment: quantity } },
      create: {
        userId: req.userId!,
        productId,
        size,
        quantity,
      },
    });

    return res.status(201).json({ data: { id: item.id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error adding to cart";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/cart/:id ──────────────────────────────────────────────────
router.patch("/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { quantity } = req.body as { quantity?: number };
    if (quantity === undefined || quantity < 1) {
      return res.status(400).json({ error: "quantity must be >= 1." });
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!item) {
      return res.status(404).json({ error: "Cart item not found." });
    }

    const updated = await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return res.json({ data: { id: updated.id, quantity: updated.quantity } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating cart";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/cart/:id ─────────────────────────────────────────────────
router.delete("/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!item) {
      return res.status(404).json({ error: "Cart item not found." });
    }

    await prisma.cartItem.delete({ where: { id: item.id } });
    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error removing from cart";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/cart (clear all) ─────────────────────────────────────────
router.delete("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.userId! } });
    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error clearing cart";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/cart/sync ──────────────────────────────────────────────────
// Merge local (localStorage) cart items into the DB on login
router.post("/sync", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { items } = req.body as {
      items?: Array<{ productId: string; size: string; quantity: number }>;
    };

    if (!items || items.length === 0) {
      return res.json({ data: { synced: 0 } });
    }

    let synced = 0;
    for (const { productId, size, quantity } of items) {
      if (!productId || !size || quantity < 1) continue;

      const product = await prisma.product.findUnique({
        where: { id: productId, isActive: true },
        select: { id: true, sizes: true },
      });
      if (!product || !product.sizes.includes(size)) continue;

      await prisma.cartItem.upsert({
        where: {
          userId_productId_size: {
            userId: req.userId!,
            productId,
            size,
          },
        },
        update: { quantity: { increment: quantity } },
        create: {
          userId: req.userId!,
          productId,
          size,
          quantity,
        },
      });
      synced++;
    }

    return res.json({ data: { synced } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error syncing cart";
    return res.status(500).json({ error: message });
  }
});

export default router;
