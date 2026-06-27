import { describe, it, expect } from "vitest";

function computeConversionRate(
  purchaseCount: number,
  tryOnSessionsTotal: number
): number {
  if (tryOnSessionsTotal <= 0) return 0;
  return parseFloat(((purchaseCount / tryOnSessionsTotal) * 100).toFixed(1));
}

function mapRecentOrder(order: {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  user: { name: string | null; email: string };
  _count: { items: number };
}) {
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    customerName: order.user.name ?? order.user.email,
    itemCount: order._count.items,
    createdAt: order.createdAt.toISOString(),
  };
}

function validateBrandVerification(body: { isVerified?: boolean }): boolean {
  return body.isVerified ?? true;
}

describe("Admin Dashboard — Conversion Rate", () => {
  it("calculates conversion rate correctly", () => {
    expect(computeConversionRate(15, 100)).toBe(15.0);
  });

  it("handles fractional percentage", () => {
    expect(computeConversionRate(1, 3)).toBe(33.3);
  });

  it("returns 0 when no try-on sessions", () => {
    expect(computeConversionRate(0, 0)).toBe(0);
  });

  it("returns 0 when try-on sessions negative", () => {
    expect(computeConversionRate(5, -1)).toBe(0);
  });

  it("handles 100% conversion", () => {
    expect(computeConversionRate(10, 10)).toBe(100.0);
  });

  it("handles very small conversion rate", () => {
    expect(computeConversionRate(1, 1000)).toBe(0.1);
  });
});

describe("Admin Dashboard — Recent Order Mapping", () => {
  it("maps order with user name", () => {
    const order = {
      id: "ord_1",
      status: "confirmed",
      totalAmount: 5000,
      currency: "NPR",
      createdAt: new Date("2026-06-15T08:00:00Z"),
      user: { name: "Saugat", email: "s@example.com" },
      _count: { items: 3 },
    };

    const mapped = mapRecentOrder(order);
    expect(mapped.customerName).toBe("Saugat");
    expect(mapped.itemCount).toBe(3);
    expect(mapped.totalAmount).toBe(5000);
    expect(mapped.createdAt).toBe("2026-06-15T08:00:00.000Z");
  });

  it("falls back to email when name is null", () => {
    const order = {
      id: "ord_2",
      status: "pending",
      totalAmount: 1200,
      currency: "USD",
      createdAt: new Date("2026-06-10"),
      user: { name: null, email: "anon@example.com" },
      _count: { items: 1 },
    };

    expect(mapRecentOrder(order).customerName).toBe("anon@example.com");
  });
});

describe("Order Status Transitions", () => {
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
    refund_requested: ["refunded"],
    refunded: [],
  };

  function canTransition(from: string, to: string): boolean {
    return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
  }

  it("allows pending → confirmed", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
  });

  it("allows pending → cancelled", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
  });

  it("allows confirmed → processing", () => {
    expect(canTransition("confirmed", "processing")).toBe(true);
  });

  it("allows processing → shipped", () => {
    expect(canTransition("processing", "shipped")).toBe(true);
  });

  it("allows shipped → delivered", () => {
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  it("allows refund_requested → refunded", () => {
    expect(canTransition("refund_requested", "refunded")).toBe(true);
  });

  it("rejects pending → delivered (skip)", () => {
    expect(canTransition("pending", "delivered")).toBe(false);
  });

  it("rejects delivered → anything", () => {
    expect(canTransition("delivered", "shipped")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
  });

  it("rejects cancelled → anything", () => {
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });

  it("rejects refunded → anything", () => {
    expect(canTransition("refunded", "pending")).toBe(false);
  });
});

describe("Brand Verification Default", () => {
  it("defaults to true when isVerified not provided", () => {
    expect(validateBrandVerification({})).toBe(true);
  });

  it("uses provided true value", () => {
    expect(validateBrandVerification({ isVerified: true })).toBe(true);
  });

  it("uses provided false value (un-verify)", () => {
    expect(validateBrandVerification({ isVerified: false })).toBe(false);
  });
});
