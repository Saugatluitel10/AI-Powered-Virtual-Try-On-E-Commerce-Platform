"use client";

import { useQuery } from "@tanstack/react-query";
import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import api from "@/lib/api";
import type { MeasurementHistoryEntry } from "@/types/body";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  heightCm: "Height",
  bustCm: "Bust",
  waistCm: "Waist",
  hipsCm: "Hips",
  shoulderWidthCm: "Shoulders",
};

function TrendIcon({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return <Minus className="h-3 w-3 text-gray-400" />;
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return <Minus className="h-3 w-3 text-gray-400" />;
  if (diff > 0) return <TrendingUp className="h-3 w-3 text-blue-500" />;
  return <TrendingDown className="h-3 w-3 text-purple-500" />;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MeasurementHistory() {
  const { data: history, isLoading } = useQuery<MeasurementHistoryEntry[]>({
    queryKey: ["measurement-history"],
    queryFn: async () => {
      const res = await api.get<{ data: MeasurementHistoryEntry[] }>("/users/me/measurement-history");
      return res.data.data;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading history...
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Measurement History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Upload your photo again in the future to track how your measurements change over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latest = history[0];
  const previous = history[1];

  const fields: (keyof MeasurementHistoryEntry)[] = [
    "heightCm",
    "bustCm",
    "waistCm",
    "hipsCm",
    "shoulderWidthCm",
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Measurement History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 font-medium border-b pb-2">
          <span>Measurement</span>
          <span className="text-right">Current</span>
          <span className="text-right">Previous</span>
        </div>
        {fields.map((field) => {
          const cur = latest[field] as number | null;
          const prev = previous[field] as number | null;
          const label = LABELS[field];
          if (!label) return null;

          return (
            <div key={field} className="grid grid-cols-3 gap-2 text-sm items-center">
              <div className="flex items-center gap-1.5">
                <TrendIcon current={cur} previous={prev} />
                <span className="font-medium text-gray-700">{label}</span>
              </div>
              <span className="text-right tabular-nums font-semibold">
                {cur !== null ? `${cur.toFixed(1)} cm` : "—"}
              </span>
              <span className="text-right tabular-nums text-gray-500">
                {prev !== null ? `${prev.toFixed(1)} cm` : "—"}
              </span>
            </div>
          );
        })}
        <div className="pt-2 border-t text-xs text-gray-400 flex justify-between">
          <span>Current: {formatDate(latest.createdAt)}</span>
          <span>Previous: {formatDate(previous.createdAt)}</span>
        </div>
        {history.length > 2 && (
          <p className="text-xs text-gray-400">
            {history.length} measurements recorded in total.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
