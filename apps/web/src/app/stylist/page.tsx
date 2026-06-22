"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import StyleChatbot from "@/components/stylist/StyleChatbot";

export default function StylistPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 flex items-center gap-3">
        <Link
          href="/shop"
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="font-semibold text-gray-900">AI Stylist</h1>
          <p className="text-xs text-gray-500">
            Personalized fashion advice powered by AI
          </p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <StyleChatbot />
      </div>
    </div>
  );
}
