import { Router } from "express";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { enqueueEmail } from "../jobs/queues";
import { createNotification } from "../lib/notifications";

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const router: ReturnType<typeof Router> = Router();

function mapOrderItems(items: Array<{ id: string; productId: string; size: string; quantity: number; priceAtTime: number; product: { name: string; images: string[]; slug: string } }>) {
  return items.map((i) => ({
    id: i.id,
    productId: i.productId,
    productName: i.product.name,
    productImage: i.product.images[0] ?? null,
    productSlug: i.product.slug,
    size: i.size,
    quantity: i.quantity,
    priceAtTime: i.priceAtTime,
  }));
}

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
              product: { select: { name: true, images: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = orders.map((o: typeof orders[number]) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      paymentMethod: o.paymentMethod,
      itemCount: o.items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0),
      items: mapOrderItems(o.items),
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
      where: { id: req.params.id as string, userId: req.userId! },
      include: {
        items: {
          include: {
            product: { select: { name: true, images: true, slug: true } },
          },
        },
        returnRequests: { orderBy: { createdAt: "desc" } },
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
        trackingNumber: order.trackingNumber,
        shippingAddress: order.shippingAddress,
        items: mapOrderItems(order.items),
        returnRequests: order.returnRequests.map((r: { id: string; items: unknown; reason: string; status: string; createdAt: Date }) => ({
          id: r.id,
          items: r.items,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching order";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/orders/:id/invoice ──────────────────────────────────────────
// Returns a simple HTML invoice that can be printed/saved as PDF from the browser
router.get("/:id/invoice", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const addr = (order.shippingAddress ?? {}) as Record<string, string>;
    const fmtCurrency = (amount: number) =>
      order.currency === "NPR" ? `Rs. ${amount.toLocaleString()}` : `${order.currency} ${amount.toFixed(2)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Invoice #${order.id.slice(0, 8).toUpperCase()}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
  th { background: #f9f9f9; font-weight: 600; font-size: 13px; text-transform: uppercase; color: #666; }
  .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #1a1a1a; }
  .address { margin: 16px 0; line-height: 1.6; }
  .footer { margin-top: 48px; font-size: 12px; color: #999; text-align: center; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <h1>VTryon Invoice</h1>
  <p class="meta">Invoice #${order.id.slice(0, 8).toUpperCase()} &middot; ${new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

  <div style="display: flex; justify-content: space-between;">
    <div>
      <strong>Bill To</strong>
      <div class="address">
        ${order.user.name ?? "Customer"}<br>
        ${order.user.email}<br>
        ${addr.street ? `${addr.street}<br>` : ""}
        ${addr.city ? `${addr.city}, ${addr.state ?? ""} ${addr.zip ?? ""}` : ""}
      </div>
    </div>
    <div style="text-align: right;">
      <strong>Payment</strong>
      <div class="address">
        Method: ${order.paymentMethod ?? "N/A"}<br>
        Status: ${order.status}<br>
        ${order.paymentRef ? `Ref: ${order.paymentRef}` : ""}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Item</th><th>Size</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${order.items.map((item: { product: { name: string }; size: string; quantity: number; priceAtTime: number }) => `
        <tr>
          <td>${item.product.name}</td>
          <td>${item.size}</td>
          <td>${item.quantity}</td>
          <td>${fmtCurrency(item.priceAtTime)}</td>
          <td>${fmtCurrency(item.priceAtTime * item.quantity)}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="4">Total</td>
        <td>${fmtCurrency(order.totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  <p class="footer">VTryon &mdash; AI-Powered Virtual Try-On Platform</p>
  <button class="no-print" onclick="window.print()" style="margin-top:16px;padding:8px 24px;cursor:pointer;background:#7c3aed;color:white;border:none;border-radius:6px;font-size:14px;">Download PDF</button>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generating invoice";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/orders ─────────────────────────────────────────────────────
router.post("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { shippingAddress, paymentMethod, discountCode } = req.body as {
      shippingAddress?: Record<string, string>;
      paymentMethod?: string;
      discountCode?: string;
    };

    if (!shippingAddress) {
      return res.status(400).json({ error: "shippingAddress is required." });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: "paymentMethod is required." });
    }

    const VALID_PAYMENT_METHODS = ["esewa", "khalti", "stripe", "cod"];
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: `paymentMethod must be one of: ${VALID_PAYMENT_METHODS.join(", ")}` });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.userId! },
      include: {
        product: { select: { id: true, name: true, price: true, currency: true } },
      },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    let subtotal = 0;
    for (const ci of cartItems) {
      subtotal += ci.product.price * ci.quantity;
    }
    const currency = cartItems[0].product.currency;

    let discountAmount = 0;
    let discountCodeId: string | null = null;

    if (discountCode) {
      const discount = await prisma.discountCode.findUnique({
        where: { code: discountCode.trim().toUpperCase() },
      });

      if (discount && discount.isActive) {
        const notExpired = !discount.expiresAt || discount.expiresAt > new Date();
        const withinLimit = !discount.maxUses || discount.currentUses < discount.maxUses;
        const meetsMinimum = !discount.minOrderAmount || subtotal >= discount.minOrderAmount;

        if (notExpired && withinLimit && meetsMinimum) {
          discountCodeId = discount.id;
          if (discount.discountType === "percentage") {
            discountAmount = (subtotal * discount.discountValue) / 100;
          } else {
            discountAmount = Math.min(discount.discountValue, subtotal);
          }
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);

    const orderItemsData = cartItems.map((ci: typeof cartItems[number]) => ({
      productId: ci.product.id,
      size: ci.size,
      quantity: ci.quantity,
      priceAtTime: ci.product.price,
    }));

    const order = await prisma.$transaction(async (tx: TransactionClient) => {
      for (const ci of cartItems) {
        const variant = await tx.productVariant.findUnique({
          where: { productId_size: { productId: ci.product.id, size: ci.size } },
        });
        if (variant && variant.stock > 0) {
          if (ci.quantity > variant.stock) {
            throw new Error(`Insufficient stock for ${ci.product.name} (${ci.size}). Only ${variant.stock} left.`);
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: ci.quantity } },
          });
        }
      }

      const created = await tx.order.create({
        data: {
          userId: req.userId!,
          status: "pending",
          totalAmount,
          discountAmount,
          currency,
          paymentMethod,
          discountCodeId,
          shippingAddress: shippingAddress as Record<string, string>,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      if (discountCodeId) {
        await tx.discountCode.update({
          where: { id: discountCodeId },
          data: { currentUses: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { userId: req.userId! } });

      return created;
    });

    if (paymentMethod === "cod") {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { email: true },
      });
      if (user) {
        await enqueueEmail({
          type: "order_confirmation",
          to: user.email,
          payload: { orderId: order.id, total: order.totalAmount, currency: order.currency },
        });
      }
    }

    await createNotification(
      req.userId!,
      "order_status",
      "Order Placed",
      `Your order #${order.id.slice(0, 8).toUpperCase()} has been placed.`,
      { orderId: order.id, status: "pending" },
    );

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
      where: { id: req.params.id as string, userId: req.userId! },
      include: { user: { select: { email: true } } },
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

    await enqueueEmail({
      type: "order_status_update",
      to: order.user.email,
      payload: { orderId: order.id, status: "cancelled" },
    });

    return res.json({ data: { id: updated.id, status: updated.status } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error cancelling order";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/orders/:id/return ──────────────────────────────────────────
router.post("/:id/return", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { items, reason } = req.body as {
      items: Array<{ orderItemId: string; quantity: number }>;
      reason: string;
    };

    if (!items?.length) {
      return res.status(400).json({ error: "Select at least one item to return." });
    }
    if (!reason?.trim()) {
      return res.status(400).json({ error: "Reason is required." });
    }

    const order = await prisma.order.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
      include: {
        items: true,
        user: { select: { email: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    if (!["delivered", "confirmed", "shipped"].includes(order.status)) {
      return res.status(400).json({ error: "Returns are only available for delivered/confirmed/shipped orders." });
    }

    const orderItemIds = new Set(order.items.map((i: { id: string }) => i.id));
    for (const item of items) {
      if (!orderItemIds.has(item.orderItemId)) {
        return res.status(400).json({ error: `Item ${item.orderItemId} does not belong to this order.` });
      }
    }

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: req.userId!,
        items: items,
        reason: reason.trim(),
        status: "pending",
      },
    });

    await enqueueEmail({
      type: "return_request_update",
      to: order.user.email,
      payload: { orderId: order.id, status: "submitted" },
    });

    return res.status(201).json({
      data: {
        id: returnRequest.id,
        orderId: returnRequest.orderId,
        items: returnRequest.items,
        reason: returnRequest.reason,
        status: returnRequest.status,
        createdAt: returnRequest.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating return request";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/orders/:id/refund ─────────────────────────────────────────
router.post("/:id/refund", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body as { reason?: string };

    if (!reason?.trim()) {
      return res.status(400).json({ error: "Refund reason is required." });
    }

    const order = await prisma.order.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
      include: { user: { select: { email: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (!["confirmed", "delivered"].includes(order.status)) {
      return res.status(400).json({ error: "Only confirmed or delivered orders can be refunded." });
    }

    if (order.refundAmount) {
      return res.status(400).json({ error: "Refund already initiated for this order." });
    }

    let refundRef = `REF-${order.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

    if (order.paymentMethod === "stripe" && order.paymentRef) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
        const refund = await stripe.refunds.create({
          payment_intent: order.paymentRef,
          amount: Math.round(order.totalAmount * 100),
        });
        refundRef = refund.id;
      } catch (stripeErr) {
        const msg = stripeErr instanceof Error ? stripeErr.message : "Stripe refund failed";
        return res.status(500).json({ error: `Refund failed: ${msg}` });
      }
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "refund_requested",
        refundAmount: order.totalAmount,
        refundRef,
      },
    });

    await enqueueEmail({
      type: "refund_confirmation",
      to: order.user.email,
      payload: {
        orderId: order.id,
        refundAmount: updated.refundAmount,
        currency: order.currency,
        reason: reason.trim(),
      },
    });

    return res.json({
      data: {
        id: updated.id,
        status: updated.status,
        refundAmount: updated.refundAmount,
        refundRef: updated.refundRef,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error initiating refund";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/orders/:id/reorder ────────────────────────────────────────
router.post("/:id/reorder", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
      include: {
        items: {
          include: {
            product: { select: { id: true, isActive: true, price: true } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const activeItems = order.items.filter(
      (i: { product: { isActive: boolean } }) => i.product.isActive
    );

    if (activeItems.length === 0) {
      return res.status(400).json({ error: "No items from this order are currently available." });
    }

    for (const item of activeItems) {
      await prisma.cartItem.upsert({
        where: {
          userId_productId_size: {
            userId: req.userId!,
            productId: item.productId,
            size: item.size,
          },
        },
        update: { quantity: item.quantity },
        create: {
          userId: req.userId!,
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        },
      });
    }

    return res.json({
      data: {
        addedCount: activeItems.length,
        skippedCount: order.items.length - activeItems.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error reordering";
    return res.status(500).json({ error: message });
  }
});

export default router;
