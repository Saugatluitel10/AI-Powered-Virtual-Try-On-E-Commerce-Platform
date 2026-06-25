import type { Request, Response, NextFunction } from "express";

const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
};

export function validateFileMagicBytes(req: Request, res: Response, next: NextFunction) {
  if (!req.file) return next();

  const buffer = req.file.buffer;
  if (buffer.length < 4) {
    return res.status(400).json({ error: "File is too small to be a valid image." });
  }

  const declaredType = req.file.mimetype;
  const signatures = MAGIC_BYTES[declaredType];

  if (!signatures) {
    return res.status(400).json({ error: "Unsupported file type." });
  }

  const matches = signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );

  if (!matches) {
    return res.status(400).json({
      error: "File content does not match its declared type. Upload rejected.",
    });
  }

  next();
}
