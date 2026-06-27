import { describe, it, expect } from "vitest";

function validateReviewInput(body: {
  productId?: string;
  rating?: number;
  title?: string;
  comment?: string;
}): { valid: boolean; error?: string } {
  if (!body.productId || !body.rating || body.rating < 1 || body.rating > 5) {
    return { valid: false, error: "productId and rating (1-5) are required." };
  }
  return { valid: true };
}

function validateReturnStatus(status?: string): { valid: boolean; error?: string } {
  if (!status || !["approved", "rejected"].includes(status)) {
    return { valid: false, error: "status must be 'approved' or 'rejected'." };
  }
  return { valid: true };
}

function mapReviewItem(review: {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  reply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  user: { name: string | null; avatarUrl: string | null };
}) {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    reply: review.reply,
    repliedAt: review.repliedAt?.toISOString() ?? null,
    userName: review.user.name ?? "Anonymous",
    userAvatar: review.user.avatarUrl,
    createdAt: review.createdAt.toISOString(),
  };
}

describe("Review Input Validation", () => {
  it("accepts valid review with productId and rating", () => {
    const result = validateReviewInput({ productId: "p1", rating: 4 });
    expect(result.valid).toBe(true);
  });

  it("rejects missing productId", () => {
    const result = validateReviewInput({ rating: 3 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("productId");
  });

  it("rejects missing rating", () => {
    const result = validateReviewInput({ productId: "p1" });
    expect(result.valid).toBe(false);
  });

  it("rejects rating below 1", () => {
    const result = validateReviewInput({ productId: "p1", rating: 0 });
    expect(result.valid).toBe(false);
  });

  it("rejects rating above 5", () => {
    const result = validateReviewInput({ productId: "p1", rating: 6 });
    expect(result.valid).toBe(false);
  });

  it("accepts boundary rating of 1", () => {
    expect(validateReviewInput({ productId: "p1", rating: 1 }).valid).toBe(true);
  });

  it("accepts boundary rating of 5", () => {
    expect(validateReviewInput({ productId: "p1", rating: 5 }).valid).toBe(true);
  });
});

describe("Return Request Status Validation", () => {
  it("accepts 'approved'", () => {
    expect(validateReturnStatus("approved").valid).toBe(true);
  });

  it("accepts 'rejected'", () => {
    expect(validateReturnStatus("rejected").valid).toBe(true);
  });

  it("rejects undefined status", () => {
    expect(validateReturnStatus(undefined).valid).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateReturnStatus("").valid).toBe(false);
  });

  it("rejects 'pending'", () => {
    const result = validateReturnStatus("pending");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("approved");
  });

  it("rejects arbitrary string", () => {
    expect(validateReturnStatus("cancelled").valid).toBe(false);
  });
});

describe("Review Item Mapping", () => {
  it("maps a full review with reply", () => {
    const review = {
      id: "r1",
      rating: 5,
      title: "Great product",
      comment: "Loved the quality",
      reply: "Thank you!",
      repliedAt: new Date("2026-06-10T15:00:00Z"),
      createdAt: new Date("2026-06-05T10:00:00Z"),
      user: { name: "Saugat", avatarUrl: "https://cdn.example.com/avatar.jpg" },
    };

    const mapped = mapReviewItem(review);
    expect(mapped).toEqual({
      id: "r1",
      rating: 5,
      title: "Great product",
      comment: "Loved the quality",
      reply: "Thank you!",
      repliedAt: "2026-06-10T15:00:00.000Z",
      userName: "Saugat",
      userAvatar: "https://cdn.example.com/avatar.jpg",
      createdAt: "2026-06-05T10:00:00.000Z",
    });
  });

  it("falls back to Anonymous when user name is null", () => {
    const review = {
      id: "r2",
      rating: 3,
      title: null,
      comment: null,
      reply: null,
      repliedAt: null,
      createdAt: new Date("2026-06-01"),
      user: { name: null, avatarUrl: null },
    };

    const mapped = mapReviewItem(review);
    expect(mapped.userName).toBe("Anonymous");
    expect(mapped.repliedAt).toBeNull();
  });
});
