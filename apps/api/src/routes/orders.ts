import { Router } from "express";
import { verifyJwt } from "../middleware/auth";

const router = Router();

// GET /api/v1/orders
router.get("/", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /orders" });
});

// GET /api/v1/orders/:id
router.get("/:id", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /orders/:id" });
});

// POST /api/v1/orders
router.post("/", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "POST /orders" });
});

// PATCH /api/v1/orders/:id/cancel
router.patch("/:id/cancel", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "PATCH /orders/:id/cancel" });
});

export default router;
