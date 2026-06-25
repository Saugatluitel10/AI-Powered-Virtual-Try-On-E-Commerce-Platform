import express, { type Express, type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import cors from "cors";
import { globalLimiter, authLimiter, uploadLimiter } from "./middleware/rateLimiter";
import { sanitizeBody } from "./middleware/sanitize";

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

const app: Express = express();

// ─── Gzip compression ────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS whitelist ──────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ─── Global rate limiting ────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));

// ─── Input sanitization ─────────────────────────────────────────────────────
app.use(sanitizeBody);

// ─── Security headers ───────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const v1 = "/api/v1";
app.use(`${v1}/auth`, authLimiter, authRoutes);
app.use(`${v1}/users`, uploadLimiter, userRoutes);
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message, err.stack);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

export default app;
