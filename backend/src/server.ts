import "dotenv/config";
import { initSentry, Sentry } from "./lib/sentry";
initSentry(); // Must be called before any other imports that use express
import express from "express";
import cors from "cors";
import { json } from "express";

// Route imports (stubs — filled in per phase)
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import tryOnRoutes from "./routes/tryOn";
import recommendationRoutes from "./routes/recommendations";
import adminRoutes from "./routes/admin";

// Start BullMQ workers
import "./jobs/workers";

const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

// Raw body for Stripe webhooks before json middleware
app.use("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }));
app.use(json({ limit: "10mb" }));

// Routes
const v1 = "/api/v1";
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/users`, userRoutes);
app.use(`${v1}/products`, productRoutes);
app.use(`${v1}/orders`, orderRoutes);
app.use(`${v1}/try-on`, tryOnRoutes);
app.use(`${v1}/recommendations`, recommendationRoutes);
app.use(`${v1}/admin`, adminRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[Server] running on http://localhost:${PORT}`);
});

export default app;
