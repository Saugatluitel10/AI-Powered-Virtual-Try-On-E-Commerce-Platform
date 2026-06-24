"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, ShoppingBag } from "lucide-react";
import type { ProductListItem } from "@/types/product";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const BODY_TYPE_LABELS: Record<string, string> = {
  HOURGLASS: "Hourglass",
  PEAR: "Pear",
  APPLE: "Apple",
  RECTANGLE: "Rectangle",
  INVERTED_TRIANGLE: "Inv. Triangle",
};

interface Props {
  product: ProductListItem;
  highlightBodyType?: string | null;
  priority?: boolean;
}

export default function ProductCard({ product, highlightBodyType, priority = false }: Props) {
  const isCompatible =
    highlightBodyType &&
    product.suitableBodyTypes.includes(highlightBodyType.toUpperCase());

  return (
    <Link
      href={`/shop/${product.id}`}
      className="group block rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all bg-white"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag className="w-12 h-12" />
          </div>
        )}

        {/* Try-on badge */}
        {product.isTryonEnabled && (
          <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Camera className="w-3 h-3" />
            Try On
          </div>
        )}

        {/* Body type compatibility badge */}
        {isCompatible && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            ✓ Fits you
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        {product.brandName && (
          <p className="text-xs text-gray-400 uppercase tracking-wide truncate">
            {product.brandName}
          </p>
        )}
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug">
          {product.name}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-gray-900 text-sm">
            {formatCurrency(product.price, product.currency)}
          </span>
          {product.gender && (
            <span className="text-xs text-gray-400 capitalize">{product.gender}</span>
          )}
        </div>

        {/* Body type tags — show up to 2 */}
        {product.suitableBodyTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {product.suitableBodyTypes.slice(0, 2).map((bt) => (
              <span
                key={bt}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full border",
                  bt === highlightBodyType?.toUpperCase()
                    ? "bg-green-100 border-green-300 text-green-700"
                    : "bg-gray-50 border-gray-200 text-gray-500"
                )}
              >
                {BODY_TYPE_LABELS[bt] ?? bt}
              </span>
            ))}
            {product.suitableBodyTypes.length > 2 && (
              <span className="text-[10px] text-gray-400">
                +{product.suitableBodyTypes.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
