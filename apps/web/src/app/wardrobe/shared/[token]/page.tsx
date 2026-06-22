"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Shirt, Share2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SharedItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  price: number;
  currency: string;
  category: string;
  brandName: string | null;
  tryOnImageUrl: string | null;
  savedAt: string;
}

interface SharedCollection {
  collectionName: string;
  userName: string;
  items: SharedItem[];
}

export default function SharedCollectionPage() {
  const params = useParams();
  const token = params.token as string;
  const [collection, setCollection] = useState<SharedCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const res = await globalThis.fetch(`${baseUrl}/api/v1/wardrobe/shared/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Not found" }));
          throw new Error(body.error ?? "Collection not found");
        }
        const json = await res.json();
        setCollection(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load collection");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Shirt className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Collection Not Found</h2>
        <p className="text-gray-500 mb-6">{error ?? "This collection may be private or removed."}</p>
        <Link href="/shop">
          <Button className="bg-purple-600 hover:bg-purple-700">Browse Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full mb-3">
            <Share2 className="w-3.5 h-3.5" />
            Shared Collection
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {collection.collectionName}
          </h1>
          <p className="text-gray-500">
            Curated by {collection.userName} &middot; {collection.items.length}{" "}
            {collection.items.length === 1 ? "item" : "items"}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {collection.items.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
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
              </div>
              <CardContent className="p-4">
                <p className="font-semibold text-gray-900 line-clamp-1">
                  {item.productName}
                </p>
                {item.brandName && (
                  <p className="text-sm text-gray-500 mt-0.5">{item.brandName}</p>
                )}
                <p className="text-sm font-medium text-purple-600 mt-1">
                  {formatCurrency(item.price, item.currency)}
                </p>
                <Link href={`/shop/${item.productSlug}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    View Product
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-500 mb-3">Want to create your own wardrobe?</p>
          <Link href="/signup">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
