import { describe, it, expect } from "vitest";

function validateTryOnRequest(body: {
  productId?: string;
}): { valid: boolean; error?: string } {
  if (!body.productId) {
    return { valid: false, error: "productId is required." };
  }
  return { valid: true };
}

function validateFeedbackRating(rating?: number): { valid: boolean; error?: string } {
  if (rating !== 1 && rating !== -1) {
    return { valid: false, error: "rating must be 1 (thumbs up) or -1 (thumbs down)." };
  }
  return { valid: true };
}

function canUseTryOn(product: {
  isTryonEnabled: boolean;
  images: string[];
} | null): { allowed: boolean; error?: string } {
  if (!product) {
    return { allowed: false, error: "Product not found." };
  }
  if (!product.isTryonEnabled) {
    return { allowed: false, error: "Virtual try-on is not available for this product." };
  }
  if (product.images.length === 0) {
    return { allowed: false, error: "Product has no images." };
  }
  return { allowed: true };
}

function computePagination(
  query: { page?: string; pageSize?: string },
  defaults = { maxPageSize: 50, defaultPageSize: 20 }
) {
  const page = Math.max(1, parseInt(query.page ?? "") || 1);
  const pageSize = Math.min(
    defaults.maxPageSize,
    Math.max(1, parseInt(query.pageSize ?? "") || defaults.defaultPageSize)
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

function totalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

function validatePaymentMethod(method?: string): { valid: boolean; error?: string } {
  const VALID = ["esewa", "khalti", "stripe", "cod"];
  if (!method || !VALID.includes(method)) {
    return { valid: false, error: `paymentMethod must be one of: ${VALID.join(", ")}` };
  }
  return { valid: true };
}

describe("Payment Method Validation", () => {
  it("accepts esewa", () => {
    expect(validatePaymentMethod("esewa").valid).toBe(true);
  });

  it("accepts khalti", () => {
    expect(validatePaymentMethod("khalti").valid).toBe(true);
  });

  it("accepts stripe", () => {
    expect(validatePaymentMethod("stripe").valid).toBe(true);
  });

  it("accepts cod", () => {
    expect(validatePaymentMethod("cod").valid).toBe(true);
  });

  it("rejects paypal", () => {
    expect(validatePaymentMethod("paypal").valid).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validatePaymentMethod("").valid).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validatePaymentMethod(undefined).valid).toBe(false);
  });
});

describe("Try-On Request Validation", () => {
  it("accepts valid productId", () => {
    expect(validateTryOnRequest({ productId: "prod_123" }).valid).toBe(true);
  });

  it("rejects missing productId", () => {
    const result = validateTryOnRequest({});
    expect(result.valid).toBe(false);
    expect(result.error).toBe("productId is required.");
  });

  it("rejects empty string productId", () => {
    const result = validateTryOnRequest({ productId: "" });
    expect(result.valid).toBe(false);
  });
});

describe("Feedback Rating Validation", () => {
  it("accepts thumbs up (1)", () => {
    expect(validateFeedbackRating(1).valid).toBe(true);
  });

  it("accepts thumbs down (-1)", () => {
    expect(validateFeedbackRating(-1).valid).toBe(true);
  });

  it("rejects 0", () => {
    expect(validateFeedbackRating(0).valid).toBe(false);
  });

  it("rejects 2", () => {
    expect(validateFeedbackRating(2).valid).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateFeedbackRating(undefined).valid).toBe(false);
  });

  it("rejects -2", () => {
    expect(validateFeedbackRating(-2).valid).toBe(false);
  });
});

describe("Product Try-On Eligibility", () => {
  it("allows product with try-on enabled and images", () => {
    const result = canUseTryOn({ isTryonEnabled: true, images: ["img1.jpg"] });
    expect(result.allowed).toBe(true);
  });

  it("rejects null product", () => {
    const result = canUseTryOn(null);
    expect(result.allowed).toBe(false);
    expect(result.error).toBe("Product not found.");
  });

  it("rejects product with try-on disabled", () => {
    const result = canUseTryOn({ isTryonEnabled: false, images: ["img.jpg"] });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("not available");
  });

  it("rejects product with no images", () => {
    const result = canUseTryOn({ isTryonEnabled: true, images: [] });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("no images");
  });
});

describe("Pagination Logic", () => {
  it("uses defaults for empty query", () => {
    const result = computePagination({});
    expect(result).toEqual({ page: 1, pageSize: 20, skip: 0 });
  });

  it("parses valid page and pageSize", () => {
    const result = computePagination({ page: "3", pageSize: "10" });
    expect(result).toEqual({ page: 3, pageSize: 10, skip: 20 });
  });

  it("clamps page to minimum 1", () => {
    const result = computePagination({ page: "-5" });
    expect(result.page).toBe(1);
  });

  it("clamps pageSize to max 50", () => {
    const result = computePagination({ pageSize: "100" });
    expect(result.pageSize).toBe(50);
  });

  it("treats pageSize=0 as default (0 is falsy in || fallback)", () => {
    const result = computePagination({ pageSize: "0" });
    expect(result.pageSize).toBe(20);
  });

  it("handles NaN gracefully", () => {
    const result = computePagination({ page: "abc", pageSize: "xyz" });
    expect(result).toEqual({ page: 1, pageSize: 20, skip: 0 });
  });

  it("computes totalPages correctly", () => {
    expect(totalPages(100, 20)).toBe(5);
    expect(totalPages(101, 20)).toBe(6);
    expect(totalPages(0, 20)).toBe(0);
    expect(totalPages(1, 20)).toBe(1);
  });
});
