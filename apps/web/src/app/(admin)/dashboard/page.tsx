"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Camera,
  TrendingUp,
  Activity,
  Loader2,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface AdminDashboard {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  tryOnSessionsToday: number;
  tryOnSessionsTotal: number;
  conversionRate: number;
  activeCartItems: number;
  recentOrders: Array<{
    id: string;
    status: string;
    totalAmount: number;
    currency: string;
    customerName: string;
    itemCount: number;
    createdAt: string;
  }>;
  ordersByStatus: Array<{ status: string; count: number }>;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-secondary-container text-secondary",
  confirmed: "bg-surface-container-high text-primary",
  processing: "bg-surface-container-high text-on-surface-variant",
  shipped: "bg-secondary-container text-secondary",
  delivered: "bg-surface-container text-primary",
  cancelled: "bg-error-container text-error",
  refund_requested: "bg-secondary-container text-secondary",
  refunded: "bg-error-container text-error",
};

const DEMO_DASHBOARD: AdminDashboard = {
  totalUsers: 0,
  totalProducts: 0,
  totalOrders: 0,
  totalRevenue: 0,
  tryOnSessionsToday: 0,
  tryOnSessionsTotal: 0,
  conversionRate: 0,
  activeCartItems: 0,
  recentOrders: [],
  ordersByStatus: [],
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: AdminDashboard }>("/admin/dashboard")
      .then((res) => setData(res.data.data))
      .catch(() => setData(DEMO_DASHBOARD))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-secondary animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: "Total Users", value: data.totalUsers, icon: Users },
    { label: "Active Products", value: data.totalProducts, icon: Package },
    { label: "Total Orders", value: data.totalOrders, icon: ShoppingCart },
    { label: "Revenue", value: formatCurrency(data.totalRevenue, "NPR"), icon: DollarSign },
    { label: "Try-Ons Today", value: data.tryOnSessionsToday, icon: Camera },
    { label: "Conversion", value: `${data.conversionRate}%`, icon: TrendingUp },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[28px] text-primary">Dashboard</h1>
          <p className="text-on-surface-variant text-sm mt-1">Platform overview and recent activity</p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-on-surface-variant transition-all active:scale-[0.98]"
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-outline-variant/30 border border-outline-variant/30 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-surface p-5">
              <Icon className="w-5 h-5 text-secondary mb-3" />
              <p className="text-xl font-display text-primary">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mt-1">
                {s.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 border border-outline-variant/30">
          <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
              <Activity className="w-4 h-4 text-secondary" />
              Recent Orders
            </h3>
            <Link
              href="/dashboard/orders"
              className="text-[10px] font-bold uppercase tracking-[0.15em] text-secondary editorial-underline flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {data.recentOrders.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="w-8 h-8 text-outline-variant mx-auto mb-3" />
                <p className="text-on-surface-variant text-sm">No orders yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-left">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Order</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Customer</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Items</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Total</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-primary">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-5 py-3 text-on-surface">{o.customerName}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{o.itemCount}</td>
                      <td className="px-5 py-3 font-medium text-primary">{formatCurrency(o.totalAmount, o.currency)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${STATUS_STYLES[o.status] ?? "bg-surface-container text-on-surface-variant"}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Orders by Status + Platform Metrics */}
        <div className="border border-outline-variant/30">
          <div className="p-5 border-b border-outline-variant/30">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
              Orders — Last 7 Days
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {data.ordersByStatus.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-4">No orders in the last 7 days.</p>
            ) : (
              data.ordersByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${STATUS_STYLES[s.status] ?? "bg-surface-container text-on-surface-variant"}`}>
                    {s.status}
                  </span>
                  <span className="font-display text-lg text-primary">{s.count}</span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-outline-variant/30 p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-4">
              Platform Metrics
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Total Try-Ons</span>
                <span className="font-medium text-primary">{data.tryOnSessionsTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Active Carts</span>
                <span className="font-medium text-primary">{data.activeCartItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Try-On → Purchase</span>
                <span className="font-medium text-secondary">{data.conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
