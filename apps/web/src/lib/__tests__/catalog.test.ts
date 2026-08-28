import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { DEMO_PRODUCTS } from "@/data/demo-products";
import { filterAndSortProducts, type CatalogFilters } from "@/lib/catalog";

const DEFAULT_FILTERS: CatalogFilters = {
  query: "",
  category: "",
  gender: "",
  color: "",
  size: "",
  style: "",
  maxPrice: 15_000,
};

describe("local catalogue", () => {
  test("contains 30 complete products with unique IDs and bundled images", () => {
    assert.equal(DEMO_PRODUCTS.length, 30);
    assert.equal(new Set(DEMO_PRODUCTS.map((product) => product.id)).size, 30);

    for (const product of DEMO_PRODUCTS) {
      assert.ok(product.name.length > 3);
      assert.ok(product.description.length > 20);
      assert.ok(product.price > 0);
      assert.equal(product.currency, "NPR");
      assert.ok(product.gender);
      assert.ok(product.garmentType);
      assert.ok(product.color);
      assert.ok(product.style);
      assert.ok(product.sizes.length > 0);
      assert.ok(product.primaryImageUrl?.startsWith("/products/"));
      assert.ok(existsSync(join(process.cwd(), "public", product.primaryImageUrl!.slice(1))));
    }
  });

  test("every visible category, gender, colour, size, and style comes from real product data", () => {
    for (const property of ["garmentType", "gender", "color", "style"] as const) {
      const values = new Set(DEMO_PRODUCTS.map((product) => product[property]));
      assert.ok(values.size > 1);
      for (const value of values) {
        assert.ok(DEMO_PRODUCTS.some((product) => product[property] === value));
      }
    }
    assert.ok(DEMO_PRODUCTS.some((product) => product.sizes.includes("M")));
  });

  test("women filter never returns men's or unisex products", () => {
    const results = filterAndSortProducts(DEMO_PRODUCTS, { ...DEFAULT_FILTERS, gender: "womens" }, "featured");
    assert.ok(results.length > 0);
    assert.ok(results.every((product) => product.gender === "womens"));
  });

  test("multiple filters are combined with strict AND matching", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      category: "tops",
      gender: "mens",
      color: "white",
      size: "M",
      maxPrice: 3_000,
    };
    const results = filterAndSortProducts(DEMO_PRODUCTS, filters, "featured");
    assert.ok(results.length > 0);
    assert.ok(
      results.every(
        (product) =>
          product.garmentType === "tops" &&
          product.gender === "mens" &&
          product.color === "white" &&
          product.sizes.includes("M") &&
          product.price <= 3_000,
      ),
    );
  });

  test("search includes product metadata and impossible combinations return no results", () => {
    const searchResults = filterAndSortProducts(DEMO_PRODUCTS, { ...DEFAULT_FILTERS, query: "tailors" }, "featured");
    assert.ok(searchResults.length > 0);
    assert.ok(searchResults.every((product) => product.brandName?.toLocaleLowerCase().includes("tailors")));

    const none = filterAndSortProducts(
      DEMO_PRODUCTS,
      { ...DEFAULT_FILTERS, category: "dresses", gender: "mens" },
      "featured",
    );
    assert.deepEqual(none, []);
  });

  test("sorting is correct and does not mutate the source catalogue", () => {
    const originalOrder = DEMO_PRODUCTS.map((product) => product.id);
    const ascending = filterAndSortProducts(DEMO_PRODUCTS, DEFAULT_FILTERS, "price-asc");
    const descending = filterAndSortProducts(DEMO_PRODUCTS, DEFAULT_FILTERS, "price-desc");
    const alphabetical = filterAndSortProducts(DEMO_PRODUCTS, DEFAULT_FILTERS, "name-asc");

    assert.ok(ascending.every((product, index) => index === 0 || ascending[index - 1].price <= product.price));
    assert.ok(descending.every((product, index) => index === 0 || descending[index - 1].price >= product.price));
    assert.deepEqual(
      alphabetical.map((product) => product.name),
      [...alphabetical.map((product) => product.name)].sort((left, right) => left.localeCompare(right)),
    );
    assert.deepEqual(DEMO_PRODUCTS.map((product) => product.id), originalOrder);
  });
});
