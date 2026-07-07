"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface ProductVariant {
  id: string;
  size: string;
  stock: number;
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  currency: string;
  isActive: boolean;
  tryOnEnabled: boolean;
  images: string[];
  variants: ProductVariant[];
  brandName: string;
  createdAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      const res = await api.get<{
        data: { items: ProductItem[]; totalPages: number };
      }>(`/products?${params}`);
      setProducts(res.data.data.items);
      setTotalPages(res.data.data.totalPages);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = ["", "tops", "bottoms", "dresses", "sets", "outerwear", "accessories"];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[28px] text-primary">Products</h1>
          <p className="text-on-surface-variant text-sm mt-1">Browse and manage product catalog</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-transparent border-0 border-b border-outline-variant py-2.5 pl-6 pr-0 focus:ring-0 focus:border-secondary transition-all placeholder:text-outline-variant/50 text-sm"
          />
        </div>
        <div className="flex gap-px bg-outline-variant/30">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                category === cat
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-on-surface-variant hover:text-primary"
              }`}
            >
              {cat || "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-secondary animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="border border-outline-variant/30 p-16 text-center">
          <Package className="w-10 h-10 text-outline-variant mx-auto mb-4" />
          <p className="text-on-surface-variant">No products found.</p>
        </div>
      ) : (
        <>
          <div className="border border-outline-variant/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Product</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Category</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Brand</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Price</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Stock</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Try-On</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                  return (
                    <tr key={product.id} className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-surface-container flex-shrink-0 overflow-hidden">
                            {product.images[0] && (
                              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <span className="font-medium text-primary">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant capitalize">{product.category}</td>
                      <td className="px-5 py-4 text-on-surface-variant">{product.brandName}</td>
                      <td className="px-5 py-4 font-medium text-primary">
                        {formatCurrency(product.basePrice, product.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm ${totalStock > 0 ? "text-primary" : "text-error"}`}>
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-surface-container text-primary">
                            <Eye className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-error-container text-error">
                            <EyeOff className="w-3 h-3" /> Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block w-2 h-2 rounded-full ${product.tryOnEnabled ? "bg-secondary" : "bg-outline-variant"}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="border border-outline-variant/50 p-2 text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="border border-outline-variant/50 p-2 text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
