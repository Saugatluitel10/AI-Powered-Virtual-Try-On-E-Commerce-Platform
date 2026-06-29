import { describe, it, expect } from "vitest";

describe("Analytics — Funnel Metrics", () => {
  it("calculates drop-off between funnel steps", () => {
    const funnel = { uploads: 1000, tryOns: 600, completedTryOns: 500, cartAdds: 200, purchases: 80 };
    const dropOff = (from: number, to: number) =>
      from > 0 ? parseFloat(((1 - to / from) * 100).toFixed(1)) : 0;

    expect(dropOff(funnel.uploads, funnel.tryOns)).toBe(40);
    expect(dropOff(funnel.tryOns, funnel.completedTryOns)).toBeCloseTo(16.7, 0);
    expect(dropOff(funnel.completedTryOns, funnel.cartAdds)).toBe(60);
    expect(dropOff(funnel.cartAdds, funnel.purchases)).toBe(60);
  });

  it("handles zero values without division errors", () => {
    const dropOff = (from: number, to: number) =>
      from > 0 ? parseFloat(((1 - to / from) * 100).toFixed(1)) : 0;

    expect(dropOff(0, 0)).toBe(0);
    expect(dropOff(100, 0)).toBe(100);
  });
});

describe("Analytics — Conversion by Product", () => {
  it("calculates conversion rate correctly", () => {
    const product = { tryOns: 50, purchases: 8 };
    const rate = product.tryOns > 0
      ? parseFloat(((product.purchases / product.tryOns) * 100).toFixed(1))
      : 0;
    expect(rate).toBe(16);
  });

  it("handles zero try-ons", () => {
    const product = { tryOns: 0, purchases: 0 };
    const rate = product.tryOns > 0
      ? parseFloat(((product.purchases / product.tryOns) * 100).toFixed(1))
      : 0;
    expect(rate).toBe(0);
  });
});

describe("Analytics — Conversion by Category", () => {
  it("aggregates products into categories", () => {
    const products = [
      { category: "tops", tryOns: 100, purchases: 20 },
      { category: "tops", tryOns: 50, purchases: 5 },
      { category: "bottoms", tryOns: 80, purchases: 12 },
    ];

    const categoryMap = new Map<string, { tryOns: number; purchases: number }>();
    for (const p of products) {
      const cat = categoryMap.get(p.category) ?? { tryOns: 0, purchases: 0 };
      cat.tryOns += p.tryOns;
      cat.purchases += p.purchases;
      categoryMap.set(p.category, cat);
    }

    const result = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      tryOns: data.tryOns,
      purchases: data.purchases,
      conversionRate: data.tryOns > 0 ? parseFloat(((data.purchases / data.tryOns) * 100).toFixed(1)) : 0,
    }));

    expect(result).toHaveLength(2);
    const tops = result.find((r) => r.category === "tops")!;
    expect(tops.tryOns).toBe(150);
    expect(tops.purchases).toBe(25);
    expect(tops.conversionRate).toBeCloseTo(16.7, 0);
  });
});

describe("Analytics — Return Rates", () => {
  it("computes return rates for try-on vs non-try-on users", () => {
    const tryOnUserIds = new Set(["u1", "u2", "u3"]);

    const orders = [
      { userId: "u1" }, { userId: "u2" }, { userId: "u4" }, { userId: "u5" },
    ];
    const returns = [{ userId: "u2" }, { userId: "u5" }];

    let tryOnOrders = 0, nonTryOnOrders = 0;
    let tryOnReturns = 0, nonTryOnReturns = 0;

    for (const o of orders) {
      if (tryOnUserIds.has(o.userId)) tryOnOrders++;
      else nonTryOnOrders++;
    }
    for (const r of returns) {
      if (tryOnUserIds.has(r.userId)) tryOnReturns++;
      else nonTryOnReturns++;
    }

    const tryOnRate = tryOnOrders > 0 ? parseFloat(((tryOnReturns / tryOnOrders) * 100).toFixed(1)) : 0;
    const nonTryOnRate = nonTryOnOrders > 0 ? parseFloat(((nonTryOnReturns / nonTryOnOrders) * 100).toFixed(1)) : 0;

    expect(tryOnOrders).toBe(2);
    expect(nonTryOnOrders).toBe(2);
    expect(tryOnReturns).toBe(1);
    expect(nonTryOnReturns).toBe(1);
    expect(tryOnRate).toBe(50);
    expect(nonTryOnRate).toBe(50);
  });
});

describe("Analytics — Revenue Aggregation", () => {
  it("aggregates revenue by brand", () => {
    const items = [
      { brandId: "b1", lineTotal: 5000 },
      { brandId: "b1", lineTotal: 3000 },
      { brandId: "b2", lineTotal: 8000 },
    ];

    const brandRevenue = new Map<string, number>();
    for (const item of items) {
      brandRevenue.set(item.brandId, (brandRevenue.get(item.brandId) ?? 0) + item.lineTotal);
    }

    expect(brandRevenue.get("b1")).toBe(8000);
    expect(brandRevenue.get("b2")).toBe(8000);
  });

  it("aggregates revenue by month", () => {
    const items = [
      { createdAt: new Date("2026-05-15"), lineTotal: 1000 },
      { createdAt: new Date("2026-05-20"), lineTotal: 2000 },
      { createdAt: new Date("2026-06-01"), lineTotal: 3000 },
    ];

    const monthlyRevenue = new Map<string, number>();
    for (const item of items) {
      const monthKey = item.createdAt.toISOString().slice(0, 7);
      monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) + item.lineTotal);
    }

    expect(monthlyRevenue.get("2026-05")).toBe(3000);
    expect(monthlyRevenue.get("2026-06")).toBe(3000);
  });
});

describe("Analytics — AI Model Accuracy", () => {
  it("calculates satisfaction rate", () => {
    const totalRated = 200;
    const positiveRatings = 170;
    const rate = totalRated > 0 ? parseFloat(((positiveRatings / totalRated) * 100).toFixed(1)) : 0;
    expect(rate).toBe(85);
  });

  it("calculates success and failure rates", () => {
    const statusCounts: Record<string, number> = {
      completed: 450,
      failed: 30,
      processing: 10,
      pending: 10,
    };
    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const successRate = parseFloat(((statusCounts["completed"] / total) * 100).toFixed(1));
    const failureRate = parseFloat(((statusCounts["failed"] / total) * 100).toFixed(1));

    expect(total).toBe(500);
    expect(successRate).toBe(90);
    expect(failureRate).toBe(6);
  });

  it("handles zero total attempts", () => {
    const totalAttempts = 0;
    const successRate = totalAttempts > 0 ? 100 : 0;
    expect(successRate).toBe(0);
  });
});
