import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service-role client — never exposed to the browser
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Bucket names ─────────────────────────────────────────────────────────────
export const BUCKETS = {
  USER_PHOTOS: "user-photos",
  TRYON_RESULTS: "tryon-results",
  GARMENT_SEGMENTS: "garment-segments",
} as const;

type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

// ─── Validation ───────────────────────────────────────────────────────────────
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function validateImage(buffer: Buffer, contentType: string): void {
  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error(
      `Unsupported file type "${contentType}". Allowed: jpeg, png, webp, gif, avif.`
    );
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(
      `File too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`
    );
  }
}

// ─── Core upload helper ───────────────────────────────────────────────────────
async function upload(
  bucket: Bucket,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  validateImage(buffer, contentType);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return path;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a user's profile / body-scan photo to the private user-photos bucket.
 * Returns the storage path (use getSignedUrl to generate a time-limited URL).
 */
export async function uploadUserPhoto(
  userId: string,
  buffer: Buffer,
  contentType = "image/jpeg"
): Promise<string> {
  const ext = contentType.split("/")[1] ?? "jpg";
  const path = `${userId}/photo.${ext}`;
  return upload(BUCKETS.USER_PHOTOS, path, buffer, contentType);
}

/**
 * Upload a virtual try-on result image to the private tryon-results bucket.
 * Returns the storage path.
 */
export async function uploadTryonResult(
  userId: string,
  productId: string,
  buffer: Buffer,
  contentType = "image/jpeg"
): Promise<string> {
  const ext = contentType.split("/")[1] ?? "jpg";
  const path = `${userId}/${productId}-${Date.now()}.${ext}`;
  return upload(BUCKETS.TRYON_RESULTS, path, buffer, contentType);
}

/**
 * Generate a signed URL for a private bucket object.
 * @param bucket  One of the BUCKETS constants
 * @param path    Storage path returned by uploadUserPhoto / uploadTryonResult
 * @param expiresIn  Seconds until the URL expires (default 3600 = 1 hour)
 */
export async function getSignedUrl(
  bucket: Bucket,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown"}`);
  }

  return data.signedUrl;
}
