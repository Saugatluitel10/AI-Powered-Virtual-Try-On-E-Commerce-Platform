"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  ThumbsUp,
  ThumbsDown,
  GripVertical,
} from "lucide-react";
import type { TryOnSession } from "@/types/order";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface TryOnCanvasProps {
  session: TryOnSession | null;
  isLoading?: boolean;
  userPhotoUrl?: string | null;
}

function ComparisonSlider({
  originalUrl,
  resultUrl,
  alt,
}: {
  originalUrl: string;
  resultUrl: string;
  alt: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handlePointerDown = useCallback(() => {
    dragging.current = true;
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden select-none touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Image src={resultUrl} alt={`${alt} - try-on result`} fill className="object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <Image
          src={originalUrl}
          alt={`${alt} - original photo`}
          fill
          className="object-cover"
          style={{ minWidth: `${10000 / position}%` }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        onPointerDown={handlePointerDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg p-1.5">
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>
      </div>
      <div className="absolute top-3 left-3 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
        Original
      </div>
      <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
        Try-on
      </div>
    </div>
  );
}

export default function TryOnCanvas({ session, isLoading, userPhotoUrl }: TryOnCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [showComparison, setShowComparison] = useState(false);
  const [feedback, setFeedback] = useState<1 | -1 | null>(null);

  async function handleDownload() {
    if (!session?.resultImageUrl) return;
    try {
      const res = await fetch(session.resultImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tryon-${session.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open in new tab
      window.open(session.resultImageUrl, "_blank");
    }
  }

  async function handleShare() {
    if (!session?.resultImageUrl) return;
    const shareData = {
      title: `Virtual Try-On: ${session.productName}`,
      text: `Check out how I look in ${session.productName}!`,
      url: session.resultImageUrl,
    };

    if (navigator.share) {
      await navigator.share(shareData).catch(() => {});
    } else {
      await navigator.clipboard.writeText(session.resultImageUrl);
    }
  }

  async function handleFeedback(rating: 1 | -1) {
    if (!session) return;
    setFeedback(rating);
    try {
      await api.post(`/try-on/${session.id}/feedback`, { rating });
    } catch {
      // Best effort
    }
  }

  if (isLoading || (session && session.status === "queued")) {
    return (
      <div
        className="aspect-[3/4] rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4"
        role="status"
        aria-live="polite"
        aria-label="Creating your try-on"
      >
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" aria-hidden="true" />
        <div className="text-center">
          <p className="font-medium text-gray-900">Creating your try-on...</p>
          <p className="text-sm text-gray-500 mt-1">This takes about 30-60 seconds</p>
        </div>
      </div>
    );
  }

  if (session?.status === "processing") {
    return (
      <div
        className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 flex flex-col items-center justify-center gap-4"
        role="status"
        aria-live="polite"
        aria-label="AI is fitting the garment"
      >
        <div className="relative">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" aria-hidden="true" />
          <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl opacity-50 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-900">AI is fitting the garment...</p>
          <p className="text-sm text-gray-500 mt-1">Almost there!</p>
        </div>
      </div>
    );
  }

  if (session?.status === "failed") {
    return (
      <div
        className="aspect-[3/4] rounded-2xl bg-red-50 border border-red-200 flex flex-col items-center justify-center gap-4"
        role="alert"
      >
        <XCircle className="w-10 h-10 text-red-400" aria-hidden="true" />
        <div className="text-center">
          <p className="font-medium text-gray-900">Try-on failed</p>
          <p className="text-sm text-gray-500 mt-1">{session.errorMessage || "Please try again"}</p>
        </div>
      </div>
    );
  }

  if (session?.status === "completed" && session.resultImageUrl) {
    const canCompare = !!userPhotoUrl;

    return (
      <div className="space-y-3">
        {/* Comparison toggle */}
        {canCompare && (
          <div className="flex gap-2">
            <Button
              variant={showComparison ? "default" : "outline"}
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="text-xs"
            >
              {showComparison ? "Hide comparison" : "Compare with original"}
            </Button>
          </div>
        )}

        {/* Image display */}
        {showComparison && userPhotoUrl ? (
          <ComparisonSlider
            originalUrl={userPhotoUrl}
            resultUrl={session.resultImageUrl}
            alt={session.productName}
          />
        ) : (
          <div
            className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xl"
            role="img"
            aria-label="Virtual try-on result"
          >
            <div
              className="w-full h-full transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            >
              <Image
                src={session.resultImageUrl}
                alt="Virtual try-on result showing you wearing the selected garment"
                fill
                className="object-cover"
              />
            </div>
            <div
              className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-full"
              aria-hidden="true"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Try-on complete
            </div>
            {session.processingTimeMs && (
              <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {(session.processingTimeMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom */}
          {!showComparison && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                aria-label="Zoom out"
                disabled={zoom <= 1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </>
          )}

          <div className="flex-1" />

          {/* Download */}
          <Button variant="outline" size="sm" className="text-xs" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>

          {/* Share */}
          <Button variant="outline" size="sm" className="text-xs" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Share
          </Button>

          {/* Feedback */}
          <div className="flex items-center gap-1 border rounded-lg px-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", feedback === 1 && "text-green-600 bg-green-50")}
              onClick={() => handleFeedback(1)}
              aria-label="Rate good"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", feedback === -1 && "text-red-600 bg-red-50")}
              onClick={() => handleFeedback(-1)}
              aria-label="Rate bad"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="aspect-[3/4] rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center"
      aria-label="Try-on result placeholder"
    >
      <p className="text-gray-400 text-sm">Your try-on result will appear here</p>
    </div>
  );
}
