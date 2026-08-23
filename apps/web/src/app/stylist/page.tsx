"use client";

import Image from "next/image";
import { Camera, ImageUp, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/catalog/ProductCard";
import { DEMO_PRODUCTS } from "@/data/demo-products";
import type { Product } from "@/types/product";

type ProductGender = "mens" | "womens" | "unisex";
type GenderChoice = "auto" | ProductGender;
type Analysis = { color: string; tone: string; style: string; suggestedGender: ProductGender; genderConfidence: "high" | "low" };

export default function StylistPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [image, setImage] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [gender, setGender] = useState<GenderChoice>("auto");
  const [occasion, setOccasion] = useState("casual");

  const effectiveGender = gender === "auto" ? analysis?.suggestedGender ?? "unisex" : gender;
  const recommendations = useMemo(() => {
    if (!analysis) return [];
    const eligible = effectiveGender === "unisex" ? DEMO_PRODUCTS : DEMO_PRODUCTS.filter((product) => product.gender === effectiveGender);
    return eligible.map((product) => ({ product, score: scoreProduct(product, analysis, occasion) })).sort((a, b) => b.score - a.score).slice(0, 6).map(({ product }) => product);
  }, [analysis, effectiveGender, occasion]);

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraLoading(false);
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return;
    video.srcObject = stream;
    const startPreview = () => video.play().catch(() => setError("The camera preview could not start. Try closing and reopening it."));
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) startPreview();
    else video.addEventListener("loadedmetadata", startPreview, { once: true });
    return () => video.removeEventListener("loadedmetadata", startPreview);
  }, [cameraOpen]);

  async function openCamera() {
    closeCamera();
    setImage(""); setSourceName(""); setError(""); setAnalysis(null); setCameraLoading(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is unavailable in this browser. You can upload a photo instead."); setCameraLoading(false); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      setCameraLoading(false);
    } catch (reason) {
      const denied = reason instanceof DOMException && reason.name === "NotAllowedError";
      setError(denied ? "Camera permission was denied. Allow camera access or upload a photo instead." : "The camera could not be opened. Check that another app is not using it.");
      setCameraLoading(false);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) { setError("Camera is still starting. Try capture again in a moment."); return; }
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setImage(canvas.toDataURL("image/jpeg", 0.86)); setSourceName("camera-capture"); setAnalysis(null); setError(""); closeCamera();
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG, or WebP image."); event.target.value = ""; return; }
    if (file.size > 6 * 1024 * 1024) { setError("That image is over 6 MB. Choose a smaller photo."); event.target.value = ""; return; }
    closeCamera();
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); setSourceName(file.name); setAnalysis(null); setError(""); };
    reader.onerror = () => setError("The image could not be read."); reader.readAsDataURL(file); event.target.value = "";
  }

  async function analyze() {
    if (!image) return; setAnalyzing(true); setError("");
    try { const result = await analyzeImage(image, occasion, sourceName); await new Promise((resolve) => setTimeout(resolve, 500)); setAnalysis(result); }
    catch { setError("This image could not be analyzed. Try a different photo."); }
    finally { setAnalyzing(false); }
  }

  const detectedLabel = analysis?.suggestedGender === "mens" ? "Men" : analysis?.suggestedGender === "womens" ? "Women" : "Any section";
  const activeLabel = effectiveGender === "mens" ? "men's" : effectiveGender === "womens" ? "women's" : "all";

  return <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-8">
    <div className="max-w-3xl"><p className="text-xs font-bold uppercase text-[#b61f32]">AI-assisted, locally powered</p><h1 className="mt-2 font-display text-4xl sm:text-5xl">Find clothes that work with your photo.</h1><p className="mt-4 text-neutral-600">Your image stays in this browser. Basic image analysis and catalogue matching produce recommendations without a paid AI service.</p></div>
    <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="border border-black/10 bg-white p-5 sm:p-7">
        <div className="grid grid-cols-2 gap-3"><button onClick={openCamera} disabled={cameraLoading} className="flex min-h-24 flex-col items-center justify-center gap-2 border border-black bg-black text-sm font-bold uppercase text-white disabled:opacity-60"><Camera /> Use camera</button><label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-black text-sm font-bold uppercase"><ImageUp /> Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="sr-only" /></label></div>
        {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {cameraLoading && <p className="mt-5 flex items-center gap-2 border border-black/10 bg-neutral-50 p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for camera permission...</p>}
        {cameraOpen && <div className="mt-6"><div className="relative aspect-[4/3] overflow-hidden bg-black"><video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" /><button onClick={closeCamera} className="absolute right-3 top-3 grid h-10 w-10 place-items-center bg-white" aria-label="Close camera"><X /></button></div><button onClick={capture} className="mt-3 w-full bg-[#b61f32] px-5 py-4 text-sm font-bold uppercase text-white">Capture photo</button></div>}
        {image && !cameraOpen && <div className="mt-6"><div className="relative aspect-[4/3] overflow-hidden bg-neutral-100"><Image src={image} alt="Selected for style analysis" fill unoptimized className="object-contain" /></div><div className="mt-3 flex gap-3"><button onClick={() => { setImage(""); setSourceName(""); setAnalysis(null); }} className="flex flex-1 items-center justify-center gap-2 border border-black px-4 py-3 text-xs font-bold uppercase"><RefreshCw className="h-4 w-4" /> Replace</button><button onClick={analyze} disabled={analyzing} className="flex flex-[2] items-center justify-center gap-2 bg-[#b61f32] px-4 py-3 text-xs font-bold uppercase text-white disabled:opacity-60">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {analyzing ? "Analyzing" : "Analyze & match"}</button></div></div>}
      </section>
      <aside className="border border-black/10 bg-[#20231f] p-6 text-white"><h2 className="font-display text-2xl">Match preferences</h2><label className="mt-6 block text-xs font-bold uppercase text-white/70">Shopping for<select value={gender} onChange={(event) => setGender(event.target.value as GenderChoice)} className="mt-2 h-11 w-full border border-white/30 bg-[#20231f] px-3 text-sm text-white"><option value="auto">Automatic from photo</option><option value="mens">Men</option><option value="womens">Women</option><option value="unisex">Any section</option></select></label><label className="mt-5 block text-xs font-bold uppercase text-white/70">Occasion<select value={occasion} onChange={(event) => setOccasion(event.target.value)} className="mt-2 h-11 w-full border border-white/30 bg-[#20231f] px-3 text-sm capitalize text-white"><option>casual</option><option>formal</option><option>traditional</option><option>streetwear</option><option>outdoor</option></select></label>{analysis && <div className="mt-7 border-t border-white/20 pt-6"><p className="text-xs font-bold uppercase text-[#e96b72]">Photo analysis</p><dl className="mt-3 space-y-2 text-sm"><Result label="Dominant color" value={analysis.color} /><Result label="Overall tone" value={analysis.tone} /><Result label="Suggested style" value={occasion} /><Result label="Detected section" value={detectedLabel} /></dl>{gender === "auto" && analysis.genderConfidence === "low" && <p className="mt-4 text-xs leading-relaxed text-white/60">No reliable gender cue was available locally, so all sections are included. Choose Men or Women above for strict results.</p>}</div>}</aside>
    </div>
    {analysis && <section className="mt-14"><p className="text-xs font-bold uppercase text-[#b61f32]">Your recommendations</p><h2 className="mt-2 font-display text-3xl">Matched from the local catalogue</h2><p className="mt-3 max-w-3xl text-sm text-neutral-600">The photo has {analysis.tone}, {analysis.color} tones. Results are recalculated for the {occasion} occasion and strictly limited to {activeLabel} catalogue products.</p>{recommendations.length ? <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">{recommendations.map((product) => <ProductCard key={product.id} product={product} reason={`${product.style === occasion ? `${occasion} style match` : "Versatile occasion match"}; ${product.color === analysis.color ? "strong color harmony" : "balanced color pairing"}.`} />)}</div> : <p className="mt-7 border border-black/10 bg-neutral-50 p-5 text-sm">No catalogue products match these preferences. Change the section or occasion and try again.</p>}</section>}
  </div>;
}

async function analyzeImage(source: string, preferredStyle: string, sourceName: string): Promise<Analysis> {
  const image = document.createElement("img"); image.src = source; await image.decode();
  const canvas = document.createElement("canvas"); canvas.width = 40; canvas.height = 40;
  const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0, 40, 40); const pixels = context.getImageData(0, 0, 40, 40).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let index = 0; index < pixels.length; index += 16) { if (pixels[index + 3] < 100) continue; r += pixels[index]; g += pixels[index + 1]; b += pixels[index + 2]; count++; }
  if (!count) throw new Error("No visible pixels");
  r /= count; g /= count; b /= count; const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  let color = "neutral";
  if (b > r * 1.15 && b > g * 1.05) color = "blue"; else if (r > g * 1.2 && r > b * 1.15) color = r > 170 ? "coral" : "rust"; else if (g > r * 1.08 && g > b * 1.05) color = "olive"; else if (lightness < 65) color = "black"; else if (lightness > 195) color = "white";
  return { color, tone: lightness < 90 ? "deep" : lightness > 175 ? "light" : "balanced", style: preferredStyle, ...estimateGenderSection(sourceName) };
}

function estimateGenderSection(sourceName: string): Pick<Analysis, "suggestedGender" | "genderConfidence"> {
  const name = sourceName.toLowerCase();
  if (/(woman|women|female|girl|lady)/.test(name)) return { suggestedGender: "womens", genderConfidence: "high" };
  if (/(^|[^a-z])(man|men|male|boy|gentleman)([^a-z]|$)/.test(name)) return { suggestedGender: "mens", genderConfidence: "high" };
  return { suggestedGender: "unisex", genderConfidence: "low" };
}

function scoreProduct(product: Product, analysis: Analysis, occasion: string) {
  let score = 0;
  if (product.style === occasion) score += 5; if (product.color === analysis.color) score += 4;
  if (analysis.tone === "deep" && ["black", "navy", "charcoal", "emerald"].includes(product.color)) score += 2;
  if (analysis.tone === "light" && ["white", "ivory", "coral", "sage"].includes(product.color)) score += 2;
  score += (Number(product.id.replace("demo-", "")) % 5) / 10; return score;
}

function Result({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><dt className="text-white/60">{label}</dt><dd className="text-right capitalize">{value}</dd></div>; }
