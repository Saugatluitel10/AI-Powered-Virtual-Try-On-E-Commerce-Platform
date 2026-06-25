import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    bodyProfile: { findUnique: vi.fn() },
    product: { findUnique: vi.fn() },
    sizeChart: { findMany: vi.fn() },
  },
}));

import { recommendSize } from "../sizeRecommender";
import { prisma } from "../prisma";

const mockBodyProfile = prisma.bodyProfile.findUnique as ReturnType<typeof vi.fn>;
const mockProduct = prisma.product.findUnique as ReturnType<typeof vi.fn>;
const mockSizeChart = prisma.sizeChart.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recommendSize", () => {
  it("returns null when user profile not found", async () => {
    mockBodyProfile.mockResolvedValue(null);
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["S", "M", "L"] });

    const result = await recommendSize("user1", "prod1");
    expect(result).toBeNull();
  });

  it("returns null when product not found", async () => {
    mockBodyProfile.mockResolvedValue({ bust: 90, waist: 72, hips: 96 });
    mockProduct.mockResolvedValue(null);

    const result = await recommendSize("user1", "prod1");
    expect(result).toBeNull();
  });

  it("returns null when all measurements are null", async () => {
    mockBodyProfile.mockResolvedValue({ bust: null, waist: null, hips: null });
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["S", "M", "L"] });
    mockSizeChart.mockResolvedValue([]);

    const result = await recommendSize("user1", "prod1");
    expect(result).toBeNull();
  });

  it("recommends M for measurements in the M range using fallback chart", async () => {
    mockBodyProfile.mockResolvedValue({ bust: 90, waist: 73, hips: 97 });
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["XS", "S", "M", "L", "XL", "XXL"] });
    mockSizeChart.mockResolvedValue([]);

    const result = await recommendSize("user1", "prod1");
    expect(result).not.toBeNull();
    expect(result!.recommendedSize).toBe("M");
    expect(result!.confidence).toBeGreaterThan(0.5);
    expect(result!.reasoning).toContain("M");
  });

  it("recommends XS for small measurements", async () => {
    mockBodyProfile.mockResolvedValue({ bust: 78, waist: 60, hips: 84 });
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["XS", "S", "M", "L"] });
    mockSizeChart.mockResolvedValue([]);

    const result = await recommendSize("user1", "prod1");
    expect(result).not.toBeNull();
    expect(result!.recommendedSize).toBe("XS");
  });

  it("recommends XXL for large measurements", async () => {
    mockBodyProfile.mockResolvedValue({ bust: 115, waist: 97, hips: 120 });
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["XS", "S", "M", "L", "XL", "XXL"] });
    mockSizeChart.mockResolvedValue([]);

    const result = await recommendSize("user1", "prod1");
    expect(result).not.toBeNull();
    expect(result!.recommendedSize).toBe("XXL");
  });

  it("uses brand-specific size chart when available", async () => {
    mockBodyProfile.mockResolvedValue({ bust: 90, waist: 73, hips: 97 });
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["S", "M", "L"] });
    mockSizeChart.mockResolvedValue([
      { id: "sc1", brandId: "b1", size: "S", bustMin: 80, bustMax: 86, waistMin: 64, waistMax: 70, hipsMin: 88, hipsMax: 94, sortOrder: 0 },
      { id: "sc2", brandId: "b1", size: "M", bustMin: 86, bustMax: 92, waistMin: 70, waistMax: 76, hipsMin: 94, hipsMax: 100, sortOrder: 1 },
      { id: "sc3", brandId: "b1", size: "L", bustMin: 92, bustMax: 100, waistMin: 76, waistMax: 84, hipsMin: 100, hipsMax: 108, sortOrder: 2 },
    ]);

    const result = await recommendSize("user1", "prod1");
    expect(result).not.toBeNull();
    expect(result!.recommendedSize).toBe("M");
  });

  it("handles partial measurements (only bust)", async () => {
    mockBodyProfile.mockResolvedValue({ bust: 90, waist: null, hips: null });
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["S", "M", "L"] });
    mockSizeChart.mockResolvedValue([]);

    const result = await recommendSize("user1", "prod1");
    expect(result).not.toBeNull();
    expect(result!.recommendedSize).toBeDefined();
  });

  it("confidence is clamped between 0.1 and 0.99", async () => {
    mockBodyProfile.mockResolvedValue({ bust: 90, waist: 73, hips: 97 });
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["XS", "S", "M", "L", "XL", "XXL"] });
    mockSizeChart.mockResolvedValue([]);

    const result = await recommendSize("user1", "prod1");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0.1);
    expect(result!.confidence).toBeLessThanOrEqual(0.99);
  });

  it("returns null when chart is empty and product sizes don't match fallback", async () => {
    mockBodyProfile.mockResolvedValue({ bust: 90, waist: 73, hips: 97 });
    mockProduct.mockResolvedValue({ brandId: "b1", sizes: ["CUSTOM_SIZE"] });
    mockSizeChart.mockResolvedValue([]);

    const result = await recommendSize("user1", "prod1");
    expect(result).toBeNull();
  });
});
