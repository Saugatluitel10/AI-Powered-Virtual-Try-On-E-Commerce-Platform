"use client";

import { create } from "zustand";
import type { Cart, CartItem } from "@/types/order";
import api from "@/lib/api";

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Cart>("/cart");
      set({ cart: data });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (variantId, quantity = 1) => {
    await api.post("/cart/items", { variant_id: variantId, quantity });
    await get().fetchCart();
  },

  removeItem: async (itemId) => {
    await api.delete(`/cart/items/${itemId}`);
    await get().fetchCart();
  },

  updateQuantity: async (itemId, quantity) => {
    await api.patch(`/cart/items/${itemId}`, { quantity });
    await get().fetchCart();
  },

  clearCart: async () => {
    await api.delete("/cart");
    set({ cart: null });
  },
}));
