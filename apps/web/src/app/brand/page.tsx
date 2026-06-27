"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Plus,
  Upload,
  Edit3,
  Loader2,
  BarChart3,
  FileSpreadsheet,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Star,
  MessageSquare,
  Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type Tab = "dashboard" | "products" | "sales" | "commission" | "reviews" | "inventory";

interface DashboardData {
  productCount: number;
  totalOrders: number;
  totalRevenue: number;
  currency: string;
  topProducts: Array<{
    productId: string;
    productName: string;
    productImage: string | null;
    totalSold: number;
    orderCount: number;
  }>;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  sizes: string[];
  category: string;
  images: string[];
  isActive: boolean;
  isTryonEnabled: boolean;
  createdAt: string;
}

interface SaleItem {
  orderItemId: string;
  orderId: string;
  orderStatus: string;
  productName: string;
  productImage: string | null;
  size: string;
  quantity: number;
  priceAtTime: number;
  lineTotal: number;
  currency: string;
  customerName: string;
  orderedAt: string;
}

interface CommissionData {
  brandName: string;
  commissionRate: number;
  totalRevenue: number;
  commissionAmount: number;
  payoutAmount: number;
  currency: string;
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
    commission: number;
    payout: number;
  }>;
}

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  reply: string | null;
  repliedAt: string | null;
  userName: string;
  productName: string;
  createdAt: string;
}

interface InventoryItem {
  id: string;
  name: string;
  variants: Array<{ size: string; stock: number }>;
}

export default function BrandPortalPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [commission, setCommission] = useState<CommissionData | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [stockEdits, setStockEdits] = useState<Record<string, Record<string, string>>>({});

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Product form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    currency: "NPR",
    sizes: "",
    category: "",
    garmentType: "",
    gender: "",
    images: "",
    isTryonEnabled: false,
  });

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  async function loadTab(t: Tab) {
    setLoading(true);
    setError(null);
    try {
      if (t === "dashboard") {
        const res = await api.get<{ data: DashboardData }>("/brand/dashboard");
        setDashboard(res.data.data);
      } else if (t === "products") {
        const res = await api.get<{ data: { items: ProductData[] } }>("/brand/products?pageSize=50");
        setProducts(res.data.data.items);
      } else if (t === "sales") {
        const res = await api.get<{ data: { items: SaleItem[] } }>("/brand/sales?pageSize=50");
        setSales(res.data.data.items);
      } else if (t === "commission") {
        const res = await api.get<{ data: CommissionData }>("/brand/commission");
        setCommission(res.data.data);
      } else if (t === "reviews") {
        const res = await api.get<{ data: { items: ReviewItem[] } }>("/brand/reviews?pageSize=50");
        setReviews(res.data.data.items);
      } else if (t === "inventory") {
        const res = await api.get<{ data: { items: InventoryItem[] } }>("/brand/inventory?pageSize=50");
        setInventory(res.data.data.items);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ name: "", description: "", price: "", currency: "NPR", sizes: "", category: "", garmentType: "", gender: "", images: "", isTryonEnabled: false });
  }

  async function handleAddProduct() {
    setSubmitting(true);
    try {
      await api.post("/brand/products", {
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        currency: form.currency,
        sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        category: form.category,
        garmentType: form.garmentType || undefined,
        gender: form.gender || undefined,
        images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
        isTryonEnabled: form.isTryonEnabled,
      });
      resetForm();
      setShowAddProduct(false);
      loadTab("products");
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditProduct(id: string) {
    setSubmitting(true);
    try {
      await api.patch(`/brand/products/${id}`, {
        name: form.name || undefined,
        description: form.description || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        sizes: form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        category: form.category || undefined,
        images: form.images ? form.images.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        isTryonEnabled: form.isTryonEnabled,
      });
      setEditingProduct(null);
      resetForm();
      loadTab("products");
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      await api.patch(`/brand/products/${id}`, { isActive: !current });
      loadTab("products");
    } catch {}
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const priceIdx = headers.indexOf("price");
    const sizesIdx = headers.indexOf("sizes");
    const categoryIdx = headers.indexOf("category");

    if (nameIdx === -1 || priceIdx === -1 || categoryIdx === -1) {
      alert("CSV must have name, price, and category columns.");
      return;
    }

    const parsed = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      return {
        name: cols[nameIdx],
        price: parseFloat(cols[priceIdx]),
        sizes: sizesIdx >= 0 ? cols[sizesIdx].split(";").map((s) => s.trim()) : [],
        category: cols[categoryIdx],
        description: headers.indexOf("description") >= 0 ? cols[headers.indexOf("description")] : undefined,
        gender: headers.indexOf("gender") >= 0 ? cols[headers.indexOf("gender")] : undefined,
      };
    }).filter((p) => p.name && !isNaN(p.price));

    if (parsed.length === 0) return;

    setSubmitting(true);
    try {
      await api.post("/brand/products/bulk", { products: parsed });
      loadTab("products");
    } catch {
    } finally {
      setSubmitting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "products", label: "Products", icon: <Package className="w-4 h-4" /> },
    { key: "sales", label: "Sales", icon: <ShoppingCart className="w-4 h-4" /> },
    { key: "commission", label: "Commission", icon: <DollarSign className="w-4 h-4" /> },
    { key: "reviews", label: "Reviews", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "inventory", label: "Inventory", icon: <Boxes className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Brand Portal</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {tab === "dashboard" && dashboard && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard.productCount}</p>
                        <p className="text-sm text-gray-500">Products</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard.totalOrders}</p>
                        <p className="text-sm text-gray-500">Orders</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(dashboard.totalRevenue, dashboard.currency)}
                        </p>
                        <p className="text-sm text-gray-500">Revenue</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {dashboard.topProducts.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Top Products</h3>
                      <div className="space-y-3">
                        {dashboard.topProducts.map((p, idx) => (
                          <div key={p.productId} className="flex items-center gap-4">
                            <span className="text-sm font-bold text-gray-400 w-6">#{idx + 1}</span>
                            <div className="relative w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {p.productImage ? (
                                <Image src={p.productImage} alt={p.productName} fill className="object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{p.productName}</p>
                              <p className="text-xs text-gray-500">
                                {p.totalSold} sold &middot; {p.orderCount} orders
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Products Tab */}
            {tab === "products" && (
              <div>
                <div className="flex gap-2 mb-4">
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 gap-1.5"
                    onClick={() => { resetForm(); setShowAddProduct(true); setEditingProduct(null); }}
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </Button>
                  <Button variant="outline" className="gap-1.5" onClick={() => csvInputRef.current?.click()}>
                    <FileSpreadsheet className="w-4 h-4" /> CSV Upload
                  </Button>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                  />
                </div>

                {/* Add/Edit Product Form */}
                {(showAddProduct || editingProduct) && (
                  <Card className="mb-6 border-purple-200">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        {editingProduct ? "Edit Product" : "New Product"}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Name *</label>
                          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Price *</label>
                          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Category *</label>
                          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="tops, bottoms, dresses..." />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Sizes * (comma-separated)</label>
                          <Input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S, M, L, XL" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Garment Type</label>
                          <Input value={form.garmentType} onChange={(e) => setForm({ ...form, garmentType: e.target.value })} placeholder="t-shirt, kurta..." />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Gender</label>
                          <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="male, female, unisex" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Description</label>
                          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Image URLs (comma-separated)</label>
                          <Input value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.isTryonEnabled}
                            onChange={(e) => setForm({ ...form, isTryonEnabled: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <label className="text-sm font-medium text-gray-700">Enable Virtual Try-On</label>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => editingProduct ? handleEditProduct(editingProduct) : handleAddProduct()}
                          disabled={submitting || !form.name || !form.price || !form.category}
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          {editingProduct ? "Update" : "Create"}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowAddProduct(false); setEditingProduct(null); resetForm(); }}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Product List */}
                <div className="space-y-2">
                  {products.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {p.images[0] ? (
                            <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(p.price, p.currency)} &middot; {p.category} &middot; {p.sizes.join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.isTryonEnabled && <Badge className="bg-purple-100 text-purple-700 text-xs">Try-On</Badge>}
                          <Badge className={p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                            {p.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingProduct(p.id);
                              setShowAddProduct(false);
                              setForm({
                                name: p.name,
                                description: "",
                                price: p.price.toString(),
                                currency: p.currency,
                                sizes: p.sizes.join(", "),
                                category: p.category,
                                garmentType: "",
                                gender: "",
                                images: p.images.join(", "),
                                isTryonEnabled: p.isTryonEnabled,
                              });
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleActive(p.id, p.isActive)}>
                            {p.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {products.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No products yet. Add your first product above.</div>
                  )}
                </div>
              </div>
            )}

            {/* Sales Tab */}
            {tab === "sales" && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Sales History</h3>
                  {sales.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No sales yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-3 font-medium">Product</th>
                            <th className="pb-3 font-medium">Customer</th>
                            <th className="pb-3 font-medium">Size</th>
                            <th className="pb-3 font-medium">Qty</th>
                            <th className="pb-3 font-medium">Total</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((s) => (
                            <tr key={s.orderItemId} className="border-b last:border-0">
                              <td className="py-3 font-medium">{s.productName}</td>
                              <td className="py-3">{s.customerName}</td>
                              <td className="py-3">{s.size}</td>
                              <td className="py-3">{s.quantity}</td>
                              <td className="py-3 font-medium">{formatCurrency(s.lineTotal, s.currency)}</td>
                              <td className="py-3">
                                <Badge className={getStatusColor(s.orderStatus)}>{s.orderStatus}</Badge>
                              </td>
                              <td className="py-3 text-gray-500">{new Date(s.orderedAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Commission Tab */}
            {tab === "commission" && commission && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(commission.totalRevenue, commission.currency)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-500 mb-1">Platform Commission ({(commission.commissionRate * 100).toFixed(0)}%)</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(commission.commissionAmount, commission.currency)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-500 mb-1">Your Payout</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(commission.payoutAmount, commission.currency)}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Monthly Breakdown</h3>
                    {commission.monthlyBreakdown.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No data yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-3 font-medium">Month</th>
                            <th className="pb-3 font-medium">Revenue</th>
                            <th className="pb-3 font-medium">Commission</th>
                            <th className="pb-3 font-medium">Payout</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commission.monthlyBreakdown.map((m) => (
                            <tr key={m.month} className="border-b last:border-0">
                              <td className="py-3 font-medium">{m.month}</td>
                              <td className="py-3">{formatCurrency(m.revenue, commission.currency)}</td>
                              <td className="py-3 text-red-600">{formatCurrency(m.commission, commission.currency)}</td>
                              <td className="py-3 text-green-600 font-medium">{formatCurrency(m.payout, commission.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Reviews Tab */}
            {tab === "reviews" && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Customer Reviews</h3>
                  {reviews.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No reviews yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((r) => (
                        <div key={r.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= r.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              {r.title && (
                                <p className="font-medium text-gray-900">{r.title}</p>
                              )}
                            </div>
                            <div className="text-right text-xs text-gray-500">
                              <p>{r.productName}</p>
                              <p>{new Date(r.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {r.comment && (
                            <p className="text-sm text-gray-700 mb-2">{r.comment}</p>
                          )}
                          <p className="text-xs text-gray-500 mb-2">— {r.userName}</p>

                          {r.reply ? (
                            <div className="bg-gray-50 rounded-md p-3 mt-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">Your reply</p>
                              <p className="text-sm text-gray-700">{r.reply}</p>
                            </div>
                          ) : (
                            <>
                              {replyingTo === r.id ? (
                                <div className="mt-2">
                                  <Textarea
                                    placeholder="Write a reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={2}
                                    className="mb-2"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-purple-600 hover:bg-purple-700"
                                      disabled={replySubmitting || !replyText.trim()}
                                      onClick={async () => {
                                        setReplySubmitting(true);
                                        try {
                                          await api.post(`/brand/reviews/${r.id}/reply`, {
                                            reply: replyText.trim(),
                                          });
                                          setReplyingTo(null);
                                          setReplyText("");
                                          loadTab("reviews");
                                        } catch {
                                        } finally {
                                          setReplySubmitting(false);
                                        }
                                      }}
                                    >
                                      {replySubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                                      Reply
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => { setReplyingTo(null); setReplyText(""); }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-purple-600 mt-1"
                                  onClick={() => setReplyingTo(r.id)}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                  Reply
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Inventory Tab */}
            {tab === "inventory" && (
              <div className="space-y-4">
                {inventory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No products found.</div>
                ) : (
                  inventory.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={async () => {
                              const edits = stockEdits[item.id];
                              if (!edits) return;
                              const variants = Object.entries(edits).map(([size, stock]) => ({
                                size,
                                stock: parseInt(stock) || 0,
                              }));
                              try {
                                await api.patch(`/brand/inventory/${item.id}`, { variants });
                                loadTab("inventory");
                                setStockEdits((prev) => {
                                  const next = { ...prev };
                                  delete next[item.id];
                                  return next;
                                });
                              } catch {}
                            }}
                            disabled={!stockEdits[item.id]}
                          >
                            Save
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {item.variants.map((v) => (
                            <div key={v.size} className="border rounded-md p-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">{v.size}</p>
                              <Input
                                type="number"
                                min="0"
                                className="h-8 text-sm"
                                defaultValue={v.stock}
                                onChange={(e) => {
                                  setStockEdits((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...(prev[item.id] ?? {}),
                                      [v.size]: e.target.value,
                                    },
                                  }));
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
