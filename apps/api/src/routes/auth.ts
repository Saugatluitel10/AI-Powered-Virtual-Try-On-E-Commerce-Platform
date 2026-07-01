import { Router } from "express";
import { supabase } from "../lib/supabase";
import { prisma } from "../lib/prisma";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  socialAuthSchema,
  syncUserSchema,
  registerBrandSchema,
} from "../schemas";

const router: ReturnType<typeof Router> = Router();

// ─── POST /api/v1/auth/signup ────────────────────────────────────────────────
router.post("/signup", validate(signupSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name ?? null } },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.user) {
      return res.status(500).json({ error: "Signup failed." });
    }

    const user = await prisma.user.upsert({
      where: { supabaseId: data.user.id },
      update: {},
      create: {
        email: data.user.email!,
        name: name ?? null,
        supabaseId: data.user.id,
      },
    });

    return res.status(201).json({
      data: {
        user,
        session: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresAt: data.session.expires_at,
            }
          : null,
        confirmationRequired: !data.session,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/auth/login ─────────────────────────────────────────────────
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: data.user.id },
      include: { bodyProfile: true, styleProfile: true },
    });

    return res.json({
      data: {
        user,
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/auth/refresh ───────────────────────────────────────────────
router.post("/refresh", validate(refreshSchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return res.status(401).json({ error: error?.message ?? "Token refresh failed" });
    }

    return res.json({
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token refresh failed";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/auth/logout ────────────────────────────────────────────────
router.post("/logout", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.slice(7);
    await supabase.auth.admin.signOut(token);
    return res.json({ data: { loggedOut: true } });
  } catch {
    return res.json({ data: { loggedOut: true } });
  }
});

// ─── POST /api/v1/auth/forgot-password ───────────────────────────────────────
router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const redirectTo = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data: { sent: true, message: "Password reset email sent." } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reset email";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/auth/reset-password ────────────────────────────────────────
router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  try {
    const { accessToken, newPassword } = req.body;

    const { error } = await supabase.auth.admin.updateUserById(
      (await supabase.auth.getUser(accessToken)).data.user?.id ?? "",
      { password: newPassword }
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data: { reset: true, message: "Password updated successfully." } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Password reset failed";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/auth/verify-email ──────────────────────────────────────────
router.post("/verify-email", validate(verifyEmailSchema), async (req, res) => {
  try {
    const { token, type } = req.body;

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: (type as "signup" | "email") ?? "signup",
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      data: {
        verified: true,
        session: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
            }
          : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email verification failed";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/auth/social ────────────────────────────────────────────────
router.post("/social", validate(socialAuthSchema), async (req, res) => {
  try {
    const { provider } = req.body;

    const redirectTo = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as "google" | "facebook",
      options: { redirectTo },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data: { url: data.url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Social auth failed";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/auth/social/callback ───────────────────────────────────────
router.post("/social/callback", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    const supabaseUser = data.user!;

    const user = await prisma.user.upsert({
      where: { supabaseId: supabaseUser.id },
      update: {
        avatarUrl: supabaseUser.user_metadata?.avatar_url ?? undefined,
      },
      create: {
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
        supabaseId: supabaseUser.id,
      },
    });

    return res.json({ data: user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Social callback failed";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/auth/sync-user ────────────────────────────────────────────
router.post("/sync-user", verifyJwt, validate(syncUserSchema), async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    const supabaseUser = data.user!;

    const { name } = req.body;

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

// ─── POST /api/v1/auth/register-brand ────────────────────────────────────────
router.post("/register-brand", verifyJwt, validate(registerBrandSchema), async (req: AuthRequest, res) => {
  try {
    const { brandName } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true, brandId: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.brandId) {
      return res.status(400).json({ error: "You are already associated with a brand." });
    }

    const brand = await prisma.brand.create({
      data: {
        name: brandName.trim(),
        isVerified: false,
      },
    });

    await prisma.user.update({
      where: { id: req.userId! },
      data: { role: "BRAND", brandId: brand.id },
    });

    return res.status(201).json({
      data: {
        brandId: brand.id,
        brandName: brand.name,
        isVerified: brand.isVerified,
        message: "Brand registered. Verification is pending admin approval.",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error registering brand";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────────────
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
