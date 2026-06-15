import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Look up our local user record by supabaseId
  const user = await prisma.user.findUnique({
    where: { supabaseId: data.user.id },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: "User not found or inactive" });
  }

  req.userId = user.id;
  req.userRole = user.role;
  return next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
