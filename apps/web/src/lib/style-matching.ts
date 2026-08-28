import type { Product } from "@/types/product";

export type ProductSection = "mens" | "womens" | "unisex";
export type SectionChoice = "auto" | ProductSection;
export type ImageTone = "deep" | "balanced" | "light";

export interface StyleAnalysis {
  color: string;
  tone: ImageTone;
  style: string;
  suggestedSection: ProductSection;
  sectionConfidence: "high" | "low";
  sectionReason: string;
}

export interface PixelSample {
  data: ArrayLike<number>;
}

const DEEP_COLORS = new Set(["black", "navy", "charcoal", "emerald", "olive"]);
const LIGHT_COLORS = new Set(["white", "ivory", "coral", "pink", "gold"]);
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export function validatePhotoFile(file: Pick<File, "type" | "size">) {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) return "Choose a JPG, PNG, or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "That image is over 6 MB. Choose a smaller photo.";
  return null;
}

export function analyzePixelSample(pixels: PixelSample) {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let index = 0; index < pixels.data.length; index += 16) {
    if ((pixels.data[index + 3] ?? 255) < 100) continue;
    red += pixels.data[index] ?? 0;
    green += pixels.data[index + 1] ?? 0;
    blue += pixels.data[index + 2] ?? 0;
    count += 1;
  }

  if (!count) throw new Error("No visible pixels");
  red /= count;
  green /= count;
  blue /= count;

  const lightness = (Math.max(red, green, blue) + Math.min(red, green, blue)) / 2;
  let color = "neutral";
  if (blue > red * 1.15 && blue > green * 1.05) color = "blue";
  else if (red > green * 1.2 && red > blue * 1.15) color = red > 170 ? "pink" : "rust";
  else if (green > red * 1.08 && green > blue * 1.05) color = "olive";
  else if (lightness < 65) color = "black";
  else if (lightness > 195) color = "white";

  const tone: ImageTone = lightness < 90 ? "deep" : lightness > 175 ? "light" : "balanced";
  return { color, tone };
}

export function suggestSectionFromSource(sourceName: string) {
  const name = sourceName.toLocaleLowerCase();
  if (/(woman|women|female|girl|lady)/.test(name)) {
    return {
      suggestedSection: "womens" as const,
      sectionConfidence: "high" as const,
      sectionReason: "The image name contains an explicit women's-section cue.",
    };
  }
  if (/(^|[^a-z])(man|men|male|boy|gentleman)([^a-z]|$)/.test(name)) {
    return {
      suggestedSection: "mens" as const,
      sectionConfidence: "high" as const,
      sectionReason: "The image name contains an explicit men's-section cue.",
    };
  }
  return {
    suggestedSection: "unisex" as const,
    sectionConfidence: "low" as const,
    sectionReason: "No reliable section cue was available, so automatic mode uses unisex products only.",
  };
}

export function resolveProductSection(choice: SectionChoice, analysis: StyleAnalysis): ProductSection {
  return choice === "auto" ? analysis.suggestedSection : choice;
}

export function scoreProduct(product: Product, analysis: StyleAnalysis, occasion: string) {
  let score = 0;
  if (product.style === occasion) score += 5;
  if (product.color === analysis.color) score += 4;
  if (analysis.tone === "deep" && product.color && DEEP_COLORS.has(product.color)) score += 2;
  if (analysis.tone === "light" && product.color && LIGHT_COLORS.has(product.color)) score += 2;
  return score;
}

export function recommendProducts(
  products: Product[],
  analysis: StyleAnalysis,
  choice: SectionChoice,
  occasion: string,
  limit = 6,
) {
  const section = resolveProductSection(choice, analysis);
  return products
    .filter((product) => product.gender === section)
    .map((product, index) => ({ product, index, score: scoreProduct(product, analysis, occasion) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map(({ product, score }) => ({ product, score }));
}

export function recommendationReason(product: Product, analysis: StyleAnalysis, occasion: string) {
  const reasons: string[] = [];
  if (product.style === occasion) reasons.push(`${occasion} style match`);
  if (product.color === analysis.color) reasons.push(`${analysis.color} colour match`);
  if (
    (analysis.tone === "deep" && product.color && DEEP_COLORS.has(product.color)) ||
    (analysis.tone === "light" && product.color && LIGHT_COLORS.has(product.color))
  ) {
    reasons.push(`${analysis.tone} tone pairing`);
  }
  return reasons.length ? reasons.join("; ") : "Versatile catalogue match";
}
