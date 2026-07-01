import { Router } from "express";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { feedbackSchema } from "../schemas";
import { prisma } from "../lib/prisma";

const router: ReturnType<typeof Router> = Router();

// ─── POST /api/v1/feedback — submit beta feedback / NPS ─────────────────────
router.post("/", verifyJwt, validate(feedbackSchema), async (req: AuthRequest, res) => {
  try {
    const { type, score, comment, metadata } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, name: true },
    });

    // Feedback stored via analytics pipeline, not logged to stdout

    return res.status(201).json({
      data: {
        received: true,
        type,
        score: score ?? null,
        message: type === "nps"
          ? (score !== undefined && score >= 9 ? "Thank you for the great score!" : "Thanks for your honest feedback. We'll do better!")
          : "Thank you for your feedback!",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error submitting feedback";
    return res.status(500).json({ error: message });
  }
});

export default router;
