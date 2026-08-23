"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LocalCartItem {
  productId: string;
  productName: string;
  productImage: string | null;
  brandName: string | null;
  size: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface ServerCartItem extends LocalCartItem {
  id: string;
  productSlug: string;
  addedAt: string;
}

interface CartState {
  items: LocalCartItem[];
  serverItems: ServerCartItem[];
  isLoading: boolean;
  isSynced: boolean;
  addItem: (item: LocalCartItem) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearLocal: () => void;
  fetchCart: () => Promise<void>;
  addToServer: (productId: string, size: string, quantity?: number) => Promise<void>;
  removeFromServer: (id: string) => Promise<void>;
  updateServerQuantity: (id: string, quantity: number) => Promise<void>;
  clearServer: () => Promise<void>;
  syncToServer: () => Promise<void>;
  getItems: () => LocalCartItem[];
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      serverItems: [],
      isLoading: false,
      isSynced: false,
      addItem: (item) => set((state) => {
        const existing = state.items.find((current) => current.productId === item.productId && current.size === item.size);
        return {
          items: existing
            ? state.items.map((current) => current === existing ? { ...current, quantity: Math.min(10, current.quantity + item.quantity) } : current)
            : [...state.items, item],
        };
      }),
      removeItem: (productId, size) => set((state) => ({
        items: state.items.filter((item) => item.productId !== productId || item.size !== size),
      })),
      updateQuantity: (productId, size, quantity) => set((state) => ({
        items: state.items.map((item) => item.productId === productId && item.size === size
          ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) }
          : item),
      })),
      clearLocal: () => set({ items: [] }),
      fetchCart: async () => undefined,
      addToServer: async () => undefined,
      removeFromServer: async () => undefined,
      updateServerQuantity: async () => undefined,
      clearServer: async () => { set({ items: [] }); },
      syncToServer: async () => undefined,
      getItems: () => get().items,
      getSubtotal: () => get().items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
      getItemCount: () => get().items.reduce((total, item) => total + item.quantity, 0),
    }),
    { name: "prashna-cart", partialize: (state) => ({ items: state.items }), skipHydration: true },
  ),
);
