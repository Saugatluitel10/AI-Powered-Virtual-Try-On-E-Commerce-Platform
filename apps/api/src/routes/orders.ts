import { Router } from "express";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { enqueueEmail } from "../jobs/queues";

const router = Router();

// ─── GET /api/v1/orders ──────────────────────────────────────────────────────
router.get("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const [total, orders] = await Promise.all([
      prisma.order.count({ where: { userId: req.userId! } }),
      prisma.order.findMany({
        where: { userId: req.userId! },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      paymentMethod: o.paymentMethod,
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        productImage: i.product.images[0] ?? null,
        productSlug: i.product.slug,
        size: i.size,
        quantity: i.quantity,
        priceAtTime: i.priceAtTime,
      })),
      createdAt: o.createdAt.toISOString(),
    }));

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
    const message = err instanceof Error ? err.message : "Error fetching orders";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/orders/:id ──────────────────────────────────────────────────
router.get("/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, images: true, slug: true },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    return res.json({
      data: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        paymentRef: order.paymentRef,
        shippingAddress: order.shippingAddress,
        items: order.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.product.name,
          productImage: i.product.images[0] ?? null,
          productSlug: i.product.slug,
          size: i.size,
          quantity: i.quantity,
          priceAtTime: i.priceAtTime,
        })),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching order";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/orders ─────────────────────────────────────────────────────
// Creates a pending order from the user's cart
router.post("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body as {
      shippingAddress?: Record<string, string>;
      paymentMethod?: string;
    };

    if (!shippingAddress) {
      return res.status(400).json({ error: "shippingAddress is required." });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: "paymentMethod is required." });
    }

    // Fetch cart
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.userId! },
      include: {
        product: { select: { id: true, name: true, price: true, currency: true } },
      },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    const totalAmount = cartItems.reduce(
      (sum, ci) => sum + ci.product.price * ci.quantity,
      0
    );
    const currency = cartItems[0].product.currency;

    // Create order + items in a transaction, then clear cart
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.userId!,
          status: "pending",
          totalAmount,
          currency,
          paymentMethod,
          shippingAddress: shippingAddress as Record<string, string>,
          items: {
            create: cartItems.map((ci) => ({
              productId: ci.product.id,
              size: ci.size,
              quantity: ci.quantity,
              priceAtTime: ci.product.price,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { userId: req.userId! } });

      return created;
    });

    return res.status(201).json({
      data: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        itemCount: order.items.length,
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating order";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/orders/:id/cancel ─────────────────────────────────────────
router.patch("/:id/cancel", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    if (!["pending"].includes(order.status)) {
      return res.status(400).json({ error: "Only pending orders can be cancelled." });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });

    return res.json({ data: { id: updated.id, status: updated.status } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error cancelling order";
    return res.status(500).json({ error: message });
  }
});

export default router;
