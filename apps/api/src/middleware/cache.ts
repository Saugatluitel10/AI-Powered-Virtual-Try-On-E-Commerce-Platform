import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis";

export function cacheResponse(ttlSeconds: number, keyPrefix?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${keyPrefix ?? req.baseUrl}:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Content-Type", "application/json");
        res.send(cached);
        return;
      }
    } catch {
      // Redis down — fall through to handler
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      const serialized = JSON.stringify(body);
      res.setHeader("X-Cache", "MISS");
      redis.setex(key, ttlSeconds, serialized).catch(() => {});
      res.setHeader("Content-Type", "application/json");
      res.send(serialized);
      return res;
    };

    next();
  };
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis down — ignore
  }
}
