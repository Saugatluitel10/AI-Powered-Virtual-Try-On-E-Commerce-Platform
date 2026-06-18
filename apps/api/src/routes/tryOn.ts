import { Router } from "express";
import { verifyJwt } from "../middleware/auth";

const router = Router();

// POST /api/v1/try-on        — submit a new try-on job
router.post("/", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "POST /try-on" });
});

// GET /api/v1/try-on/:id     — poll status of a try-on result
router.get("/:id", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /try-on/:id" });
});

// GET /api/v1/try-on          — list user's try-on history
router.get("/", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "GET /try-on" });
});

// POST /api/v1/try-on/body-scan
router.post("/body-scan", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "POST /try-on/body-scan" });
});

export default router;
