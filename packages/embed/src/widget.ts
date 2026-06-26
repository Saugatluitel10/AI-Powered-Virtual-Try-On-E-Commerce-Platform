interface VTryonWidgetConfig {
  apiKey: string;
  productId: string;
  container: string | HTMLElement;
  baseUrl?: string;
  theme?: "light" | "dark";
  locale?: "en" | "ne" | "hi";
  onResult?: (result: { resultImageUrl: string; sizeRecommended: string | null }) => void;
  onError?: (error: string) => void;
}

const DEFAULT_BASE = "https://app.vtryon.com";

function mount(config: VTryonWidgetConfig) {
  const container =
    typeof config.container === "string"
      ? document.querySelector(config.container)
      : config.container;

  if (!container) {
    console.error("[VTryon] Container not found:", config.container);
    return;
  }

  const base = (config.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
  const params = new URLSearchParams({
    apiKey: config.apiKey,
    productId: config.productId,
    theme: config.theme ?? "light",
    locale: config.locale ?? "en",
  });

  const iframe = document.createElement("iframe");
  iframe.src = `${base}/embed/tryon?${params}`;
  iframe.style.width = "100%";
  iframe.style.height = "600px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "12px";
  iframe.style.maxWidth = "480px";
  iframe.setAttribute("allow", "camera");
  iframe.setAttribute("title", "VTryon Virtual Try-On");

  container.innerHTML = "";
  container.appendChild(iframe);

  window.addEventListener("message", (event) => {
    if (event.origin !== base) return;

    const data = event.data;
    if (!data || data.source !== "vtryon-widget") return;

    if (data.type === "tryon-result" && config.onResult) {
      config.onResult({
        resultImageUrl: data.resultImageUrl,
        sizeRecommended: data.sizeRecommended,
      });
    }

    if (data.type === "tryon-error" && config.onError) {
      config.onError(data.message);
    }
  });
}

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).VTryon = { mount };
}

export { mount };
