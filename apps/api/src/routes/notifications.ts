import { Router } from "express";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: ReturnType<typeof Router> = Router();

// ─── GET /api/v1/notifications ──────────────────────────────────────────────
router.get("/", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const where = { userId: req.userId! };

    const [total, notifications, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId: req.userId!, isRead: false } }),
    ]);

    return res.json({
      data: {
        items: notifications.map((n: typeof notifications[number]) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching notifications";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/notifications/unread-count ─────────────────────────────────
router.get("/unread-count", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId!, isRead: false },
    });
    return res.json({ data: { count } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching unread count";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/notifications/:id/read ───────────────────────────────────
router.patch("/:id/read", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error marking notification as read";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/notifications/mark-all-read ──────────────────────────────
router.post("/mark-all-read", verifyJwt, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, isRead: false },
      data: { isRead: true },
    });

    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error marking notifications as read";
    return res.status(500).json({ error: message });
  }
});

export default router;
