import { Router } from "express";
import { verifyJwt, requireRole, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { enqueueEmail } from "../jobs/queues";

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

// ─── PATCH /api/v1/admin/brands/:id/verify ──────────────────────────────────
router.patch("/brands/:id/verify", async (req: AuthRequest, res) => {
  try {
    const { isVerified } = req.body as { isVerified?: boolean };

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

    return res.json({
      data: { id: updated.id, name: updated.name, isVerified: updated.isVerified },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error verifying brand";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/admin/returns/:id ────────────────────────────────────────
router.patch("/returns/:id", async (req: AuthRequest, res) => {
  try {
    const { status } = req.body as { status?: string };

    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be 'approved' or 'rejected'." });
    }

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

export default router;
