"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface OrderItem {
  productName: string;
  productImage: string | null;
  size: string;
  quantity: number;
  priceAtTime: number;
}

interface AdminOrder {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  trackingNumber: string | null;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  items: OrderItem[];
  returnRequestCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  processing: { label: "Processing", color: "bg-indigo-100 text-indigo-700", icon: RefreshCw },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500", icon: XCircle },
  refund_requested: { label: "Refund Requested", color: "bg-orange-100 text-orange-700", icon: RefreshCw },
  refunded: { label: "Refunded", color: "bg-red-100 text-red-600", icon: XCircle },
};

const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
  refund_requested: ["refunded"],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get<{
        data: { items: AdminOrder[]; totalPages: number };
      }>(`/admin/orders?${params}`);
      setOrders(res.data.data.items);
      setTotalPages(res.data.data.totalPages);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (newStatus === "shipped" && trackingInputs[orderId]) {
        body.trackingNumber = trackingInputs[orderId];
      }
      await api.patch(`/admin/orders/${orderId}/status`, body);
      await loadOrders();
    } catch {
    } finally {
      setUpdating(null);
    }
  }

  const statusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
    return <Badge className={cfg.color}>{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">Order Management</h1>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => { setStatusFilter(""); setPage(1); }}
        >
          All
        </Button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Button
            key={key}
            variant={statusFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(key); setPage(1); }}
          >
            {cfg.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const nextStatuses = NEXT_STATUS[order.status] ?? [];
            const isExpanded = expandedOrder === order.id;

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        setExpandedOrder(isExpanded ? null : order.id)
                      }
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        {statusBadge(order.status)}
                        {order.returnRequestCount > 0 && (
                          <Badge className="bg-orange-100 text-orange-700">
                            {order.returnRequestCount} return(s)
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {order.customerName} &middot; {order.itemCount} item(s) &middot;{" "}
                        {formatCurrency(order.totalAmount, order.currency)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleString()} &middot;{" "}
                        {order.paymentMethod ?? "N/A"}
                        {order.trackingNumber && ` · Tracking: ${order.trackingNumber}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {nextStatuses.map((ns) => {
                        if (ns === "shipped") {
                          return (
                            <div key={ns} className="flex items-center gap-1">
                              <Input
                                placeholder="Tracking #"
                                value={trackingInputs[order.id] ?? ""}
                                onChange={(e) =>
                                  setTrackingInputs((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value,
                                  }))
                                }
                                className="w-32 h-8 text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => updateStatus(order.id, ns)}
                                disabled={updating === order.id}
                                className="bg-purple-600 hover:bg-purple-700 h-8 text-xs"
                              >
                                {updating === order.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Truck className="w-3 h-3 mr-1" />
                                    Ship
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        }
                        return (
                          <Button
                            key={ns}
                            variant={ns === "cancelled" ? "outline" : "default"}
                            size="sm"
                            onClick={() => updateStatus(order.id, ns)}
                            disabled={updating === order.id}
                            className={
                              ns === "cancelled"
                                ? "text-red-600 border-red-200 hover:bg-red-50 h-8 text-xs"
                                : "bg-purple-600 hover:bg-purple-700 h-8 text-xs"
                            }
                          >
                            {updating === order.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              STATUS_CONFIG[ns]?.label ?? ns
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Order Items
                      </p>
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 text-sm"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.productName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Size: {item.size} &times; {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium">
                            {formatCurrency(
                              item.priceAtTime * item.quantity,
                              order.currency
                            )}
                          </p>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t text-sm font-semibold">
                        <span>Total</span>
                        <span>
                          {formatCurrency(order.totalAmount, order.currency)}
                        </span>
                      </div>
                      {order.paymentRef && (
                        <p className="text-xs text-gray-400">
                          Payment ref: {order.paymentRef}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Email: {order.customerEmail}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="flex items-center text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
