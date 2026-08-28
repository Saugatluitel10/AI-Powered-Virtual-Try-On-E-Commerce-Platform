"use client";

import Image from "next/image";
import { Camera, ImageUp, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/catalog/ProductCard";
import { DEMO_PRODUCTS } from "@/data/demo-products";
import {
  analyzePixelSample,
  recommendationReason,
  recommendProducts,
  resolveProductSection,
  suggestSectionFromSource,
  validatePhotoFile,
  type SectionChoice,
  type StyleAnalysis,
} from "@/lib/style-matching";

const OCCASIONS = ["casual", "formal", "streetwear", "outdoor"];
const CAMERA_TIMEOUT_MS = 8_000;

export default function StylistPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [image, setImage] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [sectionChoice, setSectionChoice] = useState<SectionChoice>("auto");
  const [occasion, setOccasion] = useState("casual");

  const effectiveSection = analysis ? resolveProductSection(sectionChoice, analysis) : "unisex";
  const recommendations = useMemo(
    () => (analysis ? recommendProducts(DEMO_PRODUCTS, analysis, sectionChoice, occasion) : []),
    [analysis, occasion, sectionChoice],
  );

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraLoading(false);
    setVideoReady(false);
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return;

    let active = true;
    video.srcObject = stream;
    const previewTimeout = window.setTimeout(() => {
      if (!active) return;
      stream.getTracks().forEach((track) => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      video.srcObject = null;
      setCameraOpen(false);
      setVideoReady(false);
      setError("The camera opened but no video appeared. Reopen it or upload a photo instead.");
    }, CAMERA_TIMEOUT_MS);

    const markPreviewReady = () => {
      if (
        active &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        window.clearTimeout(previewTimeout);
        setVideoReady(true);
      }
    };

    const startPreview = async () => {
      try {
        await video.play();
        markPreviewReady();
      } catch {
        window.clearTimeout(previewTimeout);
        setError("The camera preview could not start. Try closing and reopening it.");
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) void startPreview();
    else video.addEventListener("loadedmetadata", startPreview, { once: true });
    video.addEventListener("loadeddata", markPreviewReady);
    video.addEventListener("canplay", markPreviewReady);

    return () => {
      active = false;
      window.clearTimeout(previewTimeout);
      video.removeEventListener("loadedmetadata", startPreview);
      video.removeEventListener("loadeddata", markPreviewReady);
      video.removeEventListener("canplay", markPreviewReady);
    };
  }, [cameraOpen]);

  async function openCamera() {
    closeCamera();
    setImage("");
    setSourceName("");
    setError("");
    setAnalysis(null);
    setCameraLoading(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is unavailable in this browser. You can upload a photo instead.");
      setCameraLoading(false);
      return;
    }

    try {
      const stream = await requestCamera({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setCameraLoading(false);
    } catch (reason) {
      const denied = reason instanceof DOMException && reason.name === "NotAllowedError";
      const timedOut = reason instanceof Error && reason.message === "Camera permission request timed out.";
      setError(
        timedOut
          ? "Camera permission is still waiting. Allow it in the browser, try again, or upload a photo instead."
          : denied
          ? "Camera permission was denied. Allow camera access or upload a photo instead."
          : "The camera could not be opened. Check that another app is not using it.",
      );
      setCameraLoading(false);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!videoReady || !video?.videoWidth || !video.videoHeight) {
      setError("Camera is still starting. Try capture again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("The camera frame could not be captured. Upload a photo instead.");
      return;
    }
    context.drawImage(video, 0, 0);
    setImage(canvas.toDataURL("image/jpeg", 0.86));
    setSourceName("camera-capture.jpg");
    setAnalysis(null);
    setError("");
    closeCamera();
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    closeCamera();
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setSourceName(file.name);
      setAnalysis(null);
      setError("");
    };
    reader.onerror = () => setError("The image could not be read.");
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function analyze() {
    if (!image) return;
    setAnalyzing(true);
    setError("");
    try {
      const result = await analyzeImage(image, occasion, sourceName);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAnalysis(result);
    } catch {
      setError("This image could not be analyzed. Try a different photo.");
    } finally {
      setAnalyzing(false);
    }
  }

  const suggestedLabel = sectionLabel(analysis?.suggestedSection ?? "unisex");
  const activeLabel = sectionLabel(effectiveSection).toLocaleLowerCase();

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase text-[#b61f32]">AI-assisted, locally powered</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Find clothes that work with your photo.</h1>
        <p className="mt-4 text-neutral-600">
          Your image stays in this browser. Local colour analysis and catalogue matching produce recommendations
          without a paid AI service.
        </p>
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="border border-black/10 bg-white p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={openCamera}
              disabled={cameraLoading}
              className="flex min-h-24 flex-col items-center justify-center gap-2 border border-black bg-black text-sm font-bold uppercase text-white disabled:opacity-60"
            >
              <Camera /> Use camera
            </button>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-black text-sm font-bold uppercase">
              <ImageUp /> Upload photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="sr-only" />
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </p>
          )}
          {cameraLoading && (
            <p className="mt-5 flex items-center gap-2 border border-black/10 bg-neutral-50 p-4 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Waiting for camera permission...
            </p>
          )}

          {cameraOpen && (
            <div className="mt-6">
              <div className="relative aspect-[4/3] overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                {!videoReady && (
                  <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-white">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Starting camera preview...
                    </span>
                  </div>
                )}
                <button
                  onClick={closeCamera}
                  className="absolute right-3 top-3 grid h-10 w-10 place-items-center bg-white"
                  aria-label="Close camera"
                >
                  <X />
                </button>
              </div>
              <button
                onClick={capture}
                disabled={!videoReady}
                className="mt-3 w-full bg-[#b61f32] px-5 py-4 text-sm font-bold uppercase text-white disabled:opacity-50"
              >
                Capture photo
              </button>
            </div>
          )}

          {image && !cameraOpen && (
            <div className="mt-6">
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                <Image src={image} alt="Selected for style analysis" fill unoptimized className="object-contain" />
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => {
                    setImage("");
                    setSourceName("");
                    setAnalysis(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 border border-black px-4 py-3 text-xs font-bold uppercase"
                >
                  <RefreshCw className="h-4 w-4" /> Replace
                </button>
                <button
                  onClick={analyze}
                  disabled={analyzing}
                  className="flex flex-[2] items-center justify-center gap-2 bg-[#b61f32] px-4 py-3 text-xs font-bold uppercase text-white disabled:opacity-60"
                >
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? "Analyzing" : "Analyze & match"}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="border border-black/10 bg-[#20231f] p-6 text-white">
          <h2 className="font-display text-2xl">Match preferences</h2>
          <label className="mt-6 block text-xs font-bold uppercase text-white/70">
            Catalogue section
            <select
              value={sectionChoice}
              onChange={(event) => setSectionChoice(event.target.value as SectionChoice)}
              className="mt-2 h-11 w-full border border-white/30 bg-[#20231f] px-3 text-sm text-white"
            >
              <option value="auto">Automatic suggestion</option>
              <option value="mens">Men</option>
              <option value="womens">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </label>
          <label className="mt-5 block text-xs font-bold uppercase text-white/70">
            Occasion
            <select
              value={occasion}
              onChange={(event) => setOccasion(event.target.value)}
              className="mt-2 h-11 w-full border border-white/30 bg-[#20231f] px-3 text-sm capitalize text-white"
            >
              {OCCASIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          {analysis && (
            <div className="mt-7 border-t border-white/20 pt-6">
              <p className="text-xs font-bold uppercase text-[#f08d98]">Photo analysis</p>
              <dl className="mt-3 space-y-2 text-sm">
                <Result label="Dominant colour" value={analysis.color} />
                <Result label="Overall tone" value={analysis.tone} />
                <Result label="Selected occasion" value={occasion} />
                <Result label="Suggested section" value={suggestedLabel} />
                <Result label="Active section" value={sectionLabel(effectiveSection)} />
              </dl>
              {sectionChoice === "auto" && analysis.sectionConfidence === "low" && (
                <p className="mt-4 border border-white/20 bg-white/5 p-3 text-xs leading-relaxed text-white/80">
                  {analysis.sectionReason} Choose Men or Women above when you want that section specifically.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      {analysis && (
        <section className="mt-14" aria-live="polite">
          <p className="text-xs font-bold uppercase text-[#b61f32]">Your recommendations</p>
          <h2 className="mt-2 font-display text-3xl">Matched from the local catalogue</h2>
          <p className="mt-3 max-w-3xl text-sm text-neutral-600">
            The photo has {analysis.tone}, {analysis.color} tones. Results are ranked for the {occasion} occasion and
            strictly limited to {activeLabel} catalogue products.
          </p>
          {recommendations.length ? (
            <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">
              {recommendations.map(({ product }) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  reason={recommendationReason(product, analysis, occasion)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-7 border border-black/10 bg-neutral-50 p-5 text-sm">
              No catalogue products match these preferences. Change the section or occasion and try again.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

async function analyzeImage(source: string, preferredStyle: string, sourceName: string): Promise<StyleAnalysis> {
  const image = document.createElement("img");
  image.src = source;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 40;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0, 40, 40);

  const pixelAnalysis = analyzePixelSample(context.getImageData(0, 0, 40, 40));
  return {
    ...pixelAnalysis,
    style: preferredStyle,
    ...suggestSectionFromSource(sourceName),
  };
}

function requestCamera(constraints: MediaStreamConstraints) {
  return new Promise<MediaStream>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      reject(new Error("Camera permission request timed out."));
    }, CAMERA_TIMEOUT_MS);

    navigator.mediaDevices.getUserMedia(constraints).then(
      (stream) => {
        if (settled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        resolve(stream);
      },
      (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function sectionLabel(section: "mens" | "womens" | "unisex") {
  if (section === "mens") return "Men";
  if (section === "womens") return "Women";
  return "Unisex";
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-white/70">{label}</dt>
      <dd className="text-right capitalize">{value}</dd>
    </div>
  );
}
