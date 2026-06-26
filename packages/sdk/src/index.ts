export interface VTryonConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  sizes: string[];
  category: string;
  garmentType: string | null;
  gender: string | null;
  images: string[];
  isTryonEnabled: boolean;
  description?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TryOnJob {
  jobId: string;
  status: string;
  pollUrl: string;
}

export interface TryOnResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  resultImageUrl: string | null;
  sizeRecommended: string | null;
  processingTimeMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface SizeRecommendation {
  recommendedSize: string | null;
  confidence: number;
  reasoning: string;
}

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  category?: string;
  gender?: "mens" | "womens" | "unisex" | "kids";
  tryonOnly?: boolean;
}

export interface SizeRecommendationParams {
  productId: string;
  bust?: number;
  waist?: number;
  hips?: number;
}

class VTryonSDK {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: VTryonConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://api.vtryon.com/api/v1/public").replace(/\/$/, "");
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error ?? `API error: ${res.status}`);
    }

    return body.data as T;
  }

  async listProducts(params?: ListProductsParams): Promise<PaginatedResponse<Product>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.category) qs.set("category", params.category);
    if (params?.gender) qs.set("gender", params.gender);
    if (params?.tryonOnly) qs.set("tryonOnly", "true");
    const query = qs.toString();
    return this.request<PaginatedResponse<Product>>(`/products${query ? `?${query}` : ""}`);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  async createTryOn(productId: string, userPhotoUrl: string): Promise<TryOnJob> {
    return this.request<TryOnJob>("/tryon", {
      method: "POST",
      body: JSON.stringify({ productId, userPhotoUrl }),
    });
  }

  async getTryOnStatus(jobId: string): Promise<TryOnResult> {
    return this.request<TryOnResult>(`/tryon/${jobId}`);
  }

  async waitForTryOn(jobId: string, opts?: { intervalMs?: number; timeoutMs?: number }): Promise<TryOnResult> {
    const interval = opts?.intervalMs ?? 3000;
    const timeout = opts?.timeoutMs ?? 120_000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const result = await this.getTryOnStatus(jobId);
      if (result.status === "completed" || result.status === "failed") {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("Try-on timed out");
  }

  async getSizeRecommendation(params: SizeRecommendationParams): Promise<SizeRecommendation> {
    return this.request<SizeRecommendation>("/size-recommendation", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }
}

export function createClient(config: VTryonConfig): VTryonSDK {
  return new VTryonSDK(config);
}

export default VTryonSDK;
