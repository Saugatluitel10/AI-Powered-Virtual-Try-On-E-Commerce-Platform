import { describe, it, expect } from "vitest";

function mapNotification(n: {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

function buildNotificationResponse(
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    data: unknown;
    isRead: boolean;
    createdAt: Date;
  }>,
  unreadCount: number,
  total: number,
  page: number,
  pageSize: number
) {
  return {
    data: {
      items: notifications.map(mapNotification),
      unreadCount,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

describe("Notification Mapping", () => {
  it("maps a notification correctly", () => {
    const n = {
      id: "n1",
      type: "order_shipped",
      title: "Order Shipped",
      body: "Your order #123 has shipped!",
      data: { orderId: "order_123", trackingUrl: "https://track.example.com/123" },
      isRead: false,
      createdAt: new Date("2026-06-15T10:30:00Z"),
    };

    const mapped = mapNotification(n);
    expect(mapped).toEqual({
      id: "n1",
      type: "order_shipped",
      title: "Order Shipped",
      body: "Your order #123 has shipped!",
      data: { orderId: "order_123", trackingUrl: "https://track.example.com/123" },
      isRead: false,
      createdAt: "2026-06-15T10:30:00.000Z",
    });
  });

  it("handles null data field", () => {
    const n = {
      id: "n2",
      type: "promo",
      title: "Sale!",
      body: "50% off everything",
      data: null,
      isRead: true,
      createdAt: new Date("2026-06-01"),
    };

    const mapped = mapNotification(n);
    expect(mapped.data).toBeNull();
    expect(mapped.isRead).toBe(true);
  });
});

describe("Notification Response Builder", () => {
  const notifications = [
    {
      id: "n1",
      type: "order_shipped",
      title: "Shipped",
      body: "Your order shipped",
      data: null,
      isRead: false,
      createdAt: new Date("2026-06-15"),
    },
    {
      id: "n2",
      type: "tryon_complete",
      title: "Try-on Ready",
      body: "Your try-on result is ready",
      data: { sessionId: "s1" },
      isRead: true,
      createdAt: new Date("2026-06-14"),
    },
  ];

  it("builds paginated response with correct totals", () => {
    const response = buildNotificationResponse(notifications, 5, 25, 1, 20);
    expect(response.data.items).toHaveLength(2);
    expect(response.data.unreadCount).toBe(5);
    expect(response.data.total).toBe(25);
    expect(response.data.page).toBe(1);
    expect(response.data.pageSize).toBe(20);
    expect(response.data.totalPages).toBe(2);
  });

  it("computes totalPages correctly for exact division", () => {
    const response = buildNotificationResponse([], 0, 40, 2, 20);
    expect(response.data.totalPages).toBe(2);
  });

  it("computes totalPages correctly for non-exact division", () => {
    const response = buildNotificationResponse([], 0, 41, 1, 20);
    expect(response.data.totalPages).toBe(3);
  });

  it("handles zero total", () => {
    const response = buildNotificationResponse([], 0, 0, 1, 20);
    expect(response.data.totalPages).toBe(0);
    expect(response.data.items).toEqual([]);
  });
});
