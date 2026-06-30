"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Search, X, ShoppingBag, LayoutGrid, List, Megaphone } from "lucide-react";
import api from "@/lib/api";
import type { ProductListItem } from "@/types/product";
import ProductCard from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useBodyProfileStore } from "@/store/bodyProfileStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 18;

const CATEGORIES = ["tops", "bottoms", "dresses", "sets", "accessories", "outerwear"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "ONE_SIZE"];
const GENDERS = [
  { value: "womens", label: "Women's" },
  { value: "mens", label: "Men's" },
  { value: "unisex", label: "Unisex" },
];
const BODY_TYPES = [
  { value: "HOURGLASS", label: "Hourglass" },
  { value: "PEAR", label: "Pear" },
  { value: "APPLE", label: "Apple" },
  { value: "RECTANGLE", label: "Rectangle" },
  { value: "INVERTED_TRIANGLE", label: "Inverted Triangle" },
];

// ─── Sponsored banners ───────────────────────────────────────────────────────
interface PromoBanner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  placement: string;
  brand: { name: string };
}

async function fetchBanners(): Promise<PromoBanner[]> {
  const res = await api.get<{ data: PromoBanner[] }>("/products/banners/active");
  return res.data.data;
}

// ─── Filter state ─────────────────────────────────────────────────────────────
interface Filters {
  q: string;
  category: string;
  gender: string;
  size: string;
  bodyType: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  isTryonEnabled: boolean;
  sort: string;
}

const DEFAULT_FILTERS: Filters = {
  q: "",
  category: "",
  gender: "",
  size: "",
  bodyType: "",
  brand: "",
  minPrice: "",
  maxPrice: "",
  isTryonEnabled: false,
  sort: "newest",
};

// ─── API fetch ────────────────────────────────────────────────────────────────
interface ProductPage {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchProducts(filters: Filters, page: number): Promise<ProductPage> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));
  params.set("sort", filters.sort);
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.size) params.set("size", filters.size);
  if (filters.bodyType) params.set("bodyType", filters.bodyType);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.isTryonEnabled) params.set("isTryonEnabled", "true");

  const res = await api.get<{ data: ProductPage }>(`/products?${params}`);
  return res.data.data;
}

// ─── Filter panel (shared between sidebar and sheet) ─────────────────────────
function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, value: string | boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Category
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onChange("category", filters.category === cat ? "" : cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs border capitalize transition-colors",
                filters.category === cat
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Gender
        </p>
        <div className="flex flex-wrap gap-1.5">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              onClick={() => onChange("gender", filters.gender === g.value ? "" : g.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs border transition-colors",
                filters.gender === g.value
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Size
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => onChange("size", filters.size === s ? "" : s)}
              className={cn(
                "w-12 py-1 rounded-md text-xs border transition-colors",
                filters.size === s
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Body type */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Body Type
        </p>
        <div className="space-y-1.5">
          {BODY_TYPES.map((bt) => (
            <button
              key={bt.value}
              onClick={() => onChange("bodyType", filters.bodyType === bt.value ? "" : bt.value)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-lg text-xs border transition-colors",
                filters.bodyType === bt.value
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              )}
            >
              {bt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Brand
        </p>
        <Input
          placeholder="Search brand..."
          value={filters.brand}
          onChange={(e) => onChange("brand", e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      {/* Price range */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Price (NPR)
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onChange("minPrice", e.target.value)}
            className="h-8 text-xs"
          />
          <span className="text-gray-400 text-xs">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onChange("maxPrice", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Try-on only */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.isTryonEnabled}
          onChange={(e) => onChange("isTryonEnabled", e.target.checked)}
          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm text-gray-700">Try-on enabled only</span>
      </label>

      <Button variant="outline" className="w-full text-xs" onClick={onReset}>
        Clear all filters
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const { profile } = useBodyProfileStore();
  const { data: banners } = useQuery({
    queryKey: ["banners-active"],
    queryFn: fetchBanners,
    staleTime: 5 * 60 * 1000,
  });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState<Filters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const changeFilter = useCallback((key: keyof Filters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setCommitted(DEFAULT_FILTERS);
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (q.length < 2) { setSuggestions([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get<{ data: Array<{ id: string; name: string; slug: string }> }>(
          `/products/search/autocomplete?q=${encodeURIComponent(q)}`
        );
        setSuggestions(res.data.data);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 300);
  }, []);

  // Commit filters on apply (debounced by search input blur / immediate for toggles)
  const applyFilters = useCallback(() => {
    setCommitted({ ...filters, q: search });
  }, [filters, search]);

  // Auto-apply when filter toggles change (not search, which needs Enter/blur)
  useEffect(() => {
    setCommitted((prev) => ({
      ...prev,
      category: filters.category,
      gender: filters.gender,
      size: filters.size,
      bodyType: filters.bodyType,
      brand: filters.brand,
      isTryonEnabled: filters.isTryonEnabled,
      sort: filters.sort,
    }));
  }, [
    filters.category,
    filters.gender,
    filters.size,
    filters.bodyType,
    filters.brand,
    filters.isTryonEnabled,
    filters.sort,
  ]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: ["products", committed],
      queryFn: ({ pageParam }) => fetchProducts(committed, pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (last, all) =>
        last.totalPages > all.length ? all.length + 1 : undefined,
    });

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allProducts = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const activeFilterCount = [
    committed.category,
    committed.gender,
    committed.size,
    committed.bodyType,
    committed.brand,
    committed.minPrice,
    committed.maxPrice,
    committed.isTryonEnabled ? "1" : "",
    committed.q,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shop</h1>
        {profile?.bodyType && (
          <p className="text-sm text-gray-500 mt-1">
            Showing results compatible with your{" "}
            <span className="text-purple-600 font-medium capitalize">
              {profile.bodyType.toLowerCase()}
            </span>{" "}
            body type
          </p>
        )}
      </div>

      {/* Search + sort bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchSuggestions(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { applyFilters(); setShowSuggestions(false); }
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setSuggestions([]);
                setCommitted((prev) => ({ ...prev, q: "" }));
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearch(s.name);
                    setShowSuggestions(false);
                    setCommitted((prev) => ({ ...prev, q: s.name }));
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <Select
          value={filters.sort}
          onValueChange={(v) => changeFilter("sort", v ?? "newest")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low → High</SelectItem>
            <SelectItem value="price_desc">Price: High → Low</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="hidden sm:flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2", viewMode === "grid" ? "bg-purple-100 text-purple-700" : "text-gray-400 hover:text-gray-600")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2", viewMode === "list" ? "bg-purple-100 text-purple-700" : "text-gray-400 hover:text-gray-600")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile filter trigger */}
        <Sheet>
          <SheetTrigger>
            <Button variant="outline" className="lg:hidden relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterPanel
                filters={filters}
                onChange={changeFilter}
                onReset={resetFilters}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 space-y-1">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-sm">Filters</p>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-xs text-purple-600 hover:underline"
              >
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
          <FilterPanel
            filters={filters}
            onChange={changeFilter}
            onReset={resetFilters}
          />
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {/* Sponsored banners */}
          {banners && banners.length > 0 && (
            <div className="mb-6 space-y-3">
              {banners.map((banner) => (
                <a
                  key={banner.id}
                  href={banner.linkUrl ?? "#"}
                  className="block relative rounded-xl overflow-hidden group"
                  aria-label={`Sponsored: ${banner.title} by ${banner.brand.name}`}
                >
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                    <div className="px-6">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Megaphone className="w-3 h-3 text-yellow-400" />
                        <span className="text-[10px] text-yellow-400 uppercase font-semibold tracking-wider">
                          Sponsored
                        </span>
                      </div>
                      <p className="text-white font-bold text-lg">{banner.title}</p>
                      <p className="text-white/70 text-xs">{banner.brand.name}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Result count */}
          <p className="text-sm text-gray-500 mb-4">
            {isFetching && allProducts.length === 0
              ? "Loading…"
              : `${total.toLocaleString()} product${total !== 1 ? "s" : ""}`}
          </p>

          {/* Grid / List */}
          {allProducts.length > 0 ? (
            <div className={viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-3"
            }>
              {allProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  highlightBodyType={profile?.bodyType ?? null}
                  priority={idx < 6}
                  layout={viewMode}
                />
              ))}
            </div>
          ) : !isFetching ? (
            <div className="text-center py-24 text-gray-400">
              <ShoppingBag className="h-10 w-10 mx-auto text-gray-300" />
              <p className="mt-3 font-medium">No products found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <ProductSkeleton />
          )}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="h-8 mt-6">
            {isFetchingNextPage && (
              <div className="flex justify-center">
                <div className="h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-gray-100 animate-pulse">
          <div className="aspect-[3/4] rounded-t-2xl bg-gray-200" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
