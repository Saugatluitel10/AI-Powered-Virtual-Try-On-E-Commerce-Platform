import type { Product } from "@/types/product";

type SeedProduct = {
  name: string;
  price: number;
  sizes: string[];
  gender: "mens" | "womens" | "unisex";
  garmentType: "tops" | "bottoms" | "dresses" | "sets" | "outerwear";
  image: string;
  brandName: string;
  color: string;
  style: "casual" | "formal" | "streetwear" | "outdoor";
};

const SEEDS: SeedProduct[] = [
  { name: "Navy Check Three-Piece Suit", price: 11999, sizes: ["M", "L", "XL"], gender: "mens", garmentType: "sets", image: "/products/product-01.jpg", brandName: "Kathmandu Tailors", color: "navy", style: "formal" },
  { name: "Black Mountain Graphic T-Shirt", price: 1299, sizes: ["S", "M", "L", "XL"], gender: "unisex", garmentType: "tops", image: "/products/product-02.jpg", brandName: "Peak & Co", color: "black", style: "streetwear" },
  { name: "Blue Printed Button Shirt", price: 2499, sizes: ["XS", "S", "M", "L"], gender: "womens", garmentType: "tops", image: "/products/product-03.jpg", brandName: "Himalayan Threads", color: "blue", style: "casual" },
  { name: "Classic White Crew T-Shirt", price: 1399, sizes: ["S", "M", "L", "XL", "XXL"], gender: "mens", garmentType: "tops", image: "/products/product-04.jpg", brandName: "Kathmandu Casuals", color: "white", style: "casual" },
  { name: "Rose Longline Coat", price: 8499, sizes: ["S", "M", "L"], gender: "womens", garmentType: "outerwear", image: "/products/product-05.jpg", brandName: "Silk Route", color: "pink", style: "outdoor" },
  { name: "Oxford Button-Down Shirt", price: 2799, sizes: ["M", "L", "XL", "XXL"], gender: "mens", garmentType: "tops", image: "/products/product-06.jpg", brandName: "Kathmandu Tailors", color: "navy", style: "formal" },
  { name: "Blush Utility Joggers", price: 2699, sizes: ["XS", "S", "M", "L"], gender: "womens", garmentType: "bottoms", image: "/products/product-07.jpg", brandName: "Peak & Co", color: "pink", style: "streetwear" },
  { name: "Khaki Tapered Joggers", price: 2999, sizes: ["28", "30", "32", "34", "36"], gender: "mens", garmentType: "bottoms", image: "/products/product-08.jpg", brandName: "Peak & Co", color: "khaki", style: "casual" },
  { name: "Black Crop Top & Cargo Set", price: 4499, sizes: ["XS", "S", "M", "L"], gender: "womens", garmentType: "sets", image: "/products/product-10.jpg", brandName: "Kathmandu Casuals", color: "black", style: "streetwear" },
  { name: "Red Belted Midi Dress", price: 4999, sizes: ["S", "M", "L"], gender: "womens", garmentType: "dresses", image: "/products/product-11.jpg", brandName: "Silk Route", color: "red", style: "formal" },
  { name: "Golden Cropped Tracksuit", price: 4799, sizes: ["XS", "S", "M", "L"], gender: "womens", garmentType: "sets", image: "/products/product-13.jpg", brandName: "Peak & Co", color: "gold", style: "streetwear" },
  { name: "Ivory Floral Maxi Dress", price: 5499, sizes: ["S", "M", "L", "XL"], gender: "womens", garmentType: "dresses", image: "/products/product-14.jpg", brandName: "Himalayan Threads", color: "ivory", style: "formal" },
  { name: "Emerald Lace Crop Top", price: 2299, sizes: ["XS", "S", "M", "L"], gender: "womens", garmentType: "tops", image: "/products/product-17.jpg", brandName: "Silk Route", color: "emerald", style: "formal" },
  { name: "Olive Utility Jacket", price: 6999, sizes: ["M", "L", "XL"], gender: "mens", garmentType: "outerwear", image: "/products/product-18.jpg", brandName: "Himalayan Threads", color: "olive", style: "outdoor" },
  { name: "Rust Relaxed Sweatshirt", price: 3199, sizes: ["S", "M", "L", "XL"], gender: "womens", garmentType: "tops", image: "/products/product-20.jpg", brandName: "Kathmandu Casuals", color: "rust", style: "casual" },
  { name: "Minimal White Logo T-Shirt", price: 1599, sizes: ["S", "M", "L", "XL"], gender: "unisex", garmentType: "tops", image: "/products/product-23.jpg", brandName: "Peak & Co", color: "white", style: "casual" },
  { name: "White Pullover Hoodie", price: 3599, sizes: ["S", "M", "L", "XL"], gender: "unisex", garmentType: "outerwear", image: "/products/product-25.jpg", brandName: "Peak & Co", color: "white", style: "streetwear" },
  { name: "Activewear Training Set", price: 3999, sizes: ["XS", "S", "M", "L"], gender: "womens", garmentType: "sets", image: "/products/product-26.jpg", brandName: "Kathmandu Active", color: "black", style: "outdoor" },
  { name: "Black Graphic Boyfriend Jeans", price: 3499, sizes: ["28", "30", "32", "34"], gender: "womens", garmentType: "bottoms", image: "/products/product-27.jpg", brandName: "Kathmandu Casuals", color: "black", style: "streetwear" },
  { name: "Striped Wide-Leg Trousers", price: 3299, sizes: ["S", "M", "L"], gender: "womens", garmentType: "bottoms", image: "/products/product-28.jpg", brandName: "Silk Route", color: "black", style: "formal" },
  { name: "Classic White V-Neck T-Shirt", price: 1499, sizes: ["S", "M", "L", "XL"], gender: "mens", garmentType: "tops", image: "/products/product-30.jpg", brandName: "Kathmandu Casuals", color: "white", style: "casual" },
  { name: "Navy Windowpane Formal Suit", price: 12999, sizes: ["M", "L", "XL"], gender: "mens", garmentType: "sets", image: "/products/product-01.jpg", brandName: "Himalayan Threads", color: "navy", style: "formal" },
  { name: "Black Everyday T-Shirt", price: 1199, sizes: ["S", "M", "L", "XL"], gender: "mens", garmentType: "tops", image: "/products/product-02.jpg", brandName: "Kathmandu Casuals", color: "black", style: "casual" },
  { name: "Scarlet Day Dress", price: 4299, sizes: ["XS", "S", "M", "L"], gender: "womens", garmentType: "dresses", image: "/products/product-11.jpg", brandName: "Dhaka Weaves", color: "red", style: "casual" },
  { name: "Floral Holiday Dress", price: 5999, sizes: ["S", "M", "L", "XL"], gender: "womens", garmentType: "dresses", image: "/products/product-14.jpg", brandName: "Silk Route", color: "ivory", style: "formal" },
  { name: "Olive Street Jacket", price: 6499, sizes: ["S", "M", "L", "XL"], gender: "unisex", garmentType: "outerwear", image: "/products/product-18.jpg", brandName: "Peak & Co", color: "olive", style: "outdoor" },
  { name: "Orange Weekend Sweatshirt", price: 2999, sizes: ["XS", "S", "M", "L"], gender: "womens", garmentType: "tops", image: "/products/product-20.jpg", brandName: "Himalayan Threads", color: "rust", style: "casual" },
  { name: "White Minimal Logo Tee", price: 1699, sizes: ["S", "M", "L", "XL"], gender: "unisex", garmentType: "tops", image: "/products/product-23.jpg", brandName: "Peak & Co", color: "white", style: "streetwear" },
  { name: "White Fleece Hoodie", price: 3899, sizes: ["S", "M", "L", "XL"], gender: "unisex", garmentType: "outerwear", image: "/products/product-25.jpg", brandName: "Kathmandu Active", color: "white", style: "streetwear" },
  { name: "Black Striped Palazzo Set", price: 5299, sizes: ["S", "M", "L"], gender: "womens", garmentType: "sets", image: "/products/product-28.jpg", brandName: "Silk Route", color: "black", style: "formal" },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const DEMO_PRODUCTS: Product[] = SEEDS.map((product, index) => ({
  id: `demo-${index + 1}`,
  name: product.name,
  slug: slugify(product.name),
  price: product.price,
  currency: "NPR",
  sizes: product.sizes,
  gender: product.gender,
  garmentType: product.garmentType,
  isTryonEnabled: true,
  suitableBodyTypes: ["RECTANGLE", "HOURGLASS", "PEAR", "APPLE"],
  primaryImageUrl: product.image,
  brandName: product.brandName,
  color: product.color,
  colors: [product.color[0].toUpperCase() + product.color.slice(1)],
  style: product.style,
  description: `${product.name} is a practical ${product.style} piece selected for everyday life in Nepal. It combines a comfortable fit with easy-care construction and reliable finishing for repeat wear.`,
  images: [product.image],
  brandId: slugify(product.brandName),
  createdAt: "2026-01-01T00:00:00.000Z",
}));

export const DEMO_BRANDS = Array.from(new Set(SEEDS.map((product) => product.brandName)));
