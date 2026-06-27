"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Loader2, Trash2, Share2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  price: number;
  currency: string;
  image: string | null;
  brandName: string | null;
  addedAt: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    api
      .get<{ data: WishlistItem[] }>("/wishlist")
      .then((res) => setItems(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function removeItem(productId: string) {
    try {
      await api.delete(`/wishlist/${productId}`);
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } catch {}
  }

  async function shareWishlist() {
    setSharing(true);
    try {
      const res = await api.post<{ data: { shareUrl: string } }>("/wishlist/share");
      const url = res.data.data.shareUrl;
      if (navigator.share) {
        await navigator.share({ title: "My VTryon Wishlist", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Wishlist link copied!");
      }
    } catch {}
    setSharing(false);
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
            <span className="text-sm text-gray-500">({items.length} items)</span>
          </div>
          {items.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={shareWishlist} disabled={sharing}>
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Your wishlist is empty.</p>
              <Link href="/shop">
                <Button className="bg-purple-600 hover:bg-purple-700">Browse products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <Link href={`/shop/${item.productSlug}`}>
                  <div className="relative aspect-[3/4] bg-gray-100">
                    {item.image ? (
                      <Image src={item.image} alt={item.productName} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-3">
                  <Link href={`/shop/${item.productSlug}`} className="hover:text-purple-600">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.productName}</p>
                  </Link>
                  {item.brandName && (
                    <p className="text-xs text-gray-500">{item.brandName}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(item.price, item.currency)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-600 h-8 w-8"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
