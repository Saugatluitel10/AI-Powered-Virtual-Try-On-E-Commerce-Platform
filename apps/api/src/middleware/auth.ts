import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function verifyJwt(
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

  const user = await prisma.user.findUnique({
    where: { supabaseId: data.user.id },
    select: { id: true },
  });

  if (!user) {
    return res.status(401).json({ error: "User not found. Please sign up first." });
  }

  req.userId = user.id;
  return next();
}
