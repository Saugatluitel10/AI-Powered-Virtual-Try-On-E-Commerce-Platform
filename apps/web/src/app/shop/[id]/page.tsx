"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Camera,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Package,
  X,
  ZoomIn,
  Check,
  Star,
  Heart,
} from "lucide-react";
import api from "@/lib/api";
import type { Product, ProductListItem } from "@/types/product";
import ProductCard from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

const BODY_TYPE_LABELS: Record<string, string> = {
  HOURGLASS: "Hourglass",
  PEAR: "Pear",
  APPLE: "Apple",
  RECTANGLE: "Rectangle",
  INVERTED_TRIANGLE: "Inv. Triangle",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-[3/4] rounded-2xl bg-gray-200" />
        <div className="space-y-4 pt-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-20 bg-gray-200 rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-10 w-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const { recentlyViewed, addProduct } = useRecentlyViewed();
  const { addItem, addToServer, isSynced } = useCartStore();
  const { user } = useAuthStore();

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["product", params.id],
    queryFn: async () => {
      const res = await api.get<{ data: Product }>(`/products/${params.id}`);
      return res.data.data;
    },
  });

  useEffect(() => {
    if (product) {
      addProduct({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        currency: product.currency,
        primaryImageUrl: product.images[0] ?? null,
        brandName: product.brandName,
      });
    }
  }, [product, addProduct]);

  const { data: relatedProducts } = useQuery<ProductListItem[]>({
    queryKey: ["related-products", params.id],
    queryFn: async () => {
      const res = await api.get<{ data: ProductListItem[] }>(`/products/${params.id}/related`);
      return res.data.data;
    },
    enabled: !!product,
  });

  interface SizeChartRow {
    size: string;
    bustMin: number | null; bustMax: number | null;
    waistMin: number | null; waistMax: number | null;
    hipsMin: number | null; hipsMax: number | null;
  }

  const { data: sizeChartData } = useQuery<{ sizes: string[]; chart: SizeChartRow[] }>({
    queryKey: ["size-chart", params.id],
    queryFn: async () => {
      const res = await api.get<{ data: { sizes: string[]; chart: SizeChartRow[] } }>(`/products/${params.id}/size-chart`);
      return res.data.data;
    },
    enabled: showSizeChart,
  });

  interface ReviewData {
    items: Array<{
      id: string;
      rating: number;
      title: string | null;
      comment: string | null;
      reply: string | null;
      userName: string;
      userAvatar: string | null;
      createdAt: string;
    }>;
    averageRating: number;
    totalReviews: number;
  }

  const { data: reviewsData } = useQuery<ReviewData>({
    queryKey: ["product-reviews", product?.id],
    queryFn: async () => {
      const res = await api.get<{ data: ReviewData }>(`/reviews/product/${product!.id}?pageSize=5`);
      return res.data.data;
    },
    enabled: !!product,
  });

  interface SizeRec {
    recommendedSize: string;
    confidence: number;
    reasoning: string;
    fitType: string;
  }

  const { data: sizeRec } = useQuery<SizeRec>({
    queryKey: ["size-rec", product?.id],
    queryFn: async () => {
      const res = await api.get<{ data: SizeRec }>(`/products/${product!.id}/size-recommendation`);
      return res.data.data;
    },
    enabled: !!product && !!user,
  });

  useEffect(() => {
    if (!product || !user) return;
    api
      .get<{ data: { wishlisted: boolean } }>(`/wishlist/check/${product.id}`)
      .then((res) => setWishlisted(res.data.data.wishlisted))
      .catch(() => {});
  }, [product, user]);

  if (isLoading) return <ProductSkeleton />;

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Package className="h-12 w-12 mx-auto text-gray-300" />
        <h2 className="text-xl font-semibold">Product not found</h2>
        <p className="text-sm text-muted-foreground">
          This product may have been removed or the link is incorrect.
        </p>
        <Button variant="outline" onClick={() => router.push("/shop")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shop
        </Button>
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [];
  const currentImage = images[imageIdx] ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/shop" className="hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Shop
        </Link>
        {product.garmentType && (
          <>
            <span>/</span>
            <span className="capitalize">{product.garmentType}</span>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* ── Image gallery ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Main image */}
          <div
            className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 cursor-zoom-in"
            onClick={() => currentImage && setZoomedImage(currentImage)}
          >
            {currentImage ? (
              <Image
                src={currentImage}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <ShoppingBag className="w-16 h-16" />
              </div>
            )}
            {currentImage && (
              <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <ZoomIn className="w-3 h-3" /> Click to zoom
              </div>
            )}

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIdx((i) => Math.max(0, i - 1))}
                  disabled={imageIdx === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow disabled:opacity-30 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setImageIdx((i) => Math.min(images.length - 1, i + 1))}
                  disabled={imageIdx === images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow disabled:opacity-30 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={cn(
                    "relative shrink-0 w-16 aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    i === imageIdx
                      ? "border-purple-600"
                      : "border-transparent hover:border-gray-300"
                  )}
                >
                  <Image
                    src={src}
                    alt={`${product.name} view ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product info ───────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Brand */}
          {product.brandName && (
            <p className="text-sm font-medium text-purple-600 uppercase tracking-widest">
              {product.brandName}
            </p>
          )}

          {/* Name + price */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(product.price, product.currency)}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {product.gender && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600 capitalize">
                {product.gender}
              </span>
            )}
            {product.garmentType && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600 capitalize">
                {product.garmentType}
              </span>
            )}
            {product.isTryonEnabled && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Virtual Try-On
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          )}

          {/* Size selector */}
          {product.sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">Select Size</p>
                <button
                  onClick={() => setShowSizeChart(true)}
                  className="text-xs text-purple-600 flex items-center gap-1 hover:underline"
                >
                  <Ruler className="h-3 w-3" />
                  Size guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size === selectedSize ? null : size)}
                    className={cn(
                      "min-w-[3rem] px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      size === selectedSize
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Body type suitability */}
          {product.suitableBodyTypes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Suited for</p>
              <div className="flex flex-wrap gap-1.5">
                {product.suitableBodyTypes.map((bt) => (
                  <span
                    key={bt}
                    className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs"
                  >
                    {BODY_TYPE_LABELS[bt] ?? bt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              disabled={product.sizes.length > 0 && !selectedSize}
              onClick={() => {
                if (!product || (product.sizes.length > 0 && !selectedSize)) return;
                const size = selectedSize ?? "ONE_SIZE";
                if (user && isSynced) {
                  addToServer(product.id, size, 1);
                } else {
                  addItem({
                    productId: product.id,
                    productName: product.name,
                    productImage: product.images[0] ?? null,
                    brandName: product.brandName,
                    size,
                    quantity: 1,
                    unitPrice: product.price,
                    currency: product.currency,
                  });
                }
                setAddedToCart(true);
                setTimeout(() => setAddedToCart(false), 2000);
              }}
            >
              {addedToCart ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  {product.sizes.length > 0 && !selectedSize ? "Select a size" : "Add to Cart"}
                </>
              )}
            </Button>

            {product.isTryonEnabled && (
              <Link href="/upload">
                <Button variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Try On
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                if (!user) return;
                try {
                  if (wishlisted) {
                    await api.delete(`/wishlist/${product.id}`);
                    setWishlisted(false);
                  } else {
                    await api.post("/wishlist", { productId: product.id });
                    setWishlisted(true);
                  }
                } catch {}
              }}
              className={wishlisted ? "text-red-500 border-red-200 hover:bg-red-50" : ""}
            >
              <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500" : ""}`} />
            </Button>
          </div>

          {/* Size Recommendation */}
          {sizeRec && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">
                  Recommended: {sizeRec.recommendedSize}
                </span>
                <span className="text-xs bg-purple-200 text-purple-800 rounded-full px-2 py-0.5">
                  {Math.round(sizeRec.confidence * 100)}% confident
                </span>
                {sizeRec.fitType && (
                  <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 capitalize">
                    {sizeRec.fitType}
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-800">{sizeRec.reasoning}</p>
            </div>
          )}

          {/* Shipping note */}
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            Free delivery within Kathmandu Valley. Ships in 2–4 days.
          </p>
        </div>
      </div>

      {/* ── Reviews ────────────────────────────────────────────────────── */}
      {reviewsData && reviewsData.totalReviews > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Customer Reviews</h2>
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{reviewsData.averageRating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({reviewsData.totalReviews} reviews)</span>
            </div>
          </div>
          <div className="space-y-4">
            {reviewsData.items.map((review) => (
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{review.userName}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.title && (
                  <p className="font-medium text-gray-900 mb-1">{review.title}</p>
                )}
                {review.comment && (
                  <p className="text-sm text-gray-700">{review.comment}</p>
                )}
                {review.reply && (
                  <div className="bg-gray-50 rounded-md p-3 mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Brand reply</p>
                    <p className="text-sm text-gray-700">{review.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Related Products ────────────────────────────────────────────── */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">You might also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* ── Recently Viewed ────────────────────────────────────────────── */}
      {recentlyViewed.filter((p) => p.id !== product.id).length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Viewed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentlyViewed
              .filter((p) => p.id !== product.id)
              .slice(0, 4)
              .map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    ...p,
                    sizes: [],
                    gender: null,
                    garmentType: null,
                    isTryonEnabled: false,
                    suitableBodyTypes: [],
                  }}
                />
              ))}
          </div>
        </div>
      )}

      {/* ── Image Zoom Modal ─────────────────────────────────────────────── */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setZoomedImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-w-3xl max-h-[90vh] w-full aspect-[3/4]">
            <Image
              src={zoomedImage}
              alt={product.name}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}

      {/* ── Size Chart Modal ─────────────────────────────────────────────── */}
      {showSizeChart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSizeChart(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Size Guide</h3>
              <button onClick={() => setShowSizeChart(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sizeChartData?.chart && sizeChartData.chart.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Size</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Bust (cm)</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Waist (cm)</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Hips (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChartData.chart.map((row) => (
                      <tr key={row.size} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{row.size}</td>
                        <td className="py-2 px-3 text-gray-600">
                          {row.bustMin && row.bustMax ? `${row.bustMin}-${row.bustMax}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {row.waistMin && row.waistMax ? `${row.waistMin}-${row.waistMax}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {row.hipsMin && row.hipsMax ? `${row.hipsMin}-${row.hipsMax}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No size chart available for this brand.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
