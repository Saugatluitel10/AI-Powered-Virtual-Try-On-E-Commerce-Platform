import { Router } from "express";
import { verifyJwt, requireRole, type AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { adminUpdateOrderSchema, adminVerifyBrandSchema, adminUpdateReturnSchema, adminUpdateBannerSchema, adminCreatePayoutSchema } from "../schemas";
import { prisma } from "../lib/prisma";
import { enqueueEmail } from "../jobs/queues";
import { createNotification, createNotificationsForBrandMembers } from "../lib/notifications";

const router: ReturnType<typeof Router> = Router();

router.use(verifyJwt, requireRole("ADMIN"));

// ─── GET /api/v1/admin/dashboard ─────────────────────────────────────────────
router.get("/dashboard", async (_req: AuthRequest, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      tryOnSessionsToday,
      tryOnSessionsTotal,
      revenueData,
      purchaseCount,
      cartAddCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count({ where: { status: { notIn: ["cancelled", "refunded"] } } }),
      prisma.tryOnResult.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.tryOnResult.count(),
      prisma.order.aggregate({
        where: { status: { notIn: ["cancelled", "refunded"] } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { status: { notIn: ["cancelled", "refunded", "pending"] } } }),
      prisma.cartItem.count(),
    ]);

    const totalRevenue = revenueData._sum.totalAmount ?? 0;
    const conversionRate = tryOnSessionsTotal > 0
      ? ((purchaseCount / tryOnSessionsTotal) * 100).toFixed(1)
      : "0.0";

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    });

    // Orders per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrderStats = await prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: true,
    });

    return res.json({
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        tryOnSessionsToday,
        tryOnSessionsTotal,
        conversionRate: parseFloat(conversionRate),
        activeCartItems: cartAddCount,
        recentOrders: recentOrders.map((o: typeof recentOrders[number]) => ({
          id: o.id,
          status: o.status,
          totalAmount: o.totalAmount,
          currency: o.currency,
          customerName: o.user.name ?? o.user.email,
          itemCount: o._count.items,
          createdAt: o.createdAt.toISOString(),
        })),
        ordersByStatus: recentOrderStats.map((s: typeof recentOrderStats[number]) => ({
          status: s.status,
          count: s._count,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching dashboard";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/admin/orders/:id/status ───────────────────────────────────
router.patch("/orders/:id/status", validate(adminUpdateOrderSchema), async (req: AuthRequest, res) => {
  try {
    const { status, trackingNumber } = req.body;

    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
      refund_requested: ["refunded"],
      refunded: [],
    };

    const order = await prisma.order.findUnique({
      where: { id: req.params.id as string },
      include: { user: { select: { email: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from "${order.status}" to "${status}". Allowed: ${allowed.join(", ") || "none"}.`,
      });
    }

    const updateData: Record<string, unknown> = { status };
    if (trackingNumber && status === "shipped") {
      updateData.trackingNumber = trackingNumber;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    await enqueueEmail({
      type: "order_status_update",
      to: order.user.email,
      payload: { orderId: order.id, status },
    });

    const statusMessages: Record<string, string> = {
      confirmed: "Your order has been confirmed.",
      processing: "Your order is being processed.",
      shipped: "Your order has been shipped!",
      delivered: "Your order has been delivered.",
      cancelled: "Your order has been cancelled.",
      refunded: "Your refund has been processed.",
    };
    await createNotification(
      order.userId,
      "order_status",
      `Order ${status}`,
      statusMessages[status] ?? `Order status updated to ${status}.`,
      { orderId: order.id, status },
    );

    return res.json({
      data: {
        id: updated.id,
        status: updated.status,
        trackingNumber: updated.trackingNumber,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating order status";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/admin/orders ───────────────────────────────────────────────
router.get("/orders", async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const statusFilter = req.query.status as string | undefined;

    const where = statusFilter ? { status: statusFilter } : {};

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: { product: { select: { name: true, images: true } } },
          },
          _count: { select: { returnRequests: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      data: {
        items: orders.map((o: typeof orders[number]) => ({
          id: o.id,
          status: o.status,
          totalAmount: o.totalAmount,
          currency: o.currency,
          paymentMethod: o.paymentMethod,
          paymentRef: o.paymentRef,
          trackingNumber: o.trackingNumber,
          customerName: o.user.name ?? o.user.email,
          customerEmail: o.user.email,
          itemCount: o.items.length,
          items: o.items.map((i: typeof o.items[number]) => ({
            productName: i.product.name,
            productImage: i.product.images[0] ?? null,
            size: i.size,
            quantity: i.quantity,
            priceAtTime: i.priceAtTime,
          })),
          returnRequestCount: o._count.returnRequests,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        })),
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

// ─── PATCH /api/v1/admin/brands/:id/verify ──────────────────────────────────
router.patch("/brands/:id/verify", validate(adminVerifyBrandSchema), async (req: AuthRequest, res) => {
  try {
    const { isVerified } = req.body;

    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id as string },
    });

    if (!brand) {
      return res.status(404).json({ error: "Brand not found." });
    }

    const updated = await prisma.brand.update({
      where: { id: brand.id },
      data: { isVerified: isVerified ?? true },
    });

    if (updated.isVerified) {
      const members = await prisma.user.findMany({
        where: { brandId: brand.id },
        select: { email: true },
      });
      for (const member of members) {
        await enqueueEmail({
          type: "brand_verified",
          to: member.email,
          payload: { brandName: updated.name },
        });
      }
      await createNotificationsForBrandMembers(
        brand.id,
        "brand_verified",
        "Brand Verified!",
        `Your brand "${updated.name}" has been verified. You now have full seller access.`,
        { brandId: brand.id },
      );
    }

    return res.json({
      data: { id: updated.id, name: updated.name, isVerified: updated.isVerified },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error verifying brand";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/admin/returns/:id ────────────────────────────────────────
router.patch("/returns/:id", validate(adminUpdateReturnSchema), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: req.params.id as string },
      include: {
        order: { select: { id: true } },
        user: { select: { email: true } },
      },
    });

    if (!returnRequest) {
      return res.status(404).json({ error: "Return request not found." });
    }

    const updated = await prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: { status },
    });

    await enqueueEmail({
      type: "return_request_update",
      to: returnRequest.user.email,
      payload: { orderId: returnRequest.order.id, status },
    });

    return res.json({
      data: { id: updated.id, status: updated.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating return request";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/admin/banners ──────────────────────────────────────────────
router.get("/banners", async (req: AuthRequest, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const where = statusFilter ? { status: statusFilter } : {};

    const banners = await prisma.promoBanner.findMany({
      where,
      include: { brand: { select: { name: true, logo: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({
      data: banners.map((b: typeof banners[number]) => ({
        id: b.id,
        title: b.title,
        imageUrl: b.imageUrl,
        linkUrl: b.linkUrl,
        placement: b.placement,
        status: b.status,
        startDate: b.startDate?.toISOString() ?? null,
        endDate: b.endDate?.toISOString() ?? null,
        adminNotes: b.adminNotes,
        brandName: b.brand.name,
        brandLogo: b.brand.logo,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching banners";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/admin/banners/:id ────────────────────────────────────────
router.patch("/banners/:id", validate(adminUpdateBannerSchema), async (req: AuthRequest, res) => {
  try {
    const { status, adminNotes } = req.body;

    const banner = await prisma.promoBanner.findUnique({
      where: { id: req.params.id as string },
      include: { brand: { select: { id: true, name: true } } },
    });

    if (!banner) {
      return res.status(404).json({ error: "Banner not found." });
    }

    const updated = await prisma.promoBanner.update({
      where: { id: banner.id },
      data: {
        ...(status && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
      },
    });

    if (status === "approved" || status === "rejected") {
      await createNotificationsForBrandMembers(
        banner.brand.id,
        "brand_verified",
        `Banner ${status}`,
        `Your promotional banner "${banner.title}" has been ${status}.`,
        { bannerId: banner.id, status },
      );
    }

    return res.json({
      data: { id: updated.id, status: updated.status, adminNotes: updated.adminNotes },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating banner";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/admin/payouts ─────────────────────────────────────────────
router.post("/payouts", validate(adminCreatePayoutSchema), async (req: AuthRequest, res) => {
  try {
    const { brandId, amount, currency, periodStart, periodEnd, reference } = req.body;

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return res.status(404).json({ error: "Brand not found." });
    }

    const payout = await prisma.payout.create({
      data: {
        brandId,
        amount,
        currency: currency ?? "NPR",
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: "paid",
        paidAt: new Date(),
        reference: reference ?? null,
      },
    });

    await createNotificationsForBrandMembers(
      brandId,
      "payout",
      "Payout Processed",
      `A payout of ${currency ?? "NPR"} ${amount.toLocaleString()} has been processed for ${brand.name}.`,
      { payoutId: payout.id, amount },
    );

    return res.status(201).json({ data: payout });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating payout";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/admin/analytics ────────────────────────────────────────────
router.get("/analytics", async (req: AuthRequest, res) => {
  try {
    const daysParam = parseInt(req.query.days as string) || 30;
    const since = new Date();
    since.setDate(since.getDate() - daysParam);

    // ── Funnel analytics ──
    const [
      totalUploads,
      totalBodyScans,
      totalTryOns,
      completedTryOns,
      failedTryOns,
      totalCartAdds,
      totalOrders,
      totalPurchasedOrders,
    ] = await Promise.all([
      prisma.tryOnResult.count({ where: { createdAt: { gte: since } } }),
      prisma.bodyProfile.count(),
      prisma.tryOnResult.count({ where: { createdAt: { gte: since } } }),
      prisma.tryOnResult.count({ where: { status: "completed", createdAt: { gte: since } } }),
      prisma.tryOnResult.count({ where: { status: "failed", createdAt: { gte: since } } }),
      prisma.cartItem.count({ where: { addedAt: { gte: since } } }),
      prisma.order.count({ where: { createdAt: { gte: since } } }),
      prisma.order.count({ where: { createdAt: { gte: since }, status: { notIn: ["cancelled", "refunded"] } } }),
    ]);

    const funnel = {
      uploads: totalUploads,
      bodyScans: totalBodyScans,
      tryOns: totalTryOns,
      completedTryOns,
      failedTryOns,
      cartAdds: totalCartAdds,
      orders: totalOrders,
      purchases: totalPurchasedOrders,
    };

    // ── Try-on conversion by product ──
    const tryOnsByProduct = await prisma.tryOnResult.groupBy({
      by: ["productId"],
      where: { status: "completed", createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: 20,
    });

    const tryOnProductIds = tryOnsByProduct.map((t: typeof tryOnsByProduct[number]) => t.productId);
    const purchasesByProduct = tryOnProductIds.length > 0
      ? await prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: tryOnProductIds },
            order: { createdAt: { gte: since }, status: { notIn: ["cancelled", "refunded"] } },
          },
          _count: true,
        })
      : [];

    const productDetails = tryOnProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: tryOnProductIds } },
          select: { id: true, name: true, category: true },
        })
      : [];

    type ProductInfo = { id: string; name: string; category: string };
    const productMap = new Map(productDetails.map((p: ProductInfo) => [p.id, p]));
    const purchaseMap = new Map(purchasesByProduct.map((p: typeof purchasesByProduct[number]) => [p.productId, p._count]));

    const conversionByProduct = tryOnsByProduct.map((t: typeof tryOnsByProduct[number]) => {
      const product = productMap.get(t.productId);
      const purchases = purchaseMap.get(t.productId) ?? 0;
      return {
        productId: t.productId,
        productName: product?.name ?? "Unknown",
        category: product?.category ?? "Unknown",
        tryOns: t._count,
        purchases,
        conversionRate: t._count > 0 ? parseFloat(((purchases / t._count) * 100).toFixed(1)) : 0,
      };
    });

    // ── Try-on conversion by category ──
    const categoryMap = new Map<string, { tryOns: number; purchases: number }>();
    for (const item of conversionByProduct) {
      const cat = categoryMap.get(item.category) ?? { tryOns: 0, purchases: 0 };
      cat.tryOns += item.tryOns;
      cat.purchases += item.purchases;
      categoryMap.set(item.category, cat);
    }
    const conversionByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      tryOns: data.tryOns,
      purchases: data.purchases,
      conversionRate: data.tryOns > 0 ? parseFloat(((data.purchases / data.tryOns) * 100).toFixed(1)) : 0,
    }));

    // ── Return rate: try-on users vs non-try-on ──
    const usersWithTryOns = await prisma.tryOnResult.findMany({
      where: { status: "completed" },
      select: { userId: true },
      distinct: ["userId"],
    });
    const tryOnUserIds = new Set(usersWithTryOns.map((u: typeof usersWithTryOns[number]) => u.userId));

    const allReturnRequests = await prisma.returnRequest.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
    });
    const allOrdersForReturn = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { notIn: ["cancelled"] } },
      select: { userId: true },
    });

    let tryOnReturns = 0, nonTryOnReturns = 0;
    for (const r of allReturnRequests) {
      if (tryOnUserIds.has(r.userId)) tryOnReturns++;
      else nonTryOnReturns++;
    }
    let tryOnOrders = 0, nonTryOnOrders = 0;
    for (const o of allOrdersForReturn) {
      if (tryOnUserIds.has(o.userId)) tryOnOrders++;
      else nonTryOnOrders++;
    }

    const returnRates = {
      tryOnUsers: {
        orders: tryOnOrders,
        returns: tryOnReturns,
        rate: tryOnOrders > 0 ? parseFloat(((tryOnReturns / tryOnOrders) * 100).toFixed(1)) : 0,
      },
      nonTryOnUsers: {
        orders: nonTryOnOrders,
        returns: nonTryOnReturns,
        rate: nonTryOnOrders > 0 ? parseFloat(((nonTryOnReturns / nonTryOnOrders) * 100).toFixed(1)) : 0,
      },
    };

    // ── Revenue by brand ──
    const orderItemsWithBrand = await prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: since }, status: { notIn: ["cancelled", "refunded"] } } },
      select: {
        priceAtTime: true,
        quantity: true,
        product: { select: { brandId: true, category: true } },
        order: { select: { createdAt: true } },
      },
    });

    const brandRevenue = new Map<string, number>();
    const categoryRevenue = new Map<string, number>();
    const monthlyRevenue = new Map<string, number>();

    for (const oi of orderItemsWithBrand) {
      const lineTotal = oi.priceAtTime * oi.quantity;
      brandRevenue.set(oi.product.brandId, (brandRevenue.get(oi.product.brandId) ?? 0) + lineTotal);
      categoryRevenue.set(oi.product.category, (categoryRevenue.get(oi.product.category) ?? 0) + lineTotal);
      const monthKey = oi.order.createdAt.toISOString().slice(0, 7);
      monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) + lineTotal);
    }

    const brandIds = Array.from(brandRevenue.keys());
    const brands = brandIds.length > 0
      ? await prisma.brand.findMany({
          where: { id: { in: brandIds } },
          select: { id: true, name: true },
        })
      : [];
    const brandNameMap = new Map(brands.map((b: typeof brands[number]) => [b.id, b.name]));

    const revenueByBrand = Array.from(brandRevenue.entries())
      .map(([brandId, revenue]) => ({ brandId, brandName: brandNameMap.get(brandId) ?? "Unknown", revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const revenueByCategory = Array.from(categoryRevenue.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const revenueByMonth = Array.from(monthlyRevenue.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ── AI model accuracy ──
    const [totalRated, positiveRatings, avgProcessingTime, tryOnStats] = await Promise.all([
      prisma.tryOnResult.count({ where: { qualityRating: { not: null } } }),
      prisma.tryOnResult.count({ where: { qualityRating: 1 } }),
      prisma.tryOnResult.aggregate({
        where: { status: "completed", processingTimeMs: { not: null } },
        _avg: { processingTimeMs: true },
      }),
      prisma.tryOnResult.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const s of tryOnStats) {
      statusCounts[s.status] = s._count;
    }
    const totalAttempts = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    const aiModelAccuracy = {
      totalRated,
      positiveRatings,
      satisfactionRate: totalRated > 0 ? parseFloat(((positiveRatings / totalRated) * 100).toFixed(1)) : 0,
      avgProcessingTimeMs: Math.round(avgProcessingTime._avg.processingTimeMs ?? 0),
      successRate: totalAttempts > 0
        ? parseFloat((((statusCounts["completed"] ?? 0) / totalAttempts) * 100).toFixed(1))
        : 0,
      failureRate: totalAttempts > 0
        ? parseFloat((((statusCounts["failed"] ?? 0) / totalAttempts) * 100).toFixed(1))
        : 0,
      totalAttempts,
      statusBreakdown: statusCounts,
    };

    return res.json({
      data: {
        period: { days: daysParam, since: since.toISOString() },
        funnel,
        conversionByProduct,
        conversionByCategory,
        returnRates,
        revenueByBrand,
        revenueByCategory,
        revenueByMonth,
        aiModelAccuracy,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching analytics";
    return res.status(500).json({ error: message });
  }
});

export default router;
