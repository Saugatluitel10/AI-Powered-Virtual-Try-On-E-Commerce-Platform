"use client";

import { create } from "zustand";
import type { LocalUser } from "@/lib/local-auth";

interface AuthState {
  user: LocalUser | null;
  loading: boolean;
  setAuth: (user: LocalUser | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,

  setAuth: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ user: null, loading: false }),
}));
