import type { Request, Response, NextFunction } from "express";

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};
const HTML_REGEX = /[&<>"'/]/g;

function escapeHtml(str: string): string {
  return str.replace(HTML_REGEX, (ch) => HTML_ENTITY_MAP[ch] ?? ch);
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return escapeHtml(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
}
