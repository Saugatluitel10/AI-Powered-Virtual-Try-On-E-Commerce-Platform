import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export interface ApiKeyRequest extends Request {
  tenantId?: string;
  apiKeyId?: string;
  tenantTier?: string;
  apiKeyScopes?: string[];
}

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `vtk_${crypto.randomBytes(32).toString("hex")}`;
  const hash = hashKey(raw);
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

export async function verifyApiKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers["x-api-key"];
  if (!header || typeof header !== "string") {
    return res.status(401).json({ error: "Missing X-API-Key header" });
  }

  const keyHash = hashKey(header);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { tenant: { select: { id: true, tier: true, isActive: true } } },
  });

  if (!apiKey || !apiKey.isActive) {
    return res.status(401).json({ error: "Invalid or revoked API key" });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return res.status(401).json({ error: "API key has expired" });
  }

  if (!apiKey.tenant.isActive) {
    return res.status(403).json({ error: "Tenant account is suspended" });
  }

  req.tenantId = apiKey.tenant.id;
  req.apiKeyId = apiKey.id;
  req.tenantTier = apiKey.tenant.tier;
  req.apiKeyScopes = apiKey.scopes;

  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return next();
}

export function requireScope(...scopes: string[]) {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    const keyScopes = req.apiKeyScopes ?? [];
    const hasScope = scopes.some((s) => keyScopes.includes(s) || keyScopes.includes("*"));
    if (!hasScope) {
      return res.status(403).json({ error: `Requires scope: ${scopes.join(" or ")}` });
    }
    return next();
  };
}
