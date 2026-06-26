import type { Response, NextFunction } from "express";
import type { ApiKeyRequest } from "./apiKeyAuth";
import { prisma } from "../lib/prisma";

export function logApiUsage(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  res.on("finish", () => {
    if (!req.tenantId || !req.apiKeyId) return;

    prisma.apiUsageLog.create({
      data: {
        tenantId: req.tenantId,
        apiKeyId: req.apiKeyId,
        endpoint: req.path,
        method: req.method,
        status: res.statusCode,
        latencyMs: Date.now() - start,
      },
    }).catch(() => {});
  });

  next();
}
