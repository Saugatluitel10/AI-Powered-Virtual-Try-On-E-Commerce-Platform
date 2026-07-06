"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-24 bg-primary">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-secondary-fixed-dim mb-6">
          Get Started
        </div>
        <h2 className="font-display text-[36px] sm:text-[48px] text-on-primary leading-tight mb-6">
          Ready to transform how you shop?
        </h2>
        <p className="text-on-primary/60 text-lg mb-10 max-w-xl mx-auto">
          Try on your first outfit in seconds — no sign-up required.
          Join a new era of confident, intelligent fashion.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/upload"
            className="bg-on-primary text-primary px-10 py-4 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-primary-fixed transition-all active:scale-[0.98]"
          >
            Start Trying On
          </Link>
          <Link
            href="/brand/register"
            className="border border-on-primary/30 text-on-primary px-10 py-4 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-on-primary/10 transition-all active:scale-[0.98]"
          >
            For Retailers
          </Link>
        </div>
      </div>
    </section>
  );
}
