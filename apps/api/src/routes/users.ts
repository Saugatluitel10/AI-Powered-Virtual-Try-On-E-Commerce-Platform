import { Router } from "express";
import multer from "multer";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { uploadUserPhoto, getSignedUrl, BUCKETS } from "../lib/supabase";
import { prisma } from "../lib/prisma";
import { enqueueBodyAnalysis } from "../jobs/queues";

const router = Router();

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
router.patch("/me", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "PATCH /users/me" });
});

// POST /api/v1/users/me/photo
// Accepts multipart/form-data with field name "photo".
// Uploads to Supabase Storage, persists the path on BodyProfile,
// then enqueues a body-analysis job to extract measurements.
router.post(
  "/me/photo",
  verifyJwt,
  upload.single("photo"),
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
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching body profile";
    return res.status(500).json({ error: message });
  }
});

// PUT /api/v1/users/me/body-profile
router.put("/me/body-profile", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "PUT /users/me/body-profile" });
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
router.put("/me/style-profile", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { preferredStyles, occasions, colorPalette } = req.body as {
      preferredStyles?: string[];
      occasions?: string[];
      colorPalette?: string[];
    };

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

// GET /api/v1/users/me/wardrobe — redirects to /wardrobe
router.get("/me/wardrobe", verifyJwt, (_req, res) => {
  res.redirect(308, "/api/v1/wardrobe");
});

export default router;
