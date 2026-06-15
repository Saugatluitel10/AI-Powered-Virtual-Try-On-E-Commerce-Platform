// ─── User & Auth ──────────────────────────────────────────────────────────────

export type UserRole = "customer" | "retailer_admin" | "super_admin";
export type FitPreference = "slim" | "regular" | "relaxed";
export type MeasurementsSource = "manual" | "ai_estimated" | "mediapipe";

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface BodyProfile {
  id: string;
  userId: string;
  heightCm: number | null;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  shoulderWidthCm: number | null;
  inseamCm: number | null;
  skinTone: string | null;
  fitPreference: FitPreference | null;
  styleTags: string[];
  profilePhotoUrl: string | null;
  measurementsSource: MeasurementsSource | null;
  updatedAt: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export type GarmentType = "top" | "bottom" | "dress" | "outerwear" | "accessory";
export type GenderType = "mens" | "womens" | "unisex" | "kids";

export interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  sku: string | null;
  stockQuantity: number;
  priceModifier: number;
  imageUrl: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  currency: string;
  gender: GenderType | null;
  garmentType: GarmentType | null;
  tags: string[];
  isTryonEnabled: boolean;
  flatLayImageUrl: string | null;
  modelImageUrl: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
  createdAt: string;
}

export interface ProductListItem
  extends Pick<Product, "id" | "name" | "slug" | "basePrice" | "currency" | "gender" | "garmentType" | "isTryonEnabled"> {
  primaryImageUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Category[];
}

// ─── Order & Cart ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending" | "confirmed" | "processing"
  | "shipped" | "delivered" | "cancelled" | "refunded";

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  addedAt: string;
  productName: string | null;
  productImage: string | null;
  size: string | null;
  color: string | null;
  unitPrice: number | null;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface OrderItem {
  id: string;
  variantId: string;
  productName: string;
  variantDetails: Record<string, string> | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  stripePaymentIntentId: string | null;
  shippingAddress: Record<string, string> | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Try-On ───────────────────────────────────────────────────────────────────

export type TryOnStatus = "queued" | "processing" | "completed" | "failed";

export interface TryOnSession {
  id: string;
  productId: string;
  userId: string | null;
  userPhotoUrl: string;
  garmentImageUrl: string;
  resultImageUrl: string | null;
  status: TryOnStatus;
  processingTimeMs: number | null;
  bodyMeasurements: Partial<BodyProfile> | null;
  errorMessage: string | null;
  createdAt: string;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export interface StyleAdvice {
  id: string;
  advice: string;
  outfitSuggestions: Array<{ name: string; description: string; whyItWorks: string }>;
  sizeRecommendation: string | null;
  colorPalette: string[];
  avoid: string[];
  productIdsSuggested: string[];
  createdAt: string;
}

export interface SizeRecommendation {
  size: string;
  confidence: number;
  reasoning: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
