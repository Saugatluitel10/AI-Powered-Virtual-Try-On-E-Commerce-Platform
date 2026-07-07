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
  RefreshCw,
} from "lucide-react";
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

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  pending: { label: "Pending", style: "bg-secondary-container text-secondary" },
  confirmed: { label: "Confirmed", style: "bg-surface-container-high text-primary" },
  processing: { label: "Processing", style: "bg-surface-container-high text-on-surface-variant" },
  shipped: { label: "Shipped", style: "bg-secondary-container text-secondary" },
  delivered: { label: "Delivered", style: "bg-surface-container text-primary" },
  cancelled: { label: "Cancelled", style: "bg-error-container text-error" },
  refund_requested: { label: "Refund Req.", style: "bg-secondary-container text-secondary" },
  refunded: { label: "Refunded", style: "bg-error-container text-error" },
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
      setOrders([]);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[28px] text-primary">Orders</h1>
          <p className="text-on-surface-variant text-sm mt-1">Manage and fulfill customer orders</p>
        </div>
        <button
          onClick={loadOrders}
          className="flex items-center gap-2 border border-outline-variant/50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary hover:border-primary transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${
            statusFilter === ""
              ? "bg-primary text-on-primary"
              : "border border-outline-variant/50 text-on-surface-variant hover:text-primary"
          }`}
          onClick={() => { setStatusFilter(""); setPage(1); }}
        >
          All
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${
              statusFilter === key
                ? "bg-primary text-on-primary"
                : "border border-outline-variant/50 text-on-surface-variant hover:text-primary"
            }`}
            onClick={() => { setStatusFilter(key); setPage(1); }}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-secondary animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-outline-variant/30 p-16 text-center">
          <Package className="w-10 h-10 text-outline-variant mx-auto mb-4" />
          <p className="text-on-surface-variant">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const nextStatuses = NEXT_STATUS[order.status] ?? [];
            const isExpanded = expandedOrder === order.id;
            const cfg = STATUS_CONFIG[order.status];

            return (
              <div key={order.id} className="border border-outline-variant/30 bg-surface">
                <div className="p-5 flex items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-mono text-sm font-medium text-primary">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${cfg?.style ?? "bg-surface-container text-on-surface-variant"}`}>
                        {cfg?.label ?? order.status}
                      </span>
                      {order.returnRequestCount > 0 && (
                        <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-secondary-container text-secondary">
                          {order.returnRequestCount} return(s)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface">
                      {order.customerName} &middot; {order.itemCount} item(s) &middot;{" "}
                      <span className="font-medium">{formatCurrency(order.totalAmount, order.currency)}</span>
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-1">
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
                            <input
                              placeholder="Tracking #"
                              value={trackingInputs[order.id] ?? ""}
                              onChange={(e) =>
                                setTrackingInputs((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              className="w-32 bg-transparent border-b border-outline-variant py-1.5 px-0 text-xs focus:ring-0 focus:border-secondary"
                            />
                            <button
                              onClick={() => updateStatus(order.id, ns)}
                              disabled={updating === order.id}
                              className="bg-primary text-on-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-on-surface-variant transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              {updating === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Truck className="w-3 h-3" />
                                  Ship
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={ns}
                          onClick={() => updateStatus(order.id, ns)}
                          disabled={updating === order.id}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-all disabled:opacity-50 ${
                            ns === "cancelled"
                              ? "border border-error/30 text-error hover:bg-error-container"
                              : "bg-primary text-on-primary hover:bg-on-surface-variant"
                          }`}
                        >
                          {updating === order.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            STATUS_CONFIG[ns]?.label ?? ns
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-outline-variant/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant my-4">
                      Order Items
                    </p>
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 text-sm">
                          <div className="w-10 h-10 bg-surface-container flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-primary">{item.productName}</p>
                            <p className="text-[11px] text-on-surface-variant">
                              Size: {item.size} &times; {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-primary">
                            {formatCurrency(item.priceAtTime * item.quantity, order.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-4 mt-4 border-t border-outline-variant/20 text-sm">
                      <span className="font-bold uppercase tracking-[0.1em] text-[11px] text-on-surface-variant">Total</span>
                      <span className="font-display text-lg text-primary">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </span>
                    </div>
                    {order.paymentRef && (
                      <p className="text-[11px] text-on-surface-variant mt-2">
                        Payment ref: {order.paymentRef}
                      </p>
                    )}
                    <p className="text-[11px] text-on-surface-variant">
                      Email: {order.customerEmail}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

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
        </div>
      )}
    </div>
  );
}
