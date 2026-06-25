import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

export const globalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later.", statusCode: 429 },
});

export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please wait a minute.", statusCode: 429 },
});

export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many uploads, please try again later.", statusCode: 429 },
});
