import { Router } from "express";
import { verifyJwt } from "../middleware/auth";

const router = Router();

// GET /api/v1/products
router.get("/", (_req, res) => {
  res.json({ ok: true, route: "GET /products" });
});

// GET /api/v1/products/:id
router.get("/:id", (_req, res) => {
  res.json({ ok: true, route: "GET /products/:id" });
});

// POST /api/v1/products  (retailer_admin only — enforced in real handler)
router.post("/", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "POST /products" });
});

// PATCH /api/v1/products/:id
router.patch("/:id", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "PATCH /products/:id" });
});

// DELETE /api/v1/products/:id
router.delete("/:id", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "DELETE /products/:id" });
});

export default router;
