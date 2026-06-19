export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

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
  productId: string;
  productName: string;
  size: string | null;
  quantity: number;
  priceAtTime: number;
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
  paymentMethod: string | null;
  paymentRef: string | null;
  shippingAddress: Record<string, string> | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export type TryOnStatus = "queued" | "processing" | "completed" | "failed";
