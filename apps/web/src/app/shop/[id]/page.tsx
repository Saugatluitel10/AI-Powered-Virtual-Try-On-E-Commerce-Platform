"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { DEMO_PRODUCTS } from "@/data/demo-products";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import ProductCard from "@/components/catalog/ProductCard";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = DEMO_PRODUCTS.find((item) => item.id === id || item.slug === id);
  const [size, setSize] = useState("");
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  if (!product) return <div className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="font-display text-4xl">Product not found</h1><p className="mt-3 text-neutral-500">This piece is not in the local catalogue.</p><Link href="/shop" className="mt-6 inline-block bg-black px-5 py-3 text-sm text-white">Back to shop</Link></div>;
  const related = DEMO_PRODUCTS.filter((item) => item.id !== product.id && item.garmentType === product.garmentType).slice(0, 3);
  const selectedSize = size || (product.sizes.length === 1 ? product.sizes[0] : "");
  return <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-8">
    <Link href="/shop" className="mb-6 inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" /> Back to shop</Link>
    <div className="grid gap-10 md:grid-cols-2">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#e9ece7]">{product.primaryImageUrl && <Image src={product.primaryImageUrl} alt={product.name} fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />}</div>
      <section className="md:py-8"><p className="text-xs font-bold uppercase text-[#b61f32]">{product.brandName}</p><h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{product.name}</h1><p className="mt-4 text-2xl font-bold">{formatCurrency(product.price)}</p><p className="mt-6 leading-relaxed text-neutral-600">{product.description}</p>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-black/10 py-5 text-sm"><div><dt className="text-neutral-500">Category</dt><dd className="mt-1 capitalize font-semibold">{product.garmentType}</dd></div><div><dt className="text-neutral-500">Style</dt><dd className="mt-1 capitalize font-semibold">{product.style}</dd></div><div><dt className="text-neutral-500">Gender</dt><dd className="mt-1 capitalize font-semibold">{product.gender}</dd></div><div><dt className="text-neutral-500">Color</dt><dd className="mt-1 capitalize font-semibold">{product.colors.join(", ")}</dd></div></dl>
        <div className="mt-6"><p className="text-xs font-bold uppercase">Select size</p><div className="mt-3 flex flex-wrap gap-2">{product.sizes.map((item) => <button key={item} onClick={() => setSize(item)} className={`min-w-12 border px-3 py-2 text-sm ${selectedSize === item ? "border-black bg-black text-white" : "border-black/30 bg-white"}`}>{item === "ONE_SIZE" ? "One size" : item}</button>)}</div></div>
        <button disabled={!selectedSize} onClick={() => { addItem({ productId: product.id, productName: product.name, productImage: product.primaryImageUrl, brandName: product.brandName, size: selectedSize, quantity: 1, unitPrice: product.price, currency: product.currency }); setAdded(true); setTimeout(() => setAdded(false), 1800); }} className="mt-7 flex w-full items-center justify-center gap-2 bg-[#b61f32] px-6 py-4 text-sm font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-40">{added ? <><Check className="h-5 w-5" /> Added to cart</> : <><ShoppingBag className="h-5 w-5" /> {selectedSize ? "Add to cart" : "Choose a size"}</>}</button>
      </section>
    </div>
    <section className="mt-20"><h2 className="font-display text-3xl">You may also like</h2><div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>
  </div>;
}
