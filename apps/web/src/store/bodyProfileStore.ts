"use client";

import { create } from "zustand";
import type { BodyProfile } from "@/types/body";

interface BodyProfileState {
  profile: BodyProfile | null;
  setProfile: (profile: BodyProfile | null) => void;
  clear: () => void;
}

export const useBodyProfileStore = create<BodyProfileState>()((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null }),
}));
