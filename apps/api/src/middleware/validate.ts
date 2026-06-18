import type { Request, Response, NextFunction } from "express";
import { z, type ZodTypeAny } from "zod";

/**
 * Returns an Express middleware that validates req.body against the given Zod
 * schema. Passes validated (and coerced) data back onto req.body on success.
 * Responds 400 with a structured errors array on failure.
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return res.status(400).json({ error: "Validation failed", errors });
    }
    req.body = result.data;
    return next();
  };
}
