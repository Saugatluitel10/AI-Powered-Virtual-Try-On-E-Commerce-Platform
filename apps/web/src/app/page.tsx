"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, CreditCard, SlidersHorizontal } from "lucide-react";
import { useEffect } from "react";
import ProductCard from "@/components/catalog/ProductCard";
import { DEMO_PRODUCTS } from "@/data/demo-products";
import { useAuthStore } from "@/store/authStore";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  if (loading || !user) return <div className="grid min-h-[60vh] place-items-center"><p className="font-display text-2xl">prashna<span className="text-[#b61f32]">.clo</span></p></div>;

  return <><section className="relative min-h-[72vh] overflow-hidden bg-[#20231f] text-white"><Image src="/products/product-18.jpg" alt="prashna.clo seasonal fashion" fill priority className="object-cover object-center opacity-55" sizes="100vw" /><div className="relative mx-auto flex min-h-[72vh] max-w-[1280px] items-end px-5 pb-14 sm:px-10 sm:pb-20"><div className="max-w-2xl"><p className="text-xs font-bold uppercase text-[#f7a1a7]">Made for everyday Nepal</p><h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-7xl">Clothing that feels like you.</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">Explore practical fashion in NPR, then use local photo analysis to find pieces that match your color and style.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/shop" className="inline-flex items-center gap-2 bg-[#b61f32] px-6 py-4 text-sm font-bold uppercase">Shop collection <ArrowRight className="h-4 w-4" /></Link><Link href="/stylist" className="border border-white px-6 py-4 text-sm font-bold uppercase">Try Style Match</Link></div></div></div></section>
    <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-8"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase text-[#b61f32]">Fresh picks</p><h2 className="mt-2 font-display text-4xl">Shop the edit</h2></div><Link href="/shop" className="hidden text-sm font-bold underline sm:block">View all 30 pieces</Link></div><div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{DEMO_PRODUCTS.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div></section>
    <section className="bg-[#dce4d8]"><div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-14 sm:px-8 md:grid-cols-3">{[{ icon: SlidersHorizontal, title: "Useful filters", text: "Combine size, color, gender, style, category, and price." }, { icon: Camera, title: "Local Style Match", text: "Camera and uploads stay in your browser for simple image analysis." }, { icon: CreditCard, title: "Safe payment demos", text: "Practice five checkout methods without processing real money." }].map(({ icon: Icon, title, text }) => <div key={title}><Icon className="h-7 w-7 text-[#b61f32]" /><h3 className="mt-4 font-display text-2xl">{title}</h3><p className="mt-2 text-sm leading-relaxed text-neutral-600">{text}</p></div>)}</div></section></>;
}
