import { prisma } from "./prisma";

export interface SizeRecommendation {
  recommendedSize: string;
  confidence: number;
  reasoning: string;
}

interface UserMeasurements {
  bust: number | null;
  waist: number | null;
  hips: number | null;
}

// South Asian fallback size chart — used when no brand-specific chart exists
const FALLBACK_CHART: Array<{
  size: string;
  bustMin: number;
  bustMax: number;
  waistMin: number;
  waistMax: number;
  hipsMin: number;
  hipsMax: number;
}> = [
  { size: "XS", bustMin: 76, bustMax: 82, waistMin: 58, waistMax: 64, hipsMin: 82, hipsMax: 88 },
  { size: "S",  bustMin: 82, bustMax: 88, waistMin: 64, waistMax: 70, hipsMin: 88, hipsMax: 94 },
  { size: "M",  bustMin: 88, bustMax: 94, waistMin: 70, waistMax: 76, hipsMin: 94, hipsMax: 100 },
  { size: "L",  bustMin: 94, bustMax: 102, waistMin: 76, waistMax: 84, hipsMin: 100, hipsMax: 108 },
  { size: "XL", bustMin: 102, bustMax: 110, waistMin: 84, waistMax: 92, hipsMin: 108, hipsMax: 116 },
  { size: "XXL", bustMin: 110, bustMax: 120, waistMin: 92, waistMax: 102, hipsMin: 116, hipsMax: 126 },
];

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function overlapScore(
  value: number | null,
  min: number | null,
  max: number | null
): { score: number; label: string; detail: string } | null {
  if (value === null || min === null || max === null) return null;
  const mid = (min + max) / 2;
  const halfRange = (max - min) / 2;
  if (halfRange === 0) return null;

  if (inRange(value, min, max)) {
    const deviation = Math.abs(value - mid) / halfRange;
    return {
      score: 1 - deviation * 0.3,
      label: "fits",
      detail: `${value.toFixed(0)}cm is within the ${min}–${max}cm range`,
    };
  }

  const distance = value < min ? min - value : value - max;
  if (distance <= 3) {
    return {
      score: 0.5 - (distance / 6),
      label: value < min ? "slightly small" : "slightly large",
      detail: `${value.toFixed(0)}cm is ${distance.toFixed(0)}cm ${value < min ? "below" : "above"} the ${min}–${max}cm range`,
    };
  }

  return {
    score: Math.max(0, 0.2 - distance / 20),
    label: value < min ? "too small" : "too large",
    detail: `${value.toFixed(0)}cm is ${distance.toFixed(0)}cm ${value < min ? "below" : "above"} the ${min}–${max}cm range`,
  };
}

export async function recommendSize(
  userId: string,
  productId: string
): Promise<SizeRecommendation | null> {
  const [profile, product] = await Promise.all([
    prisma.bodyProfile.findUnique({
      where: { userId },
      select: { bust: true, waist: true, hips: true },
    }),
    prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true, sizes: true },
    }),
  ]);

  if (!profile || !product) return null;

  const measurements: UserMeasurements = {
    bust: profile.bust,
    waist: profile.waist,
    hips: profile.hips,
  };

  if (!measurements.bust && !measurements.waist && !measurements.hips) {
    return null;
  }

  // Try brand-specific chart first
  let chart = await prisma.sizeChart.findMany({
    where: { brandId: product.brandId },
    orderBy: { sortOrder: "asc" },
  });

  // Fall back to generic chart, filtered to sizes the product offers
  const useFallback = chart.length === 0;
  if (useFallback) {
    chart = FALLBACK_CHART
      .filter((row) => product.sizes.includes(row.size))
      .map((row, i) => ({
        id: `fallback_${i}`,
        brandId: product.brandId,
        size: row.size,
        bustMin: row.bustMin,
        bustMax: row.bustMax,
        waistMin: row.waistMin,
        waistMax: row.waistMax,
        hipsMin: row.hipsMin,
        hipsMax: row.hipsMax,
        sortOrder: i,
      }));
  }

  if (chart.length === 0) return null;

  let bestSize = chart[0].size;
  let bestScore = -1;
  let bestDetails: string[] = [];

  for (const row of chart) {
    const scores: Array<{ score: number; detail: string }> = [];

    const bustResult = overlapScore(measurements.bust, row.bustMin, row.bustMax);
    if (bustResult) scores.push({ score: bustResult.score, detail: `Bust: ${bustResult.detail}` });

    const waistResult = overlapScore(measurements.waist, row.waistMin, row.waistMax);
    if (waistResult) scores.push({ score: waistResult.score, detail: `Waist: ${waistResult.detail}` });

    const hipsResult = overlapScore(measurements.hips, row.hipsMin, row.hipsMax);
    if (hipsResult) scores.push({ score: hipsResult.score, detail: `Hips: ${hipsResult.detail}` });

    if (scores.length === 0) continue;

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestSize = row.size;
      bestDetails = scores.map((s) => s.detail);
    }
  }

  const confidence = Math.min(0.99, Math.max(0.1, bestScore));
  const reasoning = bestDetails.length > 0
    ? `Based on your measurements, ${bestSize} is the best fit. ${bestDetails.join(". ")}.`
    : `${bestSize} is the closest match for your body profile.`;

  return {
    recommendedSize: bestSize,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
  };
}
