import { Router } from "express";
import { verifyJwt } from "../middleware/auth";

const router = Router();

// POST /api/v1/recommendations/style-advice
router.post("/style-advice", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "POST /recommendations/style-advice" });
});

// GET /api/v1/recommendations/for-me
router.get("/for-me", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /recommendations/for-me" });
});

// GET /api/v1/recommendations/complete-the-look/:productId
router.get("/complete-the-look/:productId", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /recommendations/complete-the-look/:productId" });
});

export default router;
