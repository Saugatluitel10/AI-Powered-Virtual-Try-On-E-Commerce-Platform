"use client";

import { create } from "zustand";
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

  setSession: (session) => set({ activeSession: session }),
  updateSession: (session) => set({ activeSession: session }),
  setUploadedPhoto: (file) => set({ uploadedPhoto: file }),
  clearSession: () => set({ activeSession: null, uploadedPhoto: null }),
}));
