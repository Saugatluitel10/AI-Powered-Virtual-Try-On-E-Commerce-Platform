export type GarmentType = "top" | "bottom" | "dress" | "outerwear" | "accessory";
export type GenderType = "mens" | "womens" | "unisex" | "kids";

export interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  sku: string | null;
  stock_quantity: number;
  price_modifier: number;
  image_url: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  currency: string;
  gender: GenderType | null;
  garment_type: GarmentType | null;
  is_tryon_enabled: boolean;
  primary_image_url: string | null;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  tags: string[] | null;
  flat_lay_image_url: string | null;
  model_image_url: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children: Category[];
}
