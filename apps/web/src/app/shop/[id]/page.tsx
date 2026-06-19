"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import api from "@/lib/api";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

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

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["product", params.id],
    queryFn: async () => {
      const res = await api.get<{ data: Product }>(`/products/${params.id}`);
      return res.data.data;
    },
  });

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
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50">
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
                <button className="text-xs text-purple-600 flex items-center gap-1 hover:underline">
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
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              {product.sizes.length > 0 && !selectedSize ? "Select a size" : "Add to Cart"}
            </Button>

            {product.isTryonEnabled && (
              <Link href="/upload">
                <Button variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Try On
                </Button>
              </Link>
            )}
          </div>

          {/* Shipping note */}
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            Free delivery within Kathmandu Valley. Ships in 2–4 days.
          </p>
        </div>
      </div>
    </div>
  );
}
