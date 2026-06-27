"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Truck,
  Clock,
  XCircle,
  FileText,
  RotateCcw,
  Loader2,
  ShoppingBag,
  MapPin,
  CreditCard,
  Star,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productSlug: string;
  size: string;
  quantity: number;
  priceAtTime: number;
}

interface ReturnRequest {
  id: string;
  items: unknown;
  reason: string;
  status: string;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  shippingAddress: Record<string, string> | null;
  items: OrderItem[];
  returnRequests: ReturnRequest[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_STEPS = [
  { key: "pending", label: "Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function getStatusIndex(status: string): number {
  if (status === "cancelled" || status === "refunded") return -1;
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderSuccess, setReorderSuccess] = useState(false);

  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<{ data: OrderDetail }>(`/orders/${orderId}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => router.push("/orders"))
      .finally(() => setLoading(false));
  }, [orderId, router]);

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      await api.patch(`/orders/${order.id}/cancel`);
      setOrder({ ...order, status: "cancelled" });
    } catch {
    } finally {
      setCancelling(false);
    }
  }

  async function handleReturn() {
    if (!order || !returnReason.trim() || selectedItems.size === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/orders/${order.id}/return`, {
        items: Array.from(selectedItems).map((id) => ({ orderItemId: id, quantity: 1 })),
        reason: returnReason.trim(),
      });
      const res = await api.get<{ data: OrderDetail }>(`/orders/${orderId}`);
      setOrder(res.data.data);
      setShowReturn(false);
      setReturnReason("");
      setSelectedItems(new Set());
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReorder() {
    if (!order) return;
    setReordering(true);
    try {
      await api.post(`/orders/${order.id}/reorder`);
      setReorderSuccess(true);
      setTimeout(() => setReorderSuccess(false), 3000);
    } catch {
    } finally {
      setReordering(false);
    }
  }

  async function handleSubmitReview() {
    if (!order || !reviewProductId) return;
    setReviewSubmitting(true);
    try {
      await api.post("/reviews", {
        productId: reviewProductId,
        orderId: order.id,
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim() || undefined,
      });
      setReviewedProducts((prev) => new Set(prev).add(reviewProductId));
      setReviewProductId(null);
      setReviewRating(5);
      setReviewTitle("");
      setReviewComment("");
    } catch {
    } finally {
      setReviewSubmitting(false);
    }
  }

  function toggleItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const statusIdx = getStatusIndex(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "refunded";
  const canReturn = ["delivered", "confirmed", "shipped"].includes(order.status);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const addr = order.shippingAddress;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <a
              href={`${apiUrl}/api/v1/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="w-4 h-4" />
                Invoice
              </Button>
            </a>
            {order.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel
              </Button>
            )}
            {canReturn && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowReturn(!showReturn)}
              >
                <RotateCcw className="w-4 h-4" />
                Return
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleReorder}
              disabled={reordering}
            >
              {reordering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : reorderSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
              {reorderSuccess ? "Added to Cart!" : "Reorder"}
            </Button>
          </div>
        </div>

        {/* Status Timeline */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {isCancelled ? (
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-500" />
                <div>
                  <p className="font-semibold text-red-600 capitalize">{order.status}</p>
                  <p className="text-sm text-gray-500">This order has been {order.status}.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const isActive = idx <= statusIdx;
                  const isCurrent = idx === statusIdx;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isCurrent
                              ? "bg-purple-600 text-white"
                              : isActive
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <p
                          className={`text-xs mt-1.5 font-medium ${
                            isActive ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                            idx < statusIdx ? "bg-green-400" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return Request Form */}
        {showReturn && (
          <Card className="mb-6 border-purple-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Request a Return</h3>
              <p className="text-sm text-gray-500 mb-4">Select the items you'd like to return:</p>
              <div className="space-y-2 mb-4">
                {order.items.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedItems.has(item.id)
                        ? "border-purple-300 bg-purple-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-sm font-medium">{item.productName}</span>
                    <span className="text-xs text-gray-500">Size {item.size} &times; {item.quantity}</span>
                  </label>
                ))}
              </div>
              <Textarea
                placeholder="Why are you returning these items?"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="mb-4"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={handleReturn}
                  disabled={submitting || selectedItems.size === 0 || !returnReason.trim()}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Return Request
                </Button>
                <Button variant="outline" onClick={() => setShowReturn(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Items */}
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Items</h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id}>
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/shop/${item.productSlug}`}
                          className="font-medium text-gray-900 hover:text-purple-600"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-sm text-gray-500">
                          Size: {item.size} &times; {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(item.priceAtTime * item.quantity, order.currency)}
                        </p>
                        {canReturn && !reviewedProducts.has(item.productId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:text-purple-700 gap-1"
                            onClick={() => setReviewProductId(item.productId)}
                          >
                            <Star className="w-3.5 h-3.5" />
                            Review
                          </Button>
                        )}
                        {reviewedProducts.has(item.productId) && (
                          <Badge className="bg-green-100 text-green-700 text-xs">Reviewed</Badge>
                        )}
                      </div>
                    </div>

                    {reviewProductId === item.productId && (
                      <div className="ml-20 mt-2 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= reviewRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <Input
                          placeholder="Review title (optional)"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          className="mb-2"
                        />
                        <Textarea
                          placeholder="Write your review..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={2}
                          className="mb-3"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={handleSubmitReview}
                            disabled={reviewSubmitting}
                          >
                            {reviewSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                            Submit Review
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewProductId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    </div>
                  ))}
                </div>

                <div className="border-t mt-6 pt-4 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Return Requests */}
            {order.returnRequests.length > 0 && (
              <Card className="mt-6">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Return Requests</h3>
                  <div className="space-y-3">
                    {order.returnRequests.map((rr) => (
                      <div key={rr.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={getStatusColor(rr.status)}>{rr.status}</Badge>
                          <span className="text-xs text-gray-500">{formatDate(rr.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{rr.reason}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shipping Address */}
            {addr && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    Shipping Address
                  </h3>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {addr.name && <p className="font-medium text-gray-900">{addr.name}</p>}
                    {addr.street && <p>{addr.street}</p>}
                    {addr.city && (
                      <p>
                        {addr.city}
                        {addr.state ? `, ${addr.state}` : ""}
                        {addr.zip ? ` ${addr.zip}` : ""}
                      </p>
                    )}
                    {addr.phone && <p>{addr.phone}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  Payment
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="text-gray-500">Method: </span>
                    <span className="capitalize font-medium">{order.paymentMethod ?? "N/A"}</span>
                  </p>
                  {order.paymentRef && (
                    <p>
                      <span className="text-gray-500">Ref: </span>
                      {order.paymentRef}
                    </p>
                  )}
                  <p>
                    <span className="text-gray-500">Status: </span>
                    <Badge className={getStatusColor(order.status)} variant="secondary">
                      {order.status}
                    </Badge>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
