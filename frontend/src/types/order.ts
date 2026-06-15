export type OrderStatus =
  | "pending" | "confirmed" | "processing"
  | "shipped" | "delivered" | "cancelled" | "refunded";

export interface CartItem {
  id: string;
  variant_id: string;
  quantity: number;
  added_at: string;
  product_name: string | null;
  product_image: string | null;
  size: string | null;
  color: string | null;
  unit_price: number | null;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  item_count: number;
}

export interface OrderItem {
  id: string;
  variant_id: string;
  product_name: string;
  variant_details: Record<string, string> | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  shipping_address: Record<string, string> | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export type TryOnStatus = "queued" | "processing" | "completed" | "failed";

export interface TryOnSession {
  id: string;
  product_id: string;
  user_photo_url: string;
  garment_image_url: string;
  result_image_url: string | null;
  status: TryOnStatus;
  processing_time_ms: number | null;
  body_measurements: Record<string, number> | null;
  error_message: string | null;
  created_at: string;
}
