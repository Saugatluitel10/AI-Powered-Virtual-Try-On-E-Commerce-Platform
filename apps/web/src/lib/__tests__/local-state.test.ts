import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { MemoryStorage } from "@/lib/__tests__/test-storage";
import {
  getLocalSession,
  localSignIn,
  localSignOut,
  localSignUp,
} from "@/lib/local-auth";
import { createLocalOrder, getCurrentOrder, getLocalOrders } from "@/lib/local-orders";
import { useCartStore } from "@/store/cartStore";

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
  useCartStore.setState({ items: [], serverItems: [], isLoading: false, isSynced: false });
});

describe("local authentication", () => {
  test("creates and signs in the demo account", async () => {
    const user = await localSignIn("demo@prashna.clo", "Demo@123");
    assert.equal(user.email, "demo@prashna.clo");
    assert.equal(getLocalSession()?.id, "demo-user");
  });

  test("rejects invalid credentials", async () => {
    await assert.rejects(localSignIn("demo@prashna.clo", "wrong-password"), /Invalid email or password/);
  });

  test("normalizes signup, rejects duplicates, and never stores a plain-text password", async () => {
    await localSignUp("New Shopper", "  USER@EXAMPLE.COM ", "StrongPass1");
    assert.equal(getLocalSession()?.email, "user@example.com");

    const stored = localStorage.getItem("prashna-accounts") ?? "";
    assert.ok(!stored.includes("StrongPass1"));
    assert.match(stored, /PBKDF2-SHA-256/);
    await assert.rejects(localSignUp("Duplicate", "user@example.com", "AnotherPass1"), /already exists/);
  });

  test("logout removes the persistent session", async () => {
    await localSignIn("demo@prashna.clo", "Demo@123");
    localSignOut();
    assert.equal(getLocalSession(), null);
  });
});

describe("cart and order state", () => {
  test("adds, combines, clamps, changes, and removes cart quantities", () => {
    const item = {
      productId: "demo-1",
      productName: "Test garment",
      productImage: "/products/product-01.jpg",
      brandName: "Test brand",
      size: "M",
      quantity: 1,
      unitPrice: 2_000,
      currency: "NPR",
    };
    useCartStore.getState().addItem(item);
    useCartStore.getState().addItem({ ...item, quantity: 2 });
    assert.equal(useCartStore.getState().getItemCount(), 3);
    assert.equal(useCartStore.getState().getSubtotal(), 6_000);

    useCartStore.getState().updateQuantity(item.productId, item.size, 20);
    assert.equal(useCartStore.getState().getItemCount(), 10);
    useCartStore.getState().updateQuantity(item.productId, item.size, 0);
    assert.equal(useCartStore.getState().getItemCount(), 1);
    useCartStore.getState().removeItem(item.productId, item.size);
    assert.equal(useCartStore.getState().getItemCount(), 0);
  });

  test("creates a complete local order and preserves order history", () => {
    const order = createLocalOrder({
      customer: { fullName: "Demo Shopper", phone: "9812345678", address: "Putalisadak", city: "Kathmandu" },
      items: [],
      subtotal: 2_000,
      deliveryFee: 150,
      total: 2_150,
      paymentMethod: "cod",
      paymentStatus: "Payment on delivery",
    });
    assert.match(order.id, /^PRASHNA-\d{4}$/);
    assert.equal(order.orderStatus, "Confirmed");
    assert.equal(getCurrentOrder()?.id, order.id);
    assert.equal(getLocalOrders()[0].id, order.id);
  });
});
