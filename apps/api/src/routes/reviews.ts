import { Router } from "express";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createReviewSchema } from "../schemas";
import { prisma } from "../lib/prisma";

const router: ReturnType<typeof Router> = Router();

// ─── GET /api/v1/reviews/product/:productId ─────────────────────────────────
router.get("/product/:productId", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));

    const where = { productId: req.params.productId as string };

    const [total, reviews, aggregate] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: {
          user: { select: { name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return res.json({
      data: {
        items: reviews.map((r: typeof reviews[number]) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          reply: r.reply,
          repliedAt: r.repliedAt?.toISOString() ?? null,
          userName: r.user.name ?? "Anonymous",
          userAvatar: r.user.avatarUrl,
          createdAt: r.createdAt.toISOString(),
        })),
        averageRating: aggregate._avg.rating ?? 0,
        totalReviews: aggregate._count,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching reviews";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/reviews ───────────────────────────────────────────────────
router.post("/", verifyJwt, validate(createReviewSchema), async (req: AuthRequest, res) => {
  try {
    const { productId, orderId, rating, title, comment } = req.body;

    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId: req.userId!,
          status: { in: ["delivered", "confirmed", "shipped"] },
          items: { some: { productId } },
        },
      });

      if (!order) {
        return res.status(400).json({ error: "You can only review products from your delivered orders." });
      }
    }

    const review = await prisma.review.upsert({
      where: {
        userId_productId_orderId: {
          userId: req.userId!,
          productId,
          orderId: orderId ?? "",
        },
      },
      update: {
        rating,
        title: title?.trim() ?? null,
        comment: comment?.trim() ?? null,
      },
      create: {
        userId: req.userId!,
        productId,
        orderId: orderId ?? null,
        rating,
        title: title?.trim() ?? null,
        comment: comment?.trim() ?? null,
      },
    });

    return res.status(201).json({
      data: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error submitting review";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/reviews/:id ─────────────────────────────────────────────
router.delete("/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const review = await prisma.review.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found." });
    }

    await prisma.review.delete({ where: { id: review.id } });
    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error deleting review";
    return res.status(500).json({ error: message });
  }
});

export default router;
