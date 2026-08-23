import Link from "next/link";

export default function Footer() {
  return <footer className="mt-20 border-t border-black/10 bg-[#20231f] text-white">
    <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-6 px-6 py-10 sm:flex-row sm:items-end">
      <div><p className="font-display text-2xl font-bold">prashna<span className="text-[#e96b72]">.clo</span></p><p className="mt-2 max-w-sm text-sm text-white/60">Local fashion shopping with honest, AI-assisted product matching.</p></div>
      <div className="flex gap-6 text-sm"><Link href="/shop">Shop</Link><Link href="/stylist">Style Match</Link><Link href="/privacy">Privacy</Link></div>
    </div>
  </footer>;
}
