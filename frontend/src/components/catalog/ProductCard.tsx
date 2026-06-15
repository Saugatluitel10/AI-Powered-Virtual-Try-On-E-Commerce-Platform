"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, ShoppingBag } from "lucide-react";
import type { ProductListItem } from "@/types/product";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";

interface ProductCardProps {
  product: ProductListItem;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/catalog/${product.slug}`}
      className="group block rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all bg-white"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
        {product.primary_image_url ? (
          <Image
            src={product.primary_image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag className="w-12 h-12" />
          </div>
        )}

        {product.is_tryon_enabled && (
          <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <Camera className="w-3 h-3" />
            Try On
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">
            {formatCurrency(product.base_price, product.currency)}
          </span>
          {product.gender && (
            <span className="text-xs text-gray-500 capitalize">{product.gender}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
