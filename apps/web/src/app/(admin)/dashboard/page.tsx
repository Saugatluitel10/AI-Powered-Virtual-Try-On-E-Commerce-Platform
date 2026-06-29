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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { formatCurrency, getStatusColor } from "@/lib/utils";

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

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: AdminDashboard }>("/admin/dashboard")
      .then((res) => setData(res.data.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 max-w-md">
          <p className="font-medium">Access Denied</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: "Total Users", value: data.totalUsers, icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Active Products", value: data.totalProducts, icon: Package, color: "bg-purple-100 text-purple-600" },
    { label: "Total Orders", value: data.totalOrders, icon: ShoppingCart, color: "bg-green-100 text-green-600" },
    { label: "Revenue", value: formatCurrency(data.totalRevenue, "NPR"), icon: DollarSign, color: "bg-emerald-100 text-emerald-600" },
    { label: "Try-Ons Today", value: data.tryOnSessionsToday, icon: Camera, color: "bg-orange-100 text-orange-600" },
    { label: "Conversion Rate", value: `${data.conversionRate}%`, icon: TrendingUp, color: "bg-pink-100 text-pink-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <Link href="/dashboard/analytics">
            <Button variant="outline" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Recent Orders
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-3 font-medium">Order</th>
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Items</th>
                        <th className="pb-3 font-medium">Total</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((o) => (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-3 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                          <td className="py-3">{o.customerName}</td>
                          <td className="py-3">{o.itemCount}</td>
                          <td className="py-3 font-medium">{formatCurrency(o.totalAmount, o.currency)}</td>
                          <td className="py-3">
                            <Badge className={getStatusColor(o.status)}>{o.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders by Status */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Orders (Last 7 Days)</h3>
              <div className="space-y-3">
                {data.ordersByStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <Badge className={getStatusColor(s.status)}>{s.status}</Badge>
                    <span className="text-lg font-bold text-gray-900">{s.count}</span>
                  </div>
                ))}
                {data.ordersByStatus.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No orders in the last 7 days.</p>
                )}
              </div>

              <div className="border-t mt-6 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Platform Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Try-On Sessions</span>
                    <span className="font-medium">{data.tryOnSessionsTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Active Cart Items</span>
                    <span className="font-medium">{data.activeCartItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Try-On → Purchase</span>
                    <span className="font-medium">{data.conversionRate}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
