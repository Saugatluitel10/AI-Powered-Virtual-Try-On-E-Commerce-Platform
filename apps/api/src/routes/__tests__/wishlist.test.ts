import { describe, it, expect } from "vitest";

function encodeWishlistShareUrl(
  productIds: string[],
  frontendUrl: string
): string {
  const encoded = Buffer.from(JSON.stringify(productIds)).toString("base64url");
  return `${frontendUrl}/wishlist/shared?ids=${encoded}`;
}

function decodeWishlistShareUrl(url: string): string[] {
  const idsParam = new URL(url).searchParams.get("ids");
  if (!idsParam) return [];
  const decoded = Buffer.from(idsParam, "base64url").toString("utf-8");
  return JSON.parse(decoded);
}

function mapWishlistItem(item: {
  id: string;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    currency: string;
    images: string[];
    brand: { name: string } | null;
  };
}) {
  return {
    id: item.id,
    productId: item.product.id,
    productName: item.product.name,
    productSlug: item.product.slug,
    price: item.product.price,
    currency: item.product.currency,
    image: item.product.images[0] ?? null,
    brandName: item.product.brand?.name ?? null,
    addedAt: item.createdAt.toISOString(),
  };
}

describe("Wishlist Share URL Encoding", () => {
  const FRONTEND = "https://vtryon.com";

  it("round-trips product IDs through base64url encoding", () => {
    const ids = ["prod_1", "prod_2", "prod_3"];
    const url = encodeWishlistShareUrl(ids, FRONTEND);
    const decoded = decodeWishlistShareUrl(url);
    expect(decoded).toEqual(ids);
  });

  it("handles empty product list", () => {
    const url = encodeWishlistShareUrl([], FRONTEND);
    const decoded = decodeWishlistShareUrl(url);
    expect(decoded).toEqual([]);
  });

  it("handles single product", () => {
    const ids = ["prod_abc123"];
    const url = encodeWishlistShareUrl(ids, FRONTEND);
    expect(url).toContain("/wishlist/shared?ids=");
    const decoded = decodeWishlistShareUrl(url);
    expect(decoded).toEqual(ids);
  });

  it("produces a valid URL", () => {
    const ids = ["p1", "p2"];
    const url = encodeWishlistShareUrl(ids, FRONTEND);
    expect(() => new URL(url)).not.toThrow();
    expect(url).toMatch(/^https:\/\/vtryon\.com\/wishlist\/shared\?ids=/);
  });

  it("handles UUIDs as product IDs", () => {
    const ids = [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    ];
    const url = encodeWishlistShareUrl(ids, FRONTEND);
    const decoded = decodeWishlistShareUrl(url);
    expect(decoded).toEqual(ids);
  });
});

describe("Wishlist Item Mapping", () => {
  it("maps item with brand and image", () => {
    const item = {
      id: "wi_1",
      createdAt: new Date("2026-06-01T12:00:00Z"),
      product: {
        id: "p1",
        name: "Silk Kurta",
        slug: "silk-kurta",
        price: 2500,
        currency: "NPR",
        images: ["https://cdn.example.com/kurta.jpg"],
        brand: { name: "Nepal Fashion" },
      },
    };

    const mapped = mapWishlistItem(item);
    expect(mapped).toEqual({
      id: "wi_1",
      productId: "p1",
      productName: "Silk Kurta",
      productSlug: "silk-kurta",
      price: 2500,
      currency: "NPR",
      image: "https://cdn.example.com/kurta.jpg",
      brandName: "Nepal Fashion",
      addedAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("returns null for missing brand", () => {
    const item = {
      id: "wi_2",
      createdAt: new Date("2026-06-01"),
      product: {
        id: "p2",
        name: "Basic Tee",
        slug: "basic-tee",
        price: 999,
        currency: "NPR",
        images: ["img.jpg"],
        brand: null,
      },
    };

    expect(mapWishlistItem(item).brandName).toBeNull();
  });

  it("returns null for empty images array", () => {
    const item = {
      id: "wi_3",
      createdAt: new Date("2026-06-01"),
      product: {
        id: "p3",
        name: "No Image Product",
        slug: "no-image",
        price: 500,
        currency: "NPR",
        images: [],
        brand: null,
      },
    };

    expect(mapWishlistItem(item).image).toBeNull();
  });
});
