"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WardrobeItem {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string;
  tryOnResultUrl?: string;
  addedAt: string;
}

interface WardrobeState {
  items: WardrobeItem[];
  addItem: (item: Omit<WardrobeItem, "addedAt">) => void;
  removeItem: (id: string) => void;
  hasItem: (productId: string) => boolean;
  clear: () => void;
}

export const useWardrobeStore = create<WardrobeState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        if (get().hasItem(item.productId)) return;
        set((state) => ({
          items: [
            ...state.items,
            { ...item, addedAt: new Date().toISOString() },
          ],
        }));
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      hasItem: (productId) =>
        get().items.some((i) => i.productId === productId),

      clear: () => set({ items: [] }),
    }),
    { name: "wardrobe-storage" }
  )
);
