"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Image from "next/image";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";

type Status = "idle" | "uploading" | "processing" | "completed" | "failed";

function EmbedContent() {
  const params = useSearchParams();
  const productId = params.get("productId") ?? "";
  const apiKey = params.get("apiKey") ?? "";
  const theme = params.get("theme") ?? "light";

  const [status, setStatus] = useState<Status>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !apiKey || !productId) return;

    setStatus("uploading");
    setError(null);

    try {
      const objectUrl = URL.createObjectURL(file);

      setStatus("processing");

      const res = await fetch("/api/v1/public/tryon", {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ productId, userPhotoUrl: objectUrl }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Try-on failed");
      }

      const { data } = await res.json();

      const poll = async () => {
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const statusRes = await fetch(`/api/v1/public/tryon/${data.jobId}`, {
            headers: { "X-API-Key": apiKey },
          });
          const statusData = await statusRes.json();

          if (statusData.data.status === "completed") {
            setResultUrl(statusData.data.resultImageUrl);
            setStatus("completed");
            window.parent.postMessage({
              source: "vtryon-widget",
              type: "tryon-result",
              resultImageUrl: statusData.data.resultImageUrl,
              sizeRecommended: statusData.data.sizeRecommended,
            }, "*");
            return;
          }

          if (statusData.data.status === "failed") {
            throw new Error(statusData.data.errorMessage ?? "Try-on failed");
          }
        }
        throw new Error("Try-on timed out");
      };

      await poll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setStatus("failed");
      window.parent.postMessage({
        source: "vtryon-widget",
        type: "tryon-error",
        message: msg,
      }, "*");
    }
  }

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen p-4 flex flex-col items-center justify-center ${isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      {status === "idle" && (
        <div className="text-center space-y-4">
          <Upload className="w-12 h-12 mx-auto text-purple-500" />
          <p className="font-medium">Upload your photo to try on this item</p>
          <label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 cursor-pointer">
              Choose Photo
            </span>
          </label>
        </div>
      )}

      {(status === "uploading" || status === "processing") && (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-purple-500 animate-spin" />
          <p className="font-medium">
            {status === "uploading" ? "Uploading..." : "AI is creating your try-on..."}
          </p>
          <p className="text-sm text-gray-500">This takes about 30–60 seconds</p>
        </div>
      )}

      {status === "completed" && resultUrl && (
        <div className="text-center space-y-4">
          <div className="relative w-64 h-80 rounded-xl overflow-hidden shadow-lg mx-auto">
            <Image src={resultUrl} alt="Try-on result" fill className="object-cover" />
          </div>
          <div className="flex items-center justify-center gap-2 text-green-500">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Try-on complete</span>
          </div>
          <label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center rounded-md border border-gray-300 text-sm font-medium px-4 py-2 cursor-pointer hover:bg-gray-50">
              Try another photo
            </span>
          </label>
        </div>
      )}

      {status === "failed" && (
        <div className="text-center space-y-4">
          <XCircle className="w-12 h-12 mx-auto text-red-400" />
          <p className="font-medium">Try-on failed</p>
          <p className="text-sm text-red-500">{error}</p>
          <label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 cursor-pointer">
              Try again
            </span>
          </label>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400">
        Powered by <a href="https://vtryon.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">VTryon</a>
      </p>
    </div>
  );
}

export default function EmbedTryOnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>}>
      <EmbedContent />
    </Suspense>
  );
}
