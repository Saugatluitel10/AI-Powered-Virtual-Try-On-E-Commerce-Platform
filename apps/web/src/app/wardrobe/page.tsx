"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Share2,
  FolderPlus,
  Loader2,
  Shirt,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface WardrobeItemData {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  price: number;
  currency: string;
  category: string;
  garmentType: string | null;
  brandName: string | null;
  suitableBodyTypes: string[];
  tryOnResultId: string | null;
  tryOnImageUrl: string | null;
  collectionId: string | null;
  collectionName: string | null;
  savedAt: string;
}

interface Collection {
  id: string;
  name: string;
  isPublic: boolean;
  shareToken: string | null;
  itemCount: number;
  createdAt: string;
}

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  primaryImageUrl: string | null;
  category: string;
  brandName: string | null;
}

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItemData[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<string | null>(null);
  const [copiedShareUrl, setCopiedShareUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeCollection ? `?collectionId=${activeCollection}` : "";
      const [itemsRes, collectionsRes] = await Promise.all([
        api.get<{ data: WardrobeItemData[] }>(`/wardrobe${params}`),
        api.get<{ data: Collection[] }>("/wardrobe/collections"),
      ]);
      setItems(itemsRes.data.data);
      setCollections(collectionsRes.data.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [activeCollection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function removeItem(id: string) {
    try {
      await api.delete(`/wardrobe/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // silently fail
    }
  }

  async function createCollection() {
    if (!newCollectionName.trim()) return;
    setCreatingCollection(true);
    try {
      await api.post("/wardrobe/collections", { name: newCollectionName.trim() });
      setNewCollectionName("");
      setShowNewCollection(false);
      await fetchData();
    } catch {
      // silently fail
    } finally {
      setCreatingCollection(false);
    }
  }

  async function deleteCollection(id: string) {
    try {
      await api.delete(`/wardrobe/collections/${id}`);
      if (activeCollection === id) setActiveCollection(null);
      await fetchData();
    } catch {
      // silently fail
    }
  }

  async function shareCollection(id: string) {
    try {
      const res = await api.post<{ data: { shareUrl: string } }>(
        `/wardrobe/collections/${id}/share`
      );
      const url = res.data.data.shareUrl;
      await navigator.clipboard.writeText(url);
      setCopiedShareUrl(id);
      setTimeout(() => setCopiedShareUrl(null), 2000);
      await fetchData();
    } catch {
      // silently fail
    }
  }

  async function moveItem(itemId: string, collectionId: string | null) {
    try {
      await api.patch(`/wardrobe/${itemId}/move`, { collectionId });
      await fetchData();
    } catch {
      // silently fail
    }
  }

  async function loadSuggestions(itemId: string) {
    if (expandedItem === itemId) {
      setExpandedItem(null);
      return;
    }
    setExpandedItem(itemId);
    if (suggestions[itemId]) return;

    setLoadingSuggestions(itemId);
    try {
      const res = await api.get<{ data: Suggestion[] }>(
        `/wardrobe/${itemId}/complete-the-look`
      );
      setSuggestions((prev) => ({ ...prev, [itemId]: res.data.data }));
    } catch {
      setSuggestions((prev) => ({ ...prev, [itemId]: [] }));
    } finally {
      setLoadingSuggestions(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wardrobe</h1>
            <p className="text-gray-500 mt-1">
              {items.length} saved {items.length === 1 ? "item" : "items"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/stylist">
              <Button variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI Stylist
              </Button>
            </Link>
            <Link href="/shop">
              <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4" />
                Shop More
              </Button>
            </Link>
          </div>
        </div>

        {/* Collections row */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCollection(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !activeCollection
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-700 border hover:bg-gray-50"
            }`}
          >
            All Items
          </button>
          {collections.map((c) => (
            <div key={c.id} className="relative group">
              <button
                onClick={() => setActiveCollection(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCollection === c.id
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 border hover:bg-gray-50"
                }`}
              >
                {c.name} ({c.itemCount})
              </button>
              {/* Collection actions on hover */}
              <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    shareCollection(c.id);
                  }}
                  className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center"
                  title="Share"
                >
                  {copiedShareUrl === c.id ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Share2 className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCollection(c.id);
                  }}
                  className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  title="Delete"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {showNewCollection ? (
            <div className="flex items-center gap-2">
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name..."
                className="w-40 h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && createCollection()}
                autoFocus
              />
              <Button
                size="sm"
                onClick={createCollection}
                disabled={creatingCollection || !newCollectionName.trim()}
                className="h-9 bg-purple-600 hover:bg-purple-700"
              >
                {creatingCollection ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNewCollection(false);
                  setNewCollectionName("");
                }}
                className="h-9"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCollection(true)}
              className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              New Collection
            </button>
          )}
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shirt className="w-10 h-10 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {activeCollection ? "No items in this collection" : "Your wardrobe is empty"}
            </h2>
            <p className="text-gray-500 mb-6">
              {activeCollection
                ? "Move items here from your wardrobe"
                : "Try on clothes and save your favorites here"}
            </p>
            <Link href="/shop">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Start Shopping
              </Button>
            </Link>
          </div>
        )}

        {/* Items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id}>
              <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
                {/* Image */}
                <div className="relative aspect-[3/4] bg-gray-100">
                  {item.tryOnImageUrl ? (
                    <Image
                      src={item.tryOnImageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  ) : item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shirt className="w-12 h-12 text-gray-300" />
                    </div>
                  )}

                  {/* Try-on badge */}
                  {item.tryOnImageUrl && (
                    <Badge className="absolute top-2 left-2 bg-purple-600 text-white text-xs">
                      Try-On Result
                    </Badge>
                  )}

                  {/* Quick actions overlay */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <Link
                    href={`/shop/${item.productSlug}`}
                    className="font-semibold text-gray-900 hover:text-purple-600 transition-colors line-clamp-1"
                  >
                    {item.productName}
                  </Link>
                  {item.brandName && (
                    <p className="text-sm text-gray-500 mt-0.5">{item.brandName}</p>
                  )}
                  <p className="text-sm font-medium text-purple-600 mt-1">
                    {formatCurrency(item.price, item.currency)}
                  </p>

                  {/* Collection / move */}
                  <div className="mt-3 flex items-center gap-2">
                    {item.collectionName && (
                      <Badge variant="secondary" className="text-xs">
                        {item.collectionName}
                      </Badge>
                    )}
                    {collections.length > 0 && (
                      <select
                        value={item.collectionId ?? ""}
                        onChange={(e) =>
                          moveItem(item.id, e.target.value || null)
                        }
                        className="text-xs border rounded px-2 py-1 text-gray-600 bg-white"
                      >
                        <option value="">No collection</option>
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Complete the look button */}
                  <button
                    onClick={() => loadSuggestions(item.id)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium py-1.5 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Complete the Look
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        expandedItem === item.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CardContent>
              </Card>

              {/* Suggestions panel */}
              {expandedItem === item.id && (
                <div className="mt-2 bg-white rounded-xl border p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Complete the Look
                  </h4>
                  {loadingSuggestions === item.id ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                    </div>
                  ) : (suggestions[item.id] ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No suggestions found
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {(suggestions[item.id] ?? []).map((s) => (
                        <Link
                          key={s.id}
                          href={`/shop/${s.slug}`}
                          className="group/sug"
                        >
                          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-1.5">
                            {s.primaryImageUrl ? (
                              <Image
                                src={s.primaryImageUrl}
                                alt={s.name}
                                fill
                                className="object-cover group-hover/sug:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Shirt className="w-6 h-6 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium text-gray-900 line-clamp-1">
                            {s.name}
                          </p>
                          <p className="text-xs text-purple-600">
                            {formatCurrency(s.price, s.currency)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
