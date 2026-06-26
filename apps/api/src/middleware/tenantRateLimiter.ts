import type { Response, NextFunction } from "express";
import type { ApiKeyRequest } from "./apiKeyAuth";

const TIER_LIMITS: Record<string, { rpm: number; dailyMax: number }> = {
  FREE:       { rpm: 10,   dailyMax: 100 },
  STARTER:    { rpm: 60,   dailyMax: 5000 },
  GROWTH:     { rpm: 300,  dailyMax: 50000 },
  ENTERPRISE: { rpm: 1000, dailyMax: 500000 },
};

const windows = new Map<string, { count: number; resetAt: number }>();
const dailyWindows = new Map<string, { count: number; resetAt: number }>();

export function tenantRateLimit(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.tenantId;
  if (!tenantId) return next();

  const tier = req.tenantTier ?? "FREE";
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.FREE;
  const now = Date.now();

  const minuteKey = `rpm:${tenantId}`;
  let minute = windows.get(minuteKey);
  if (!minute || now > minute.resetAt) {
    minute = { count: 0, resetAt: now + 60_000 };
    windows.set(minuteKey, minute);
  }
  minute.count++;

  if (minute.count > limits.rpm) {
    res.setHeader("Retry-After", Math.ceil((minute.resetAt - now) / 1000).toString());
    return res.status(429).json({
      error: "Rate limit exceeded",
      limit: limits.rpm,
      tier,
      retryAfter: Math.ceil((minute.resetAt - now) / 1000),
    });
  }

  const dayKey = `daily:${tenantId}`;
  let daily = dailyWindows.get(dayKey);
  if (!daily || now > daily.resetAt) {
    daily = { count: 0, resetAt: now + 86_400_000 };
    dailyWindows.set(dayKey, daily);
  }
  daily.count++;

  if (daily.count > limits.dailyMax) {
    return res.status(429).json({
      error: "Daily API limit exceeded",
      limit: limits.dailyMax,
      tier,
    });
  }

  res.setHeader("X-RateLimit-Limit", limits.rpm.toString());
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limits.rpm - minute.count).toString());
  res.setHeader("X-RateLimit-Reset", Math.ceil(minute.resetAt / 1000).toString());

  return next();
}
