export type GarmentType = "tops" | "bottoms" | "dresses" | "sets" | "accessories" | "outerwear";
export type GenderType = "mens" | "womens" | "unisex" | "kids";

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  sizes: string[];
  gender: string | null;
  garmentType: string | null;
  isTryonEnabled: boolean;
  suitableBodyTypes: string[];
  primaryImageUrl: string | null;
  brandName: string | null;
}

export interface Product extends ProductListItem {
  description: string | null;
  images: string[];
  brandId: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Category[];
}
