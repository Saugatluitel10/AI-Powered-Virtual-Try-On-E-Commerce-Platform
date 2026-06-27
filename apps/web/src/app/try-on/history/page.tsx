"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Loader2, Clock, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

interface TryOnResult {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  resultImageUrl: string | null;
  status: string;
  qualityRating: number | null;
  createdAt: string;
}

export default function TryOnHistoryPage() {
  const [results, setResults] = useState<TryOnResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadHistory(page);
  }, [page]);

  async function loadHistory(p: number) {
    setLoading(true);
    try {
      const res = await api.get<{
        data: {
          items: TryOnResult[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      }>(`/try-on/history?page=${p}&pageSize=12`);
      setResults(res.data.data.items);
      setTotalPages(res.data.data.totalPages);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Camera className="w-6 h-6 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">Try-On History</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No try-on results yet.</p>
              <Link href="/shop">
                <Button className="bg-purple-600 hover:bg-purple-700">Browse products to try on</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((result) => (
                <Card key={result.id} className="overflow-hidden">
                  <div className="relative aspect-[3/4] bg-gray-100">
                    {result.resultImageUrl ? (
                      <Image
                        src={result.resultImageUrl}
                        alt={result.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge
                        className={
                          result.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : result.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }
                      >
                        {result.status}
                      </Badge>
                    </div>
                    {result.qualityRating !== null && (
                      <div className="absolute bottom-2 right-2">
                        {result.qualityRating > 0 ? (
                          <ThumbsUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <ThumbsDown className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <Link
                      href={`/shop/${result.productSlug}`}
                      className="text-sm font-medium text-gray-900 hover:text-purple-600 truncate block"
                    >
                      {result.productName}
                    </Link>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(result.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="flex items-center text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
