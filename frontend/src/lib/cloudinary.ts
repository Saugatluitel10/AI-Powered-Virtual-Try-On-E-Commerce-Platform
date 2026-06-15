// Cloudinary configuration for Next/Image + upload widget
export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

export function getCloudinaryUrl(
  publicId: string,
  options: { width?: number; height?: number; quality?: string } = {}
): string {
  const { width = 800, height, quality = "auto" } = options;
  const transforms = [
    `q_${quality}`,
    `f_auto`,
    width ? `w_${width}` : "",
    height ? `h_${height}` : "",
    "c_limit",
  ]
    .filter(Boolean)
    .join(",");
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
}
