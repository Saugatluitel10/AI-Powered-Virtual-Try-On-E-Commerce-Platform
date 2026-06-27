"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "vtryon_recently_viewed";
const MAX_ITEMS = 12;

interface RecentProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  primaryImageUrl: string | null;
  brandName: string | null;
  viewedAt: number;
}

function load(): RecentProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentProduct[]) : [];
  } catch {
    return [];
  }
}

function save(items: RecentProduct[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // quota exceeded
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    setItems(load());
  }, []);

  const addProduct = useCallback(
    (product: Omit<RecentProduct, "viewedAt">) => {
      const updated = [
        { ...product, viewedAt: Date.now() },
        ...load().filter((p) => p.id !== product.id),
      ].slice(0, MAX_ITEMS);
      save(updated);
      setItems(updated);
    },
    []
  );

  return { recentlyViewed: items, addProduct };
}
