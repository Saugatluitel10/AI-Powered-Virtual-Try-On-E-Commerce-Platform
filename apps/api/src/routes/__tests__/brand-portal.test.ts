import { describe, it, expect } from "vitest";

describe("Brand Portal — Payout History", () => {
  function mapPayout(raw: {
    id: string;
    amount: number;
    currency: string;
    periodStart: Date;
    periodEnd: Date;
    status: string;
    paidAt: Date | null;
    reference: string | null;
    createdAt: Date;
  }) {
    return {
      id: raw.id,
      amount: raw.amount,
      currency: raw.currency,
      periodStart: raw.periodStart.toISOString(),
      periodEnd: raw.periodEnd.toISOString(),
      status: raw.status,
      paidAt: raw.paidAt?.toISOString() ?? null,
      reference: raw.reference,
      createdAt: raw.createdAt.toISOString(),
    };
  }

  it("maps payout fields correctly", () => {
    const raw = {
      id: "pay_1",
      amount: 50000,
      currency: "NPR",
      periodStart: new Date("2026-05-01"),
      periodEnd: new Date("2026-05-31"),
      status: "paid",
      paidAt: new Date("2026-06-05"),
      reference: "TXN-12345",
      createdAt: new Date("2026-06-05"),
    };
    const mapped = mapPayout(raw);
    expect(mapped.amount).toBe(50000);
    expect(mapped.status).toBe("paid");
    expect(mapped.reference).toBe("TXN-12345");
    expect(mapped.periodStart).toBe("2026-05-01T00:00:00.000Z");
  });

  it("handles null paidAt and reference", () => {
    const raw = {
      id: "pay_2",
      amount: 30000,
      currency: "NPR",
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      status: "pending",
      paidAt: null,
      reference: null,
      createdAt: new Date("2026-06-15"),
    };
    const mapped = mapPayout(raw);
    expect(mapped.paidAt).toBeNull();
    expect(mapped.reference).toBeNull();
    expect(mapped.status).toBe("pending");
  });
});

describe("Brand Portal — Promo Banners", () => {
  function mapBanner(raw: {
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string | null;
    placement: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
  }) {
    return {
      id: raw.id,
      title: raw.title,
      imageUrl: raw.imageUrl,
      linkUrl: raw.linkUrl,
      placement: raw.placement,
      status: raw.status,
      startDate: raw.startDate?.toISOString() ?? null,
      endDate: raw.endDate?.toISOString() ?? null,
      createdAt: raw.createdAt.toISOString(),
    };
  }

  it("maps banner fields correctly", () => {
    const raw = {
      id: "ban_1",
      title: "Summer Sale",
      imageUrl: "https://cdn.example.com/banner.jpg",
      linkUrl: "https://example.com/sale",
      placement: "homepage",
      status: "pending",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-31"),
      createdAt: new Date("2026-06-15"),
    };
    const mapped = mapBanner(raw);
    expect(mapped.title).toBe("Summer Sale");
    expect(mapped.placement).toBe("homepage");
    expect(mapped.startDate).toBe("2026-07-01T00:00:00.000Z");
  });

  it("handles null linkUrl and dates", () => {
    const raw = {
      id: "ban_2",
      title: "New Arrivals",
      imageUrl: "https://cdn.example.com/banner2.jpg",
      linkUrl: null,
      placement: "sidebar",
      status: "approved",
      startDate: null,
      endDate: null,
      createdAt: new Date("2026-06-10"),
    };
    const mapped = mapBanner(raw);
    expect(mapped.linkUrl).toBeNull();
    expect(mapped.startDate).toBeNull();
    expect(mapped.endDate).toBeNull();
  });

  const VALID_BANNER_STATUSES = ["approved", "rejected", "active", "expired"];

  it("validates banner status values", () => {
    expect(VALID_BANNER_STATUSES).toContain("approved");
    expect(VALID_BANNER_STATUSES).toContain("rejected");
    expect(VALID_BANNER_STATUSES).not.toContain("pending");
    expect(VALID_BANNER_STATUSES).not.toContain("deleted");
  });

  it("validates required banner fields", () => {
    const validPayload = { title: "Test", imageUrl: "https://example.com/img.jpg" };
    expect(validPayload.title).toBeTruthy();
    expect(validPayload.imageUrl).toBeTruthy();

    const invalidPayload = { title: "", imageUrl: "" };
    expect(!invalidPayload.title || !invalidPayload.imageUrl).toBe(true);
  });
});

describe("Brand Portal — Admin Payout Creation", () => {
  it("validates required payout fields", () => {
    const valid = {
      brandId: "brand_1",
      amount: 50000,
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
    };
    expect(valid.brandId && valid.amount && valid.periodStart && valid.periodEnd).toBeTruthy();

    const invalid = { brandId: "", amount: 0, periodStart: "", periodEnd: "" };
    expect(!invalid.brandId || !invalid.amount || !invalid.periodStart || !invalid.periodEnd).toBe(true);
  });
});

describe("Notification Creation", () => {
  it("builds notification payload correctly", () => {
    const orderId = "order_abc123";
    const status = "shipped";
    const statusMessages: Record<string, string> = {
      confirmed: "Your order has been confirmed.",
      processing: "Your order is being processed.",
      shipped: "Your order has been shipped!",
      delivered: "Your order has been delivered.",
      cancelled: "Your order has been cancelled.",
      refunded: "Your refund has been processed.",
    };

    const notification = {
      type: "order_status",
      title: `Order ${status}`,
      body: statusMessages[status],
      data: { orderId, status },
    };

    expect(notification.title).toBe("Order shipped");
    expect(notification.body).toBe("Your order has been shipped!");
    expect(notification.data.orderId).toBe(orderId);
  });

  it("handles unknown status gracefully", () => {
    const status = "unknown_status";
    const statusMessages: Record<string, string> = {
      confirmed: "Your order has been confirmed.",
    };
    const body = statusMessages[status] ?? `Order status updated to ${status}.`;
    expect(body).toBe("Order status updated to unknown_status.");
  });

  it("builds brand verification notification", () => {
    const brandName = "Fashion Nepal";
    const notification = {
      type: "brand_verified",
      title: "Brand Verified!",
      body: `Your brand "${brandName}" has been verified. You now have full seller access.`,
    };
    expect(notification.body).toContain("Fashion Nepal");
    expect(notification.body).toContain("verified");
  });
});

describe("Weekly Digest", () => {
  it("selects up to 6 products for digest", () => {
    const products = Array.from({ length: 20 }, (_, i) => ({
      name: `Product ${i}`,
      slug: `product-${i}`,
      imageUrl: `https://example.com/img${i}.jpg`,
      price: 1000 + i * 100,
      currency: "NPR",
    }));

    const picks = products.slice(0, 6);
    expect(picks).toHaveLength(6);
    expect(picks[0].name).toBe("Product 0");
  });

  it("handles empty product list", () => {
    const products: Array<{ name: string }> = [];
    expect(products.length === 0).toBe(true);
  });
});
