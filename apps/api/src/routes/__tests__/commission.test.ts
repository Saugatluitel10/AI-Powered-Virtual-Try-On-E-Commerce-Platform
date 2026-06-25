import { describe, it, expect } from "vitest";

function calculateCommission(
  orderItems: Array<{ priceAtTime: number; quantity: number; orderCreatedAt: Date }>,
  commissionRate: number
) {
  let totalRevenue = 0;
  for (const oi of orderItems) {
    totalRevenue += oi.priceAtTime * oi.quantity;
  }
  const commissionAmount = totalRevenue * commissionRate;
  const payoutAmount = totalRevenue - commissionAmount;

  const monthlyBreakdown: Record<string, { revenue: number; commission: number; payout: number }> = {};
  for (const oi of orderItems) {
    const monthKey = oi.orderCreatedAt.toISOString().slice(0, 7);
    if (!monthlyBreakdown[monthKey]) {
      monthlyBreakdown[monthKey] = { revenue: 0, commission: 0, payout: 0 };
    }
    const lineTotal = oi.priceAtTime * oi.quantity;
    monthlyBreakdown[monthKey].revenue += lineTotal;
    monthlyBreakdown[monthKey].commission += lineTotal * commissionRate;
    monthlyBreakdown[monthKey].payout += lineTotal * (1 - commissionRate);
  }

  return { totalRevenue, commissionAmount, payoutAmount, monthlyBreakdown };
}

describe("Commission Calculation", () => {
  it("calculates correct commission at 10%", () => {
    const items = [
      { priceAtTime: 1000, quantity: 2, orderCreatedAt: new Date("2026-01-15") },
      { priceAtTime: 500, quantity: 1, orderCreatedAt: new Date("2026-01-20") },
    ];

    const result = calculateCommission(items, 0.1);
    expect(result.totalRevenue).toBe(2500);
    expect(result.commissionAmount).toBe(250);
    expect(result.payoutAmount).toBe(2250);
  });

  it("calculates correct commission at 15%", () => {
    const items = [
      { priceAtTime: 2000, quantity: 1, orderCreatedAt: new Date("2026-03-10") },
    ];

    const result = calculateCommission(items, 0.15);
    expect(result.totalRevenue).toBe(2000);
    expect(result.commissionAmount).toBe(300);
    expect(result.payoutAmount).toBe(1700);
  });

  it("handles zero items", () => {
    const result = calculateCommission([], 0.1);
    expect(result.totalRevenue).toBe(0);
    expect(result.commissionAmount).toBe(0);
    expect(result.payoutAmount).toBe(0);
    expect(Object.keys(result.monthlyBreakdown)).toHaveLength(0);
  });

  it("groups items by month correctly", () => {
    const items = [
      { priceAtTime: 1000, quantity: 1, orderCreatedAt: new Date("2026-01-15") },
      { priceAtTime: 500, quantity: 2, orderCreatedAt: new Date("2026-01-20") },
      { priceAtTime: 800, quantity: 1, orderCreatedAt: new Date("2026-02-10") },
    ];

    const result = calculateCommission(items, 0.1);
    expect(Object.keys(result.monthlyBreakdown)).toHaveLength(2);

    const jan = result.monthlyBreakdown["2026-01"];
    expect(jan.revenue).toBe(2000);
    expect(jan.commission).toBe(200);
    expect(jan.payout).toBe(1800);

    const feb = result.monthlyBreakdown["2026-02"];
    expect(feb.revenue).toBe(800);
    expect(feb.commission).toBe(80);
    expect(feb.payout).toBe(720);
  });

  it("handles commission rate of 0%", () => {
    const items = [
      { priceAtTime: 1000, quantity: 1, orderCreatedAt: new Date("2026-06-01") },
    ];

    const result = calculateCommission(items, 0);
    expect(result.commissionAmount).toBe(0);
    expect(result.payoutAmount).toBe(1000);
  });

  it("handles large quantities correctly", () => {
    const items = [
      { priceAtTime: 150, quantity: 100, orderCreatedAt: new Date("2026-04-01") },
    ];

    const result = calculateCommission(items, 0.12);
    expect(result.totalRevenue).toBe(15000);
    expect(result.commissionAmount).toBeCloseTo(1800, 2);
    expect(result.payoutAmount).toBeCloseTo(13200, 2);
  });
});
