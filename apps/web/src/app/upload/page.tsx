"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Camera, Upload, ChevronRight, AlertCircle, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/posthog";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const MIN_WIDTH = 400;
const MIN_HEIGHT = 600;

const TIPS = [
  "Stand upright facing the camera",
  "Make sure your full body is visible from head to toe",
  "Use a plain, light-coloured background",
  "Wear form-fitting clothes for accurate measurements",
  "Ensure good, even lighting with no harsh shadows",
  "Keep your arms slightly away from your sides",
];

type Step = 1 | 2 | 3;

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/upload");
  }, [loading, user, router]);

  useEffect(() => () => stopCamera(), []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  async function validateFile(f: File): Promise<string | null> {
    if (!ALLOWED_TYPES.includes(f.type)) return "Only JPEG and PNG images are accepted.";
    if (f.size > MAX_BYTES)
      return `File is ${(f.size / 1024 / 1024).toFixed(1)} MB — maximum is 10 MB.`;

    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.naturalWidth < MIN_WIDTH || img.naturalHeight < MIN_HEIGHT) {
          resolve(
            `Image must be at least ${MIN_WIDTH}×${MIN_HEIGHT}px (yours is ${img.naturalWidth}×${img.naturalHeight}px).`
          );
        } else {
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("Could not read the image file.");
      };
      img.src = url;
    });
  }

  async function applyFile(f: File) {
    setValidationError(null);
    const err = await validateFile(f);
    if (err) {
      setValidationError(err);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) applyFile(accepted[0]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxFiles: 1,
    onDropAccepted: onDrop,
    onDropRejected: () => setValidationError("Only JPEG and PNG files are accepted."),
  });

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } catch {
      setValidationError(
        "Camera access denied. Please allow camera permission or upload a file instead."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        applyFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  function resetSelection() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setValidationError(null);
    stopCamera();
  }

  async function handleUpload() {
    if (!file) return;
    setUploadError(null);
    setProgress(0);
    setStep(3);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const { data } = await api.post("/users/me/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total ?? file.size));
          setProgress(Math.min(pct, 95));
        },
      });
      setProgress(100);
      trackEvent("photo_uploaded", { jobId: data.data.jobId });
      setTimeout(() => router.push(`/analysis?jobId=${data.data.jobId}`), 700);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Upload failed. Please try again.";
      setUploadError(message);
      setStep(2);
      setProgress(0);
    }
  }

  if (loading) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      <StepIndicator current={step} />

      {/* Step 1: Instructions */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-semibold">Prepare your photo</h1>
              <p className="text-sm text-muted-foreground">
                A good photo helps our AI measure you accurately and find your perfect fit.
              </p>
            </div>

            <ul className="space-y-3" role="list" aria-label="Photo tips">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 rounded-lg bg-muted p-3 sm:p-4 text-center text-xs">
              <div className="space-y-2">
                <div className="h-24 sm:h-28 rounded-md bg-green-100 flex items-center justify-center text-4xl" role="img" aria-label="Good photo example: full body with plain background">
                  🧍
                </div>
                <p className="text-green-700 font-medium">✓ Full body, plain background</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 sm:h-28 rounded-md bg-red-100 flex items-center justify-center text-4xl" role="img" aria-label="Bad photo example: cropped or cluttered">
                  🤳
                </div>
                <p className="text-red-600 font-medium">✗ Cropped or cluttered</p>
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep(2)}>
              Got it — choose photo
              <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: File picker / camera */}
      {step === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-semibold">Upload your photo</h1>
              <p className="text-sm text-muted-foreground">
                JPEG or PNG · max 10 MB · min 400 × 600 px
              </p>
            </div>

            {(validationError || uploadError) && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                {validationError ?? uploadError}
              </div>
            )}

            {cameraActive && (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg bg-black aspect-[3/4] object-cover"
                  autoPlay
                  muted
                  playsInline
                  aria-label="Camera preview"
                />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={capturePhoto} aria-label="Capture photo from camera">
                    <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
                    Capture
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!cameraActive && preview && (
              <div className="space-y-3">
                <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={preview}
                    alt="Your photo preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <Button variant="outline" className="w-full" onClick={resetSelection}>
                  <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Choose a different photo
                </Button>
              </div>
            )}

            {!cameraActive && !preview && (
              <div className="space-y-3">
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 sm:p-10 text-center cursor-pointer transition-colors select-none",
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/30 hover:border-primary hover:bg-muted/50"
                  )}
                  role="button"
                  aria-label="Drop zone — drag and drop or click to select a photo"
                  tabIndex={0}
                >
                  <input {...getInputProps()} aria-label="File input for photo upload" />
                  <Upload className="h-9 w-9 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-medium">
                    {isDragActive ? "Drop your photo here" : "Drag & drop or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG or PNG · max 10 MB</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
                  <div className="flex-1 h-px bg-border" />
                  or
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button variant="outline" className="w-full" onClick={startCamera}>
                  <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
                  Use camera
                </Button>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => { resetSelection(); setStep(1); }}>
                Back
              </Button>
              <Button className="flex-1" disabled={!file} onClick={handleUpload}>
                Upload photo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Progress */}
      {step === 3 && (
        <Card>
          <CardContent className="pt-6 space-y-6 text-center">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-semibold">
                {progress < 100 ? "Uploading your photo…" : "Upload complete!"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {progress < 100
                  ? "Please keep this page open while we upload."
                  : "Redirecting to your analysis…"}
              </p>
            </div>

            <div className="space-y-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm font-medium tabular-nums">{progress}%</p>
            </div>

            {progress === 100 && (
              <div className="flex justify-center" role="status" aria-label="Upload complete">
                <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: [Step, string][] = [
    [1, "Instructions"],
    [2, "Choose photo"],
    [3, "Uploading"],
  ];

  return (
    <nav aria-label="Upload progress" className="flex items-center">
      {steps.map(([n, label], i) => {
        const done = current > n;
        const active = current === n;
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold",
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${n} of 3: ${label}${done ? " (complete)" : active ? " (current)" : ""}`}
              >
                {done ? "✓" : n}
              </div>
              <span
                className={cn(
                  "text-xs hidden sm:block",
                  active ? "font-medium" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px bg-border mx-2 hidden sm:block" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
