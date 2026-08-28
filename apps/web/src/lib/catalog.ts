import type { Product } from "@/types/product";

export type CatalogSort = "featured" | "price-asc" | "price-desc" | "name-asc";

export interface CatalogFilters {
  query: string;
  category: string;
  gender: string;
  color: string;
  size: string;
  style: string;
  maxPrice: number;
}

export function filterAndSortProducts(
  products: Product[],
  filters: CatalogFilters,
  sort: CatalogSort,
) {
  const query = filters.query.trim().toLocaleLowerCase();
  const filtered = products.filter((product) => {
    const searchableText = [
      product.name,
      product.brandName,
      product.description,
      product.garmentType,
      product.color,
      product.style,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();

    return (
      (!query || searchableText.includes(query)) &&
      (!filters.category || product.garmentType === filters.category) &&
      (!filters.gender || product.gender === filters.gender) &&
      (!filters.color || product.color === filters.color) &&
      (!filters.size || product.sizes.includes(filters.size)) &&
      (!filters.style || product.style === filters.style) &&
      product.price <= filters.maxPrice
    );
  });

  return filtered
    .map((product, index) => ({ product, index }))
    .sort((left, right) => {
      if (sort === "price-asc") return left.product.price - right.product.price || left.index - right.index;
      if (sort === "price-desc") return right.product.price - left.product.price || left.index - right.index;
      if (sort === "name-asc") return left.product.name.localeCompare(right.product.name) || left.index - right.index;
      return left.index - right.index;
    })
    .map(({ product }) => product);
}
