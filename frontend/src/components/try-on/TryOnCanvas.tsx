"use client";

import Image from "next/image";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import type { TryOnSession } from "@/types/order";
import { cn, getStatusColor } from "@/lib/utils";

interface TryOnCanvasProps {
  session: TryOnSession | null;
  isLoading?: boolean;
}

export default function TryOnCanvas({ session, isLoading }: TryOnCanvasProps) {
  if (isLoading || (session && session.status === "queued")) {
    return (
      <div className="aspect-[3/4] rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <div className="text-center">
          <p className="font-medium text-gray-900">Creating your try-on...</p>
          <p className="text-sm text-gray-500 mt-1">This takes about 30–60 seconds</p>
        </div>
      </div>
    );
  }

  if (session?.status === "processing") {
    return (
      <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
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
      <div className="aspect-[3/4] rounded-2xl bg-red-50 border border-red-200 flex flex-col items-center justify-center gap-4">
        <XCircle className="w-10 h-10 text-red-400" />
        <div className="text-center">
          <p className="font-medium text-gray-900">Try-on failed</p>
          <p className="text-sm text-gray-500 mt-1">{session.error_message || "Please try again"}</p>
        </div>
      </div>
    );
  }

  if (session?.status === "completed" && session.result_image_url) {
    return (
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xl">
        <Image
          src={session.result_image_url}
          alt="Virtual try-on result"
          fill
          className="object-cover"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
          <CheckCircle className="w-3.5 h-3.5" />
          Try-on complete
        </div>
        {session.processing_time_ms && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {(session.processing_time_ms / 1000).toFixed(1)}s
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="aspect-[3/4] rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
      <p className="text-gray-400 text-sm">Your try-on result will appear here</p>
    </div>
  );
}
