import { z } from "zod";

// ─── Backend env schema ───────────────────────────────────────────────────────
export const backendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379/0"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8001"),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  ESEWA_SECRET_KEY: z.string().default(""),
  ESEWA_PRODUCT_CODE: z.string().default("EPAYTEST"),
  KHALTI_SECRET_KEY: z.string().default(""),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("VTryon <noreply@vtryon.com>"),
  SENTRY_DSN: z.string().optional(),
});

// ─── Frontend env schema (NEXT_PUBLIC_*) ─────────────────────────────────────
export const frontendEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8000/api/v1"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().default("https://app.posthog.com"),
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;
export type FrontendEnv = z.infer<typeof frontendEnvSchema>;

// ─── Constants shared across apps ────────────────────────────────────────────
export const CURRENCIES = {
  NPR: { code: "NPR", symbol: "Rs.", name: "Nepalese Rupee" },
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
} as const;

export const GARMENT_TYPES = ["top", "bottom", "dress", "outerwear", "accessory"] as const;
export const GENDER_TYPES = ["mens", "womens", "unisex", "kids"] as const;
export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
