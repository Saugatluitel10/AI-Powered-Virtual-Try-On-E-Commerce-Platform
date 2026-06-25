import { Router } from "express";
import { supabase } from "../lib/supabase";
import { prisma } from "../lib/prisma";
import { verifyJwt, type AuthRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/auth/sync-user
// Called by the frontend after a successful Supabase signUp to create the local DB record.
router.post("/sync-user", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    const supabaseUser = data.user!;

    const { name } = req.body as { name?: string };

    const user = await prisma.user.upsert({
      where: { supabaseId: supabaseUser.id },
      update: {},
      create: {
        email: supabaseUser.email!,
        name: name ?? supabaseUser.user_metadata?.name ?? null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
        supabaseId: supabaseUser.id,
      },
    });

    res.json({ data: user });
  } catch (err) {
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// GET /api/v1/auth/me
router.get("/me", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { bodyProfile: true, styleProfile: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ data: user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
