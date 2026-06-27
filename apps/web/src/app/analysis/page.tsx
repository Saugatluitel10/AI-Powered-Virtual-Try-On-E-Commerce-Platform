"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import { trackEvent } from "@/lib/posthog";
import type { BodyProfile } from "@/types/body";
import { useBodyProfileStore } from "@/store/bodyProfileStore";
import BodyAnalysisCard from "@/components/body-analysis/BodyAnalysisCard";
import MeasurementHistory from "@/components/body-analysis/MeasurementHistory";
import { Button } from "@/components/ui/button";

const TIMEOUT_MS = 90_000; // 90 seconds

// ─── Spinner animation ────────────────────────────────────────────────────────
function AnalysisSpinner() {
  const steps = [
    "Extracting body landmarks…",
    "Estimating measurements…",
    "Classifying body type…",
    "Finalising results…",
  ];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setStepIdx((i) => (i + 1) % steps.length),
      2500
    );
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      {/* Animated ring */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🧍</div>
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-gray-900">Analysing your body…</p>
        <p className="text-sm text-muted-foreground min-h-[1.25rem] transition-all">
          {steps[stepIdx]}
        </p>
      </div>
      <p className="text-xs text-gray-400 max-w-xs">
        Our AI is measuring your body from the photo. This takes about 10–20 seconds.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setProfile } = useBodyProfileStore();
  const startTime = useRef(Date.now());
  const [timedOut, setTimedOut] = useState(false);

  // Timeout guard
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  const { data: profile, error } = useQuery<BodyProfile>({
    queryKey: ["body-profile"],
    queryFn: async () => {
      const res = await api.get<{ data: BodyProfile }>("/users/me/body-profile");
      return res.data.data;
    },
    refetchInterval: (query) => {
      if (query.state.data?.analysisComplete) return false;
      if (Date.now() - startTime.current > TIMEOUT_MS) return false;
      return 3000;
    },
    staleTime: 0,
    retry: 2,
  });

  // Persist to Zustand when analysis completes
  useEffect(() => {
    if (profile?.analysisComplete) {
      setProfile(profile);
      trackEvent("analysis_complete", { bodyType: profile.bodyType });
    }
  }, [profile, setProfile]);

  // ── Timeout state ──────────────────────────────────────────────────────────
  if (timedOut && !profile?.analysisComplete) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
        <h2 className="text-xl font-semibold">Analysis is taking longer than expected</h2>
        <p className="text-sm text-muted-foreground">
          The AI service may be under load. You can check back shortly or re-upload your photo.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => router.push("/upload")}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Re-upload
          </Button>
          <Button onClick={() => { setTimedOut(false); startTime.current = Date.now(); }}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // ── API error state ────────────────────────────────────────────────────────
  if (error && !profile) {
    const is404 =
      (error as { response?: { status?: number } }).response?.status === 404;
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-semibold">
          {is404 ? "No photo uploaded yet" : "Something went wrong"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {is404
            ? "Please upload your photo before viewing your analysis."
            : "We couldn't load your analysis results. Please try again."}
        </p>
        <Button onClick={() => router.push("/upload")}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {is404 ? "Upload a photo" : "Re-upload"}
        </Button>
      </div>
    );
  }

  // ── Completed state ────────────────────────────────────────────────────────
  if (profile?.analysisComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <BodyAnalysisCard profile={profile} />
        <MeasurementHistory />
      </div>
    );
  }

  // ── Loading / polling state ────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto px-4">
      <AnalysisSpinner />
    </div>
  );
}
