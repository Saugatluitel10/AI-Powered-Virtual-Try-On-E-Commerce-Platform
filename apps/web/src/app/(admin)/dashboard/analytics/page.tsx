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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-secondary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="border border-error/20 bg-error-container/30 p-6 max-w-md text-center">
          <p className="font-display text-lg text-error mb-1">Error</p>
          <p className="text-sm text-on-surface-variant">{error ?? "No data"}</p>
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[28px] text-primary">Analytics</h1>
          <p className="text-on-surface-variant text-sm mt-1">Performance insights and conversion data</p>
        </div>
        <div className="flex gap-px bg-outline-variant/30">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-all ${
                days === d
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-on-surface-variant hover:text-primary"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Funnel */}
      <div className="border border-outline-variant/30 p-6 mb-6">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2 mb-6">
          <Target className="w-4 h-4 text-secondary" />
          Conversion Funnel — Last {days} days
        </h3>
        <div className="flex items-end justify-between gap-2">
          {funnelSteps.map((step, idx) => {
            const prev = idx > 0 ? funnelSteps[idx - 1].value : step.value;
            const dropOff = prev > 0 ? ((1 - step.value / prev) * 100).toFixed(0) : "0";
            return (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className="flex-1 text-center">
                  <div
                    className="mx-auto bg-secondary-container flex items-center justify-center"
                    style={{
                      height: `${Math.max(40, (step.value / Math.max(funnelSteps[0].value, 1)) * 120)}px`,
                      transition: "height 0.3s",
                    }}
                  >
                    <span className="font-display text-lg text-secondary">{step.value}</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mt-2">{step.label}</p>
                  {idx > 0 && (
                    <p className="text-[10px] text-error mt-0.5">-{dropOff}%</p>
                  )}
                </div>
                {idx < funnelSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-outline-variant flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Conversion by Category */}
        <div className="border border-outline-variant/30">
          <div className="p-5 border-b border-outline-variant/30">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-secondary" />
              Try-On Conversion by Category
            </h3>
          </div>
          <div className="p-5">
            {data.conversionByCategory.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-4">No data yet.</p>
            ) : (
              <div className="space-y-4">
                {data.conversionByCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary capitalize">{c.category}</p>
                      <p className="text-[11px] text-on-surface-variant">{c.tryOns} try-ons, {c.purchases} purchases</p>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${c.conversionRate >= 10 ? "bg-surface-container text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                      {c.conversionRate}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Return Rates */}
        <div className="border border-outline-variant/30">
          <div className="p-5 border-b border-outline-variant/30">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
              <Undo2 className="w-4 h-4 text-secondary" />
              Return Rates: Try-On vs Non-Try-On
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-outline-variant/30 p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Try-On Users</p>
                <p className="font-display text-[28px] text-primary">{data.returnRates.tryOnUsers.rate}%</p>
                <p className="text-[10px] text-on-surface-variant mt-1">{data.returnRates.tryOnUsers.returns} / {data.returnRates.tryOnUsers.orders}</p>
              </div>
              <div className="border border-outline-variant/30 p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Non-Try-On</p>
                <p className="font-display text-[28px] text-error">{data.returnRates.nonTryOnUsers.rate}%</p>
                <p className="text-[10px] text-on-surface-variant mt-1">{data.returnRates.nonTryOnUsers.returns} / {data.returnRates.nonTryOnUsers.orders}</p>
              </div>
            </div>
            {data.returnRates.tryOnUsers.rate < data.returnRates.nonTryOnUsers.rate && (
              <div className="mt-4 bg-surface-container-low p-3 text-[11px] text-primary flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-secondary" />
                Try-on users have a lower return rate
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 border border-outline-variant/30">
          <div className="p-5 border-b border-outline-variant/30">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-secondary" />
              Revenue by Month
            </h3>
          </div>
          <div className="p-5">
            {data.revenueByMonth.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-4">No revenue data yet.</p>
            ) : (
              <div className="flex items-end gap-2" style={{ height: 160 }}>
                {data.revenueByMonth.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center">
                    <p className="text-[9px] text-on-surface-variant mb-1">{formatCurrency(m.revenue, "NPR")}</p>
                    <div
                      className="w-full bg-secondary-container"
                      style={{ height: `${Math.max(4, (m.revenue / maxRevenue) * 120)}px` }}
                    />
                    <p className="text-[9px] text-on-surface-variant mt-1">{m.month}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border border-outline-variant/30">
          <div className="p-5 border-b border-outline-variant/30">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
              Revenue by Brand
            </h3>
          </div>
          <div className="p-5">
            {data.revenueByBrand.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-4">No data.</p>
            ) : (
              <div className="space-y-3">
                {data.revenueByBrand.slice(0, 10).map((b) => (
                  <div key={b.brandId} className="flex items-center justify-between">
                    <p className="text-sm text-primary truncate">{b.brandName}</p>
                    <p className="text-sm font-medium text-secondary">{formatCurrency(b.revenue, "NPR")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue by Category */}
      <div className="border border-outline-variant/30 mb-6">
        <div className="p-5 border-b border-outline-variant/30">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">Revenue by Category</h3>
        </div>
        <div className="p-5">
          {data.revenueByCategory.length === 0 ? (
            <p className="text-on-surface-variant text-sm text-center py-4">No data.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-outline-variant/30">
              {data.revenueByCategory.map((c) => (
                <div key={c.category} className="bg-surface p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant capitalize">{c.category}</p>
                  <p className="font-display text-lg text-secondary mt-1">{formatCurrency(c.revenue, "NPR")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversion by Product */}
      <div className="border border-outline-variant/30 mb-6">
        <div className="p-5 border-b border-outline-variant/30">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">Try-On Conversion by Product</h3>
        </div>
        {data.conversionByProduct.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-on-surface-variant text-sm">No data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Product</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Category</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Try-Ons</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Purchases</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {data.conversionByProduct.map((p) => (
                  <tr key={p.productId} className="border-b border-outline-variant/20 last:border-0">
                    <td className="px-5 py-3 font-medium text-primary">{p.productName}</td>
                    <td className="px-5 py-3 text-on-surface-variant capitalize">{p.category}</td>
                    <td className="px-5 py-3 text-on-surface">{p.tryOns}</td>
                    <td className="px-5 py-3 text-on-surface">{p.purchases}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${p.conversionRate >= 10 ? "bg-surface-container text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                        {p.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Model Accuracy */}
      <div className="border border-outline-variant/30">
        <div className="p-5 border-b border-outline-variant/30">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
            <Brain className="w-4 h-4 text-secondary" />
            AI Model Performance
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-outline-variant/30 mb-5">
            <div className="bg-surface p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Success Rate</p>
              <p className="font-display text-[28px] text-primary">{data.aiModelAccuracy.successRate}%</p>
            </div>
            <div className="bg-surface p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Satisfaction</p>
              <p className="font-display text-[28px] text-secondary">{data.aiModelAccuracy.satisfactionRate}%</p>
              <p className="text-[9px] text-on-surface-variant mt-1">{data.aiModelAccuracy.positiveRatings}/{data.aiModelAccuracy.totalRated}</p>
            </div>
            <div className="bg-surface p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Avg Time</p>
              <p className="font-display text-[28px] text-primary">{(data.aiModelAccuracy.avgProcessingTimeMs / 1000).toFixed(1)}s</p>
            </div>
            <div className="bg-surface p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Failure Rate</p>
              <p className="font-display text-[28px] text-error">{data.aiModelAccuracy.failureRate}%</p>
              <p className="text-[9px] text-on-surface-variant mt-1">{data.aiModelAccuracy.totalAttempts} total</p>
            </div>
          </div>
          {Object.keys(data.aiModelAccuracy.statusBreakdown).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.aiModelAccuracy.statusBreakdown).map(([status, count]) => (
                <span key={status} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-surface-container text-on-surface-variant">
                  {status}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
