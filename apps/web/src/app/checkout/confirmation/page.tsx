"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle,
  Package,
  Loader2,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { trackEvent } from "@/lib/posthog";
import { formatCurrency } from "@/lib/utils";

interface OrderDetail {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  items: Array<{
    id: string;
    productName: string;
    productImage: string | null;
    productSlug: string;
    size: string;
    quantity: number;
    priceAtTime: number;
  }>;
  createdAt: string;
}

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided.");
      setLoading(false);
      return;
    }

    api
      .get<{ data: OrderDetail }>(`/orders/${orderId}`)
      .then((res) => {
        setOrder(res.data.data);
        trackEvent("purchase_complete", {
          orderId: res.data.data.id,
          totalAmount: res.data.data.totalAmount,
          currency: res.data.data.currency,
          paymentMethod: res.data.data.paymentMethod,
          itemCount: res.data.data.items.length,
        });
      })
      .catch(() => setError("Could not load order details."))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Package className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">{error ?? "Order not found."}</p>
        <Link href="/shop">
          <Button className="bg-purple-600 hover:bg-purple-700">Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const isPaid = order.status === "confirmed";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Status header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {isPaid ? "Payment Successful!" : "Order Placed!"}
          </h1>
          <p className="text-gray-500">
            {isPaid
              ? "Your payment has been confirmed."
              : "Your order has been placed successfully."}
          </p>
        </div>

        {/* Order card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono font-semibold text-gray-900">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isPaid
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>

            {order.paymentMethod && (
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium capitalize">{order.paymentMethod}</span>
              </div>
            )}

            {order.paymentRef && (
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-xs">{order.paymentRef}</span>
              </div>
            )}

            <Separator className="my-4" />

            {/* Items */}
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.productImage ? (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Size: {item.size} &times; {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {formatCurrency(item.priceAtTime * item.quantity, order.currency)}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-purple-600">
                {formatCurrency(order.totalAmount, order.currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/orders" className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <Package className="w-4 h-4" />
              View Orders
            </Button>
          </Link>
          <Link href="/shop" className="flex-1">
            <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
