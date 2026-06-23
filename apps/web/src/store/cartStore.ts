"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

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

  getItems: () => (LocalCartItem | ServerCartItem)[];
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

      // ── Local cart (guest users) ───────────────────────────────────────
      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.size === item.size
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.size === item.size
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      removeItem: (productId, size) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.size === size)
          ),
        }));
      },

      updateQuantity: (productId, size, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.size === size
              ? { ...i, quantity }
              : i
          ),
        }));
      },

      clearLocal: () => set({ items: [] }),

      // ── Server cart (authenticated users) ──────────────────────────────
      fetchCart: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get<{
            data: {
              items: ServerCartItem[];
              subtotal: number;
              itemCount: number;
            };
          }>("/cart");
          set({ serverItems: data.data.items, isSynced: true });
        } catch {
          // silently fail
        } finally {
          set({ isLoading: false });
        }
      },

      addToServer: async (productId, size, quantity = 1) => {
        try {
          await api.post("/cart", { productId, size, quantity });
          await get().fetchCart();
        } catch {
          // silently fail
        }
      },

      removeFromServer: async (id) => {
        try {
          await api.delete(`/cart/${id}`);
          set((state) => ({
            serverItems: state.serverItems.filter((i) => i.id !== id),
          }));
        } catch {
          // silently fail
        }
      },

      updateServerQuantity: async (id, quantity) => {
        try {
          await api.patch(`/cart/${id}`, { quantity });
          set((state) => ({
            serverItems: state.serverItems.map((i) =>
              i.id === id ? { ...i, quantity } : i
            ),
          }));
        } catch {
          // silently fail
        }
      },

      clearServer: async () => {
        try {
          await api.delete("/cart");
          set({ serverItems: [] });
        } catch {
          // silently fail
        }
      },

      syncToServer: async () => {
        const { items } = get();
        if (items.length === 0) {
          await get().fetchCart();
          return;
        }
        try {
          await api.post("/cart/sync", {
            items: items.map((i) => ({
              productId: i.productId,
              size: i.size,
              quantity: i.quantity,
            })),
          });
          set({ items: [] });
          await get().fetchCart();
        } catch {
          // silently fail
        }
      },

      // ── Computed helpers ───────────────────────────────────────────────
      getItems: () => {
        const { isSynced, serverItems, items } = get();
        return isSynced ? serverItems : items;
      },

      getSubtotal: () => {
        const items = get().getItems();
        return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      },

      getItemCount: () => {
        const items = get().getItems();
        return items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    {
      name: "vtryon-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
