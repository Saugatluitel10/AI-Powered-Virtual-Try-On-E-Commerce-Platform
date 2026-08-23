import type { LocalCartItem } from "@/store/cartStore";

export type PaymentMethod = "fonepay" | "esewa" | "khalti" | "card" | "cod";

export interface LocalOrder {
  id: string;
  createdAt: string;
  customer: { fullName: string; phone: string; address: string; city: string };
  items: LocalCartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "Demo paid" | "Payment on delivery";
  transactionId?: string;
  orderStatus: "Confirmed";
}

const ORDERS_KEY = "prashna-orders";
const CURRENT_ORDER_KEY = "prashna-current-order";

export function createLocalOrder(order: Omit<LocalOrder, "id" | "createdAt" | "orderStatus">) {
  const result: LocalOrder = {
    ...order,
    id: `PRASHNA-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    orderStatus: "Confirmed",
  };
  const orders = getLocalOrders();
  localStorage.setItem(ORDERS_KEY, JSON.stringify([result, ...orders]));
  localStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify(result));
  return result;
}

export function getCurrentOrder(): LocalOrder | null {
  try { return JSON.parse(localStorage.getItem(CURRENT_ORDER_KEY) ?? "null") as LocalOrder | null; }
  catch { return null; }
}

export function getLocalOrders(): LocalOrder[] {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as LocalOrder[]; }
  catch { return []; }
}

export function paymentLabel(method: PaymentMethod) {
  return ({ fonepay: "Fonepay", esewa: "eSewa", khalti: "Khalti", card: "Credit or Debit Card", cod: "Cash on Delivery" })[method];
}
