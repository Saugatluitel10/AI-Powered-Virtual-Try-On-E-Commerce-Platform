"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Undo2,
  DollarSign,
  Brain,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsData {
  period: { days: number; since: string };
  funnel: {
    uploads: number;
    bodyScans: number;
    tryOns: number;
    completedTryOns: number;
    failedTryOns: number;
    cartAdds: number;
    orders: number;
    purchases: number;
  };
  conversionByProduct: Array<{
    productId: string;
    productName: string;
    category: string;
    tryOns: number;
    purchases: number;
    conversionRate: number;
  }>;
  conversionByCategory: Array<{
    category: string;
    tryOns: number;
    purchases: number;
    conversionRate: number;
  }>;
  returnRates: {
    tryOnUsers: { orders: number; returns: number; rate: number };
    nonTryOnUsers: { orders: number; returns: number; rate: number };
  };
  revenueByBrand: Array<{ brandId: string; brandName: string; revenue: number }>;
  revenueByCategory: Array<{ category: string; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  aiModelAccuracy: {
    totalRated: number;
    positiveRatings: number;
    satisfactionRate: number;
    avgProcessingTimeMs: number;
    successRate: number;
    failureRate: number;
    totalAttempts: number;
    statusBreakdown: Record<string, number>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: AnalyticsData }>(`/admin/analytics?days=${days}`)
      .then((res) => setData(res.data.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 max-w-md">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error ?? "No data"}</p>
        </div>
      </div>
    );
  }

  const funnelSteps = [
    { label: "Uploads", value: data.funnel.uploads },
    { label: "Try-Ons", value: data.funnel.tryOns },
    { label: "Completed", value: data.funnel.completedTryOns },
    { label: "Cart Adds", value: data.funnel.cartAdds },
    { label: "Purchases", value: data.funnel.purchases },
  ];

  const maxRevenue = Math.max(...data.revenueByMonth.map((m) => m.revenue), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  days === d ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Conversion Funnel (Last {days} days)
            </h3>
            <div className="flex items-center justify-between gap-2">
              {funnelSteps.map((step, idx) => {
                const prev = idx > 0 ? funnelSteps[idx - 1].value : step.value;
                const dropOff = prev > 0 ? ((1 - step.value / prev) * 100).toFixed(0) : "0";
                return (
                  <div key={step.label} className="flex items-center gap-2 flex-1">
                    <div className="flex-1 text-center">
                      <div
                        className="mx-auto rounded-lg bg-purple-100 flex items-center justify-center"
                        style={{
                          height: `${Math.max(40, (step.value / Math.max(funnelSteps[0].value, 1)) * 120)}px`,
                          transition: "height 0.3s",
                        }}
                      >
                        <span className="text-lg font-bold text-purple-700">{step.value}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{step.label}</p>
                      {idx > 0 && (
                        <p className="text-[10px] text-red-500 mt-0.5">-{dropOff}%</p>
                      )}
                    </div>
                    {idx < funnelSteps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Conversion by Category */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Try-On Conversion by Category
              </h3>
              {data.conversionByCategory.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.conversionByCategory.map((c) => (
                    <div key={c.category} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{c.category}</p>
                        <p className="text-xs text-gray-500">{c.tryOns} try-ons, {c.purchases} purchases</p>
                      </div>
                      <Badge className={c.conversionRate >= 10 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                        {c.conversionRate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Rates */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Undo2 className="w-5 h-5 text-orange-600" />
                Return Rates: Try-On vs Non-Try-On
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">Try-On Users</p>
                  <p className="text-2xl font-bold text-green-600">{data.returnRates.tryOnUsers.rate}%</p>
                  <p className="text-xs text-gray-400">{data.returnRates.tryOnUsers.returns} / {data.returnRates.tryOnUsers.orders} orders</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">Non-Try-On</p>
                  <p className="text-2xl font-bold text-red-600">{data.returnRates.nonTryOnUsers.rate}%</p>
                  <p className="text-xs text-gray-400">{data.returnRates.nonTryOnUsers.returns} / {data.returnRates.nonTryOnUsers.orders} orders</p>
                </div>
              </div>
              {data.returnRates.tryOnUsers.rate < data.returnRates.nonTryOnUsers.rate ? (
                <div className="mt-3 bg-green-50 rounded-md p-2 text-xs text-green-700 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Try-on users have a lower return rate
                </div>
              ) : data.returnRates.tryOnUsers.orders > 0 ? (
                <div className="mt-3 bg-yellow-50 rounded-md p-2 text-xs text-yellow-700 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Return rates are similar
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue by Month */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Revenue by Month
              </h3>
              {data.revenueByMonth.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No revenue data yet.</p>
              ) : (
                <div className="flex items-end gap-2" style={{ height: 160 }}>
                  {data.revenueByMonth.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center">
                      <p className="text-[10px] text-gray-500 mb-1">{formatCurrency(m.revenue, "NPR")}</p>
                      <div
                        className="w-full bg-emerald-200 rounded-t-md"
                        style={{ height: `${Math.max(4, (m.revenue / maxRevenue) * 120)}px` }}
                      />
                      <p className="text-[10px] text-gray-500 mt-1">{m.month}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Brand */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue by Brand</h3>
              {data.revenueByBrand.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No data.</p>
              ) : (
                <div className="space-y-3">
                  {data.revenueByBrand.slice(0, 10).map((b) => (
                    <div key={b.brandId} className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.brandName}</p>
                      <p className="text-sm font-medium text-emerald-600">{formatCurrency(b.revenue, "NPR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Category */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue by Category</h3>
            {data.revenueByCategory.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No data.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {data.revenueByCategory.map((c) => (
                  <div key={c.category} className="border rounded-lg p-3 text-center">
                    <p className="text-sm font-medium text-gray-900 capitalize">{c.category}</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(c.revenue, "NPR")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion by Product */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Try-On Conversion by Product</h3>
            {data.conversionByProduct.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 font-medium">Product</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium">Try-Ons</th>
                      <th className="pb-3 font-medium">Purchases</th>
                      <th className="pb-3 font-medium">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.conversionByProduct.map((p) => (
                      <tr key={p.productId} className="border-b last:border-0">
                        <td className="py-3 font-medium">{p.productName}</td>
                        <td className="py-3 capitalize">{p.category}</td>
                        <td className="py-3">{p.tryOns}</td>
                        <td className="py-3">{p.purchases}</td>
                        <td className="py-3">
                          <Badge className={p.conversionRate >= 10 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {p.conversionRate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Model Accuracy */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI Model Performance
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{data.aiModelAccuracy.successRate}%</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Satisfaction</p>
                <p className="text-2xl font-bold text-blue-600">{data.aiModelAccuracy.satisfactionRate}%</p>
                <p className="text-[10px] text-gray-400">{data.aiModelAccuracy.positiveRatings}/{data.aiModelAccuracy.totalRated} rated</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Avg Time</p>
                <p className="text-2xl font-bold text-gray-900">{(data.aiModelAccuracy.avgProcessingTimeMs / 1000).toFixed(1)}s</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Failure Rate</p>
                <p className="text-2xl font-bold text-red-600">{data.aiModelAccuracy.failureRate}%</p>
                <p className="text-[10px] text-gray-400">{data.aiModelAccuracy.totalAttempts} total</p>
              </div>
            </div>
            {Object.keys(data.aiModelAccuracy.statusBreakdown).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.aiModelAccuracy.statusBreakdown).map(([status, count]) => (
                  <Badge key={status} className="bg-gray-100 text-gray-700">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
