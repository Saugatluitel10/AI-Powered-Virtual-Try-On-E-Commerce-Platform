"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/utils";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DELIVERY_ESTIMATE = 150;

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { user } = useAuthStore();
  const {
    isSynced,
    fetchCart,
    syncToServer,
    getItems,
    getSubtotal,
    getItemCount,
    removeItem,
    updateQuantity,
    removeFromServer,
    updateServerQuantity,
  } = useCartStore();

  useEffect(() => {
    if (open && user) {
      if (!isSynced) {
        syncToServer();
      } else {
        fetchCart();
      }
    }
  }, [open, user, isSynced, syncToServer, fetchCart]);

  const items = getItems();
  const subtotal = getSubtotal();
  const itemCount = getItemCount();
  const total = subtotal + (itemCount > 0 ? DELIVERY_ESTIMATE : 0);

  function handleRemove(item: (typeof items)[0]) {
    if ("id" in item && typeof item.id === "string") {
      removeFromServer(item.id);
    } else {
      removeItem(item.productId, item.size);
    }
  }

  function handleQuantityChange(item: (typeof items)[0], delta: number) {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    if ("id" in item && typeof item.id === "string") {
      updateServerQuantity(item.id, newQty);
    } else {
      updateQuantity(item.productId, item.size, newQty);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Cart ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium mb-2">Your cart is empty</p>
            <p className="text-gray-400 text-sm mb-6">
              Find something you love in our shop
            </p>
            <Link href="/shop" onClick={onClose}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Browse Shop
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4 mt-4">
              {items.map((item, idx) => (
                <div key={`${item.productId}-${item.size}-${idx}`} className="flex gap-3">
                  <div className="relative w-20 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.productImage ? (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm line-clamp-1">
                      {item.productName}
                    </p>
                    {item.brandName && (
                      <p className="text-xs text-gray-500">{item.brandName}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">Size: {item.size}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => handleQuantityChange(item, -1)}
                          className="p-1 hover:bg-gray-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item, 1)}
                          className="p-1 hover:bg-gray-50"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                      <p className="font-semibold text-sm text-gray-900">
                        {formatCurrency(item.unitPrice * item.quantity, item.currency)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(item)}
                    className="p-1 text-gray-400 hover:text-red-500 self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t pt-4 mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery estimate</span>
                <span className="font-medium">{formatCurrency(DELIVERY_ESTIMATE)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="text-purple-600">{formatCurrency(total)}</span>
              </div>
              <Link href="/checkout" onClick={onClose}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 mt-2">
                  Proceed to Checkout
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
