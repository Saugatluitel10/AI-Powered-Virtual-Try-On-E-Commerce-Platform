"use client";

import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-primary min-h-[85vh] flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-50"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&h=1080&fit=crop&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 text-on-primary/60 text-[12px] font-bold uppercase tracking-[0.1em] mb-8">
          <span className="w-8 h-px bg-on-primary/40" />
          AI-Powered Virtual Try-On
          <span className="w-8 h-px bg-on-primary/40" />
        </div>

        <h1 className="font-display text-[48px] sm:text-[64px] leading-[1.1] tracking-tight text-on-primary mb-6">
          Try before you buy.{" "}
          <em className="not-italic text-secondary-fixed-dim">Without the fitting room.</em>
        </h1>

        <p className="text-lg text-on-primary/70 leading-relaxed max-w-xl mx-auto mb-10">
          Upload your photo and virtually try on thousands of outfits with AI-powered precision.
          Nepal&apos;s first virtual fitting room designed for the discerning individual.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/upload"
            className="bg-on-primary text-primary px-10 py-4 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-primary-fixed transition-all active:scale-[0.98]"
          >
            Try On Now
          </Link>
          <Link
            href="/shop"
            className="border border-on-primary/30 text-on-primary px-10 py-4 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-on-primary/10 transition-all active:scale-[0.98]"
          >
            Browse Collection
          </Link>
        </div>
      </div>
    </section>
  );
}
