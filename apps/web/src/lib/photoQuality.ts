export interface PhotoQualityResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
}

interface PixelStats {
  brightness: number;
  contrast: number;
}

function analyzePixels(imageData: ImageData): PixelStats {
  const { data } = imageData;
  const pixelCount = data.length / 4;

  let totalBrightness = 0;
  const brightnessValues: number[] = new Array(pixelCount);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const idx = i / 4;
    brightnessValues[idx] = luma;
    totalBrightness += luma;
  }

  const meanBrightness = totalBrightness / pixelCount;

  let varianceSum = 0;
  for (let i = 0; i < pixelCount; i++) {
    const diff = brightnessValues[i] - meanBrightness;
    varianceSum += diff * diff;
  }
  const contrast = Math.sqrt(varianceSum / pixelCount);

  return { brightness: meanBrightness, contrast };
}

const MIN_BRIGHTNESS = 60;
const MAX_BRIGHTNESS = 220;
const MIN_CONTRAST = 30;
const MIN_PORTRAIT_RATIO = 1.1;

export function analyzePhotoQuality(file: File): Promise<PhotoQualityResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const warnings: string[] = [];
      const errors: string[] = [];

      const aspectRatio = img.naturalHeight / img.naturalWidth;
      if (aspectRatio < MIN_PORTRAIT_RATIO) {
        errors.push(
          "Photo should be portrait orientation (taller than wide) for full-body analysis."
        );
      }

      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { brightness, contrast } = analyzePixels(imageData);

      if (brightness < MIN_BRIGHTNESS) {
        errors.push(
          "Photo is too dark. Please use better lighting or move to a brighter area."
        );
      } else if (brightness > MAX_BRIGHTNESS) {
        warnings.push(
          "Photo appears overexposed. Try reducing lighting or avoiding direct flash."
        );
      }

      if (contrast < MIN_CONTRAST) {
        warnings.push(
          "Low contrast detected. Wear clothes that contrast with your background for better results."
        );
      }

      resolve({
        passed: errors.length === 0,
        warnings,
        errors,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ passed: true, warnings: [], errors: [] });
    };

    img.src = url;
  });
}
