import express, { type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import cors from "cors";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import cartRoutes from "./routes/cart";
import paymentRoutes from "./routes/payments";
import tryOnRoutes from "./routes/tryOn";
import recommendationRoutes from "./routes/recommendations";
import wardrobeRoutes from "./routes/wardrobe";
import brandRoutes from "./routes/brand";
import adminRoutes from "./routes/admin";

const app = express();

// ─── Gzip compression ────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

// ─── Body parsing ────────────────────────────────────────────────────────────
// Raw body must come before json() so Stripe webhook signatures can be verified
app.use("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const v1 = "/api/v1";
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/users`, userRoutes);
app.use(`${v1}/products`, productRoutes);
app.use(`${v1}/orders`, orderRoutes);
app.use(`${v1}/cart`, cartRoutes);
app.use(`${v1}/payments`, paymentRoutes);
app.use(`${v1}/try-on`, tryOnRoutes);
app.use(`${v1}/recommendations`, recommendationRoutes);
app.use(`${v1}/wardrobe`, wardrobeRoutes);
app.use(`${v1}/brand`, brandRoutes);
app.use(`${v1}/admin`, adminRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Must have 4 params so Express recognises it as an error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message, err.stack);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

export default app;
