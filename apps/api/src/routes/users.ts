import { Router } from "express";
import multer from "multer";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  updateProfileSchema,
  updateBodyProfileSchema,
  updateStyleProfileSchema,
  notificationPrefsSchema,
  deleteAccountSchema,
  createAddressSchema,
  updateAddressSchema,
  priceAlertSchema,
  followBrandSchema,
} from "../schemas";
import { supabase, uploadUserPhoto, getSignedUrl, BUCKETS } from "../lib/supabase";
import { prisma } from "../lib/prisma";
import { enqueueBodyAnalysis } from "../jobs/queues";
import { validateFileMagicBytes } from "../middleware/validateUpload";

const router: ReturnType<typeof Router> = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are accepted."));
    }
  },
});

// GET /api/v1/users/me
router.get("/me", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        supabaseId: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ data: user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching user";
    return res.status(500).json({ error: message });
  }
});

// PATCH /api/v1/users/me
router.patch("/me", verifyJwt, validate(updateProfileSchema), async (req: AuthRequest, res) => {
  try {
    const { name, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return res.json({ data: user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating profile";
    return res.status(500).json({ error: message });
  }
});

// POST /api/v1/users/me/photo
// Accepts multipart/form-data with field name "photo".
// Uploads to Supabase Storage, persists the path on BodyProfile,
// then enqueues a body-analysis job to extract measurements.
router.post(
  "/me/photo",
  verifyJwt,
  upload.single("photo"),
  validateFileMagicBytes,
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No photo file provided." });
      }

      const storagePath = await uploadUserPhoto(
        req.userId!,
        req.file.buffer,
        req.file.mimetype
      );

      // Persist the photo path immediately so the profile exists for polling
      await prisma.bodyProfile.upsert({
        where: { userId: req.userId! },
        update: { photoUrl: storagePath },
        create: { userId: req.userId!, photoUrl: storagePath },
      });

      // Enqueue AI analysis — worker will upsert measurements when done
      await enqueueBodyAnalysis({ userId: req.userId!, storagePath });

      const signedUrl = await getSignedUrl(BUCKETS.USER_PHOTOS, storagePath, 3600);
      const jobId = `photo_${req.userId}_${Date.now()}`;

      return res.json({ data: { photoUrl: signedUrl, storagePath, jobId } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      return res.status(500).json({ error: message });
    }
  }
);

// GET /api/v1/users/me/body-profile
router.get("/me/body-profile", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.bodyProfile.findUnique({
      where: { userId: req.userId! },
    });

    if (!profile) {
      return res.status(404).json({
        error: "Body profile not found. Please upload a photo first.",
      });
    }

    return res.json({
      data: {
        id: profile.id,
        userId: profile.userId,
        heightCm: profile.height,
        weightKg: profile.weight,
        bustCm: profile.bust,
        waistCm: profile.waist,
        hipsCm: profile.hips,
        shoulderWidthCm: profile.shoulders,
        bodyType: profile.bodyType,
        photoUrl: profile.photoUrl,
        analysisComplete: profile.bodyType !== null,
        overallConfidence: profile.overallConfidence,
        confidence: {
          heightCm: profile.heightConfidence,
          bustCm: profile.bustConfidence,
          waistCm: profile.waistConfidence,
          hipsCm: profile.hipsConfidence,
          shoulderWidthCm: profile.shouldersConfidence,
        },
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching body profile";
    return res.status(500).json({ error: message });
  }
});

// PUT /api/v1/users/me/body-profile
router.put("/me/body-profile", verifyJwt, validate(updateBodyProfileSchema), async (req: AuthRequest, res) => {
  try {
    const { height, weight, bust, waist, hips, shoulders, bodyType } = req.body;

    const profile = await prisma.bodyProfile.upsert({
      where: { userId: req.userId! },
      update: {
        ...(height !== undefined && { height }),
        ...(weight !== undefined && { weight }),
        ...(bust !== undefined && { bust }),
        ...(waist !== undefined && { waist }),
        ...(hips !== undefined && { hips }),
        ...(shoulders !== undefined && { shoulders }),
        ...(bodyType !== undefined && { bodyType: bodyType as "HOURGLASS" | "PEAR" | "APPLE" | "RECTANGLE" | "INVERTED_TRIANGLE" }),
      },
      create: {
        userId: req.userId!,
        height: height ?? null,
        weight: weight ?? null,
        bust: bust ?? null,
        waist: waist ?? null,
        hips: hips ?? null,
        shoulders: shoulders ?? null,
        bodyType: (bodyType as "HOURGLASS" | "PEAR" | "APPLE" | "RECTANGLE" | "INVERTED_TRIANGLE") ?? null,
      },
    });

    return res.json({
      data: {
        id: profile.id,
        userId: profile.userId,
        heightCm: profile.height,
        weightKg: profile.weight,
        bustCm: profile.bust,
        waistCm: profile.waist,
        hipsCm: profile.hips,
        shoulderWidthCm: profile.shoulders,
        bodyType: profile.bodyType,
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating body profile";
    return res.status(500).json({ error: message });
  }
});

// GET /api/v1/users/me/style-profile
router.get("/me/style-profile", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.styleProfile.findUnique({
      where: { userId: req.userId! },
    });
    if (!profile) {
      return res.json({
        data: {
          preferredStyles: [],
          occasions: [],
          colorPalette: [],
          quizCompleted: false,
        },
      });
    }
    return res.json({
      data: {
        id: profile.id,
        preferredStyles: profile.preferredStyles,
        occasions: profile.occasions,
        colorPalette: profile.colorPalette,
        quizCompleted: profile.quizCompleted,
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching style profile";
    return res.status(500).json({ error: message });
  }
});

// PUT /api/v1/users/me/style-profile
router.put("/me/style-profile", verifyJwt, validate(updateStyleProfileSchema), async (req: AuthRequest, res) => {
  try {
    const { preferredStyles, occasions, colorPalette } = req.body;

    const profile = await prisma.styleProfile.upsert({
      where: { userId: req.userId! },
      update: {
        ...(preferredStyles && { preferredStyles }),
        ...(occasions && { occasions }),
        ...(colorPalette && { colorPalette }),
        quizCompleted: true,
      },
      create: {
        userId: req.userId!,
        preferredStyles: preferredStyles ?? [],
        occasions: occasions ?? [],
        colorPalette: colorPalette ?? [],
        quizCompleted: true,
      },
    });

    return res.json({
      data: {
        id: profile.id,
        preferredStyles: profile.preferredStyles,
        occasions: profile.occasions,
        colorPalette: profile.colorPalette,
        quizCompleted: profile.quizCompleted,
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error saving style profile";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/users/me/notifications — notification preferences ────────
router.patch("/me/notifications", verifyJwt, validate(notificationPrefsSchema), async (req: AuthRequest, res) => {
  try {
    const { emailMarketing, emailOrders, emailTryOn, pushEnabled } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        ...(emailMarketing !== undefined && { emailMarketing }),
        ...(emailOrders !== undefined && { emailOrders }),
        ...(emailTryOn !== undefined && { emailTryOn }),
        ...(pushEnabled !== undefined && { pushEnabled }),
      },
      select: {
        id: true,
        emailMarketing: true,
        emailOrders: true,
        emailTryOn: true,
        pushEnabled: true,
      },
    });

    return res.json({ data: user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating notification settings";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/users/me/notifications ─────────────────────────────────────
router.get("/me/notifications", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        emailMarketing: true,
        emailOrders: true,
        emailTryOn: true,
        pushEnabled: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ data: user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching notification settings";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/users/me/export — GDPR data export ────────────────────────
router.get("/me/export", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: {
        bodyProfile: true,
        styleProfile: true,
        orders: { include: { items: true } },
        wardrobeItems: true,
        tryOnResults: {
          select: {
            id: true,
            productId: true,
            status: true,
            sizeRecommended: true,
            createdAt: true,
          },
        },
        cartItems: true,
        conversations: {
          include: {
            messages: { select: { role: true, content: true, createdAt: true } },
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      data: {
        exportedAt: new Date().toISOString(),
        account: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
        },
        bodyProfile: user.bodyProfile,
        styleProfile: user.styleProfile,
        orders: user.orders,
        wardrobeItems: user.wardrobeItems,
        tryOnResults: user.tryOnResults,
        cartItems: user.cartItems,
        conversations: user.conversations,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error exporting data";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/users/me — GDPR account deletion ────────────────────────
router.delete("/me", verifyJwt, validate(deleteAccountSchema), async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { supabaseId: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversation: { userId: req.userId! } } }),
      prisma.conversation.deleteMany({ where: { userId: req.userId! } }),
      prisma.wardrobeItem.deleteMany({ where: { userId: req.userId! } }),
      prisma.wardrobeCollection.deleteMany({ where: { userId: req.userId! } }),
      prisma.cartItem.deleteMany({ where: { userId: req.userId! } }),
      prisma.tryOnResult.deleteMany({ where: { userId: req.userId! } }),
      prisma.returnRequest.deleteMany({ where: { userId: req.userId! } }),
      prisma.orderItem.deleteMany({ where: { order: { userId: req.userId! } } }),
      prisma.order.deleteMany({ where: { userId: req.userId! } }),
      prisma.bodyProfile.deleteMany({ where: { userId: req.userId! } }),
      prisma.styleProfile.deleteMany({ where: { userId: req.userId! } }),
      prisma.user.delete({ where: { id: req.userId! } }),
    ]);

    await supabase.auth.admin.deleteUser(user.supabaseId).catch(() => {});

    return res.json({ data: { deleted: true, message: "Account and all associated data deleted." } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error deleting account";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/users/me/measurement-history ──────────────────────────────
router.get("/me/measurement-history", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.bodyProfile.findUnique({
      where: { userId: req.userId! },
      select: { id: true },
    });

    if (!profile) {
      return res.json({ data: [] });
    }

    const history = await prisma.measurementHistory.findMany({
      where: { bodyProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return res.json({
      data: history.map((h) => ({
        id: h.id,
        heightCm: h.height,
        weightKg: h.weight,
        bustCm: h.bust,
        waistCm: h.waist,
        hipsCm: h.hips,
        shoulderWidthCm: h.shoulders,
        bodyType: h.bodyType,
        source: h.source,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching measurement history";
    return res.status(500).json({ error: message });
  }
});

// GET /api/v1/users/me/wardrobe — redirects to /wardrobe
router.get("/me/wardrobe", verifyJwt, (_req, res) => {
  res.redirect(308, "/api/v1/wardrobe");
});

// ═══════════════════════════════════════════════════════════════════════════════
// Address Book
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/v1/users/me/addresses ─────────────────────────────────────────
router.get("/me/addresses", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.userId! },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return res.json({ data: addresses });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching addresses";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/users/me/addresses ────────────────────────────────────────
router.post("/me/addresses", verifyJwt, validate(createAddressSchema), async (req: AuthRequest, res) => {
  try {
    const { label, fullName, phone, street, city, district, province, isDefault } = req.body;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.userId!, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.userId!,
        label,
        fullName,
        phone,
        street,
        city,
        district,
        province: province ?? null,
        isDefault,
      },
    });

    return res.status(201).json({ data: address });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating address";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/users/me/addresses/:id ───────────────────────────────────
router.patch("/me/addresses/:id", verifyJwt, validate(updateAddressSchema), async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!existing) {
      return res.status(404).json({ error: "Address not found." });
    }

    const { label, fullName, phone, street, city, district, province, isDefault } = req.body;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.userId!, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id: existing.id },
      data: {
        ...(label !== undefined && { label }),
        ...(fullName !== undefined && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(street !== undefined && { street }),
        ...(city !== undefined && { city }),
        ...(district !== undefined && { district }),
        ...(province !== undefined && { province: province ?? null }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return res.json({ data: address });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating address";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/users/me/addresses/:id ──────────────────────────────────
router.delete("/me/addresses/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!existing) {
      return res.status(404).json({ error: "Address not found." });
    }

    await prisma.address.delete({ where: { id: existing.id } });
    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error deleting address";
    return res.status(500).json({ error: message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Price Alerts
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/v1/users/me/price-alerts ──────────────────────────────────────
router.get("/me/price-alerts", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: req.userId! },
      include: {
        product: {
          select: { id: true, name: true, slug: true, price: true, currency: true, images: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      data: alerts.map((a: typeof alerts[number]) => ({
        id: a.id,
        productId: a.productId,
        productName: a.product.name,
        productSlug: a.product.slug,
        productImage: a.product.images[0] ?? null,
        currentPrice: a.product.price,
        targetPrice: a.targetPrice,
        currency: a.product.currency,
        isTriggered: a.isTriggered,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching price alerts";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/users/me/price-alerts ─────────────────────────────────────
router.post("/me/price-alerts", verifyJwt, validate(priceAlertSchema), async (req: AuthRequest, res) => {
  try {
    const { productId, targetPrice } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const alert = await prisma.priceAlert.upsert({
      where: { userId_productId: { userId: req.userId!, productId } },
      update: { targetPrice, isTriggered: false },
      create: { userId: req.userId!, productId, targetPrice },
    });

    return res.status(201).json({ data: { id: alert.id, targetPrice: alert.targetPrice } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating price alert";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/users/me/price-alerts/:id ───────────────────────────────
router.delete("/me/price-alerts/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const alert = await prisma.priceAlert.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!alert) {
      return res.status(404).json({ error: "Price alert not found." });
    }

    await prisma.priceAlert.delete({ where: { id: alert.id } });
    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error deleting price alert";
    return res.status(500).json({ error: message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Brand Follows
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/v1/users/me/followed-brands ───────────────────────────────────
router.get("/me/followed-brands", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const follows = await prisma.brandFollow.findMany({
      where: { userId: req.userId! },
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      data: follows.map((f: typeof follows[number]) => ({
        id: f.id,
        brandId: f.brand.id,
        brandName: f.brand.name,
        brandLogo: f.brand.logo,
        followedAt: f.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching followed brands";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/users/me/followed-brands ──────────────────────────────────
router.post("/me/followed-brands", verifyJwt, validate(followBrandSchema), async (req: AuthRequest, res) => {
  try {
    const { brandId } = req.body;

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { id: true },
    });
    if (!brand) {
      return res.status(404).json({ error: "Brand not found." });
    }

    const follow = await prisma.brandFollow.upsert({
      where: { userId_brandId: { userId: req.userId!, brandId } },
      update: {},
      create: { userId: req.userId!, brandId },
    });

    return res.status(201).json({ data: { id: follow.id, brandId: follow.brandId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error following brand";
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/v1/users/me/followed-brands/:brandId ───────────────────────
router.delete("/me/followed-brands/:brandId", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const follow = await prisma.brandFollow.findFirst({
      where: { userId: req.userId!, brandId: req.params.brandId as string },
    });
    if (!follow) {
      return res.status(404).json({ error: "Not following this brand." });
    }

    await prisma.brandFollow.delete({ where: { id: follow.id } });
    return res.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error unfollowing brand";
    return res.status(500).json({ error: message });
  }
});

export default router;
