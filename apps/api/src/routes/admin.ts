import { Router } from "express";
import { verifyJwt, requireRole, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

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

export default router;
