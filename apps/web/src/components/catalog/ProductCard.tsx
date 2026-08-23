"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ProductListItem } from "@/types/product";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";

export default function ProductCard({ product, reason, priority = false }: { product: ProductListItem; reason?: string; priority?: boolean }) {
  const addItem = useCartStore((state) => state.addItem);
  const size = product.sizes[0] ?? "ONE_SIZE";
  return (
    <article className="group min-w-0 bg-white border border-black/10">
      <Link href={`/shop/${product.id}`} className="block relative aspect-[4/5] overflow-hidden bg-[#e9ece7]">
        {product.primaryImageUrl && (
          <Image src={product.primaryImageUrl} alt={product.name} fill priority={priority} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(max-width: 640px) 50vw, 25vw" />
        )}
        <span className="absolute left-3 top-3 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase">{product.style}</span>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-neutral-500">{product.brandName}</p>
            <Link href={`/shop/${product.id}`} className="mt-1 block font-semibold leading-snug hover:underline">{product.name}</Link>
          </div>
          <button
            type="button"
            onClick={() => addItem({ productId: product.id, productName: product.name, productImage: product.primaryImageUrl, brandName: product.brandName, size, quantity: 1, unitPrice: product.price, currency: product.currency })}
            className="grid h-9 w-9 shrink-0 place-items-center bg-black text-white hover:bg-[#b61f32]"
            aria-label={`Add ${product.name} to cart`}
            title="Add to cart"
          ><Plus className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 font-bold">{formatCurrency(product.price)}</p>
        <p className="mt-1 text-xs capitalize text-neutral-500">{product.gender} · {product.garmentType} · {product.color}</p>
        {reason && <p className="mt-3 border-t border-black/10 pt-3 text-xs leading-relaxed text-[#8d1827]">{reason}</p>}
      </div>
    </article>
  );
}
