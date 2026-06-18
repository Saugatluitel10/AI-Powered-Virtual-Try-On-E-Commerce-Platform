import { Router } from "express";
import { verifyJwt } from "../middleware/auth";

const router = Router();

// GET /api/v1/users/me
router.get("/me", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /users/me" });
});

// PATCH /api/v1/users/me
router.patch("/me", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "PATCH /users/me" });
});

// GET /api/v1/users/me/body-profile
router.get("/me/body-profile", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /users/me/body-profile" });
});

// PUT /api/v1/users/me/body-profile
router.put("/me/body-profile", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "PUT /users/me/body-profile" });
});

// GET /api/v1/users/me/style-profile
router.get("/me/style-profile", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /users/me/style-profile" });
});

// PUT /api/v1/users/me/style-profile
router.put("/me/style-profile", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "PUT /users/me/style-profile" });
});

// GET /api/v1/users/me/wardrobe
router.get("/me/wardrobe", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /users/me/wardrobe" });
});

export default router;
