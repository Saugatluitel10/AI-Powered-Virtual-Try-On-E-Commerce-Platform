"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Camera, ShoppingBag } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-16 pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-200 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Virtual Try-On
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Try Before You Buy.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Without the Fitting Room.
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Upload your photo, virtually try on thousands of outfits, and get personalized
            styling recommendations from our AI fashion expert — all in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/try-on"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 hover:shadow-purple-300"
            >
              <Camera className="w-5 h-5" />
              Try On Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all border border-gray-200 shadow-sm"
            >
              <ShoppingBag className="w-5 h-5" />
              Browse Collection
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            No account needed to try on. Just upload your photo.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: "10K+", label: "Try-Ons" },
            { value: "98%", label: "Accuracy" },
            { value: "60%", label: "Fewer Returns" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
