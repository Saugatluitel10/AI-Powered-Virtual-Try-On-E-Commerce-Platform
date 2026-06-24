"use client";

import { create } from "zustand";
import { trackEvent } from "@/lib/posthog";
import type { TryOnSession } from "@/types/order";

interface TryOnState {
  activeSession: TryOnSession | null;
  uploadedPhoto: File | null;
  setSession: (session: TryOnSession) => void;
  updateSession: (session: TryOnSession) => void;
  setUploadedPhoto: (file: File | null) => void;
  clearSession: () => void;
}

export const useTryOnStore = create<TryOnState>((set) => ({
  activeSession: null,
  uploadedPhoto: null,

  setSession: (session) => {
    trackEvent("tryon_started", { productId: session.productId, sessionId: session.id });
    set({ activeSession: session });
  },
  updateSession: (session) => {
    if (session.status === "completed") {
      trackEvent("tryon_complete", { productId: session.productId, sessionId: session.id, processingTimeMs: session.processingTimeMs });
    }
    set({ activeSession: session });
  },
  setUploadedPhoto: (file) => set({ uploadedPhoto: file }),
  clearSession: () => set({ activeSession: null, uploadedPhoto: null }),
}));
