"use client";

import Link from "next/link";
import { RotateCcw, ShoppingBag, CheckCircle2, Info } from "lucide-react";
import type { BodyProfile, BodyType } from "@/types/body";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Body type metadata ───────────────────────────────────────────────────────
const BODY_TYPE_META: Record<
  BodyType,
  { label: string; icon: string; description: string; color: string; bgColor: string }
> = {
  HOURGLASS: {
    label: "Hourglass",
    icon: "⌛",
    description: "Balanced shoulders and hips with a defined waist.",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
  },
  PEAR: {
    label: "Pear",
    icon: "🍐",
    description: "Narrower shoulders with fuller hips.",
    color: "text-pink-700",
    bgColor: "bg-pink-50 border-pink-200",
  },
  APPLE: {
    label: "Apple",
    icon: "🍎",
    description: "Fuller midsection with slimmer legs.",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
  },
  RECTANGLE: {
    label: "Rectangle",
    icon: "▬",
    description: "Shoulders, waist, and hips in similar proportion.",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  INVERTED_TRIANGLE: {
    label: "Inverted Triangle",
    icon: "🔺",
    description: "Broader shoulders tapering to narrower hips.",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
};

// ─── Measurement ranges (South Asian adult) ───────────────────────────────────
const RANGES: Record<string, { min: number; max: number; unit: string }> = {
  heightCm:       { min: 145, max: 185, unit: "cm" },
  shoulderWidthCm: { min: 75,  max: 115, unit: "cm" },
  bustCm:         { min: 72,  max: 110, unit: "cm" },
  waistCm:        { min: 56,  max: 100, unit: "cm" },
  hipsCm:         { min: 78,  max: 122, unit: "cm" },
};

const MEASUREMENT_LABELS: Record<string, string> = {
  heightCm:       "Height",
  shoulderWidthCm: "Shoulders",
  bustCm:         "Bust",
  waistCm:        "Waist",
  hipsCm:         "Hips",
};

function normalize(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: "High", color: "text-green-600" };
  if (score >= 0.6) return { label: "Medium", color: "text-yellow-600" };
  return { label: "Low", color: "text-orange-600" };
}

// ─── MeasurementRow ───────────────────────────────────────────────────────────
function MeasurementRow({
  label,
  value,
  fieldKey,
}: {
  label: string;
  value: number | null;
  fieldKey: string;
}) {
  if (value === null) return null;
  const range = RANGES[fieldKey];
  const pct = normalize(value, range.min, range.max);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="tabular-nums font-semibold text-gray-900">
          {value.toFixed(1)} {range.unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-2 rounded-full bg-purple-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{range.min}{range.unit}</span>
        <span>{range.max}{range.unit}</span>
      </div>
    </div>
  );
}

// ─── BodyAnalysisCard ─────────────────────────────────────────────────────────
interface Props {
  profile: BodyProfile;
}

export default function BodyAnalysisCard({ profile }: Props) {
  const meta = profile.bodyType ? BODY_TYPE_META[profile.bodyType] : null;
  const conf = profile.bodyType ? confidenceLabel(0.85) : null; // placeholder

  const measurements: [string, keyof BodyProfile][] = [
    ["Height", "heightCm"],
    ["Shoulders", "shoulderWidthCm"],
    ["Bust", "bustCm"],
    ["Waist", "waistCm"],
    ["Hips", "hipsCm"],
  ];

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* ── Success banner ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Analysis complete — here are your measurements!
      </div>

      {/* ── Body type ───────────────────────────────────────────────────────── */}
      {meta && (
        <Card className={cn("border-2", meta.bgColor)}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl leading-none">{meta.icon}</div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-0.5">
                  Your body type
                </p>
                <h2 className={cn("text-2xl font-bold", meta.color)}>{meta.label}</h2>
                <p className="text-sm text-gray-600 mt-1">{meta.description}</p>
              </div>
              {conf && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">Confidence</p>
                  <p className={cn("font-semibold text-sm", conf.color)}>{conf.label}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Measurements ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Your Measurements
            <Info className="h-4 w-4 text-gray-400" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {measurements.map(([label, field]) => (
            <MeasurementRow
              key={field}
              label={label}
              value={profile[field] as number | null}
              fieldKey={field}
            />
          ))}
          <p className="text-xs text-gray-400 pt-1">
            These are estimates from AI analysis. Bars show where you fall in the typical adult range.
          </p>
        </CardContent>
      </Card>

      {/* ── CTAs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Link href="/upload" className="flex-1">
          <Button variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Re-upload photo
          </Button>
        </Link>
        <Link href="/shop" className="flex-1">
          <Button className="w-full">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Continue to Shop
          </Button>
        </Link>
      </div>
    </div>
  );
}
