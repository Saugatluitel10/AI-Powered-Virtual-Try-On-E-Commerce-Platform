"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Loader2,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface OrderItemData {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productSlug: string;
  size: string;
  quantity: number;
  priceAtTime: number;
}

interface OrderData {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string | null;
  itemCount: number;
  items: OrderItemData[];
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: { items: OrderData[] } }>("/orders")
      .then((res) => setOrders(res.data.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No orders yet
            </h2>
            <p className="text-gray-500 mb-6">
              When you place an order, it will appear here.
            </p>
            <Link href="/shop">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              return (
                <Card key={order.id}>
                  <CardContent className="p-0">
                    {/* Order header */}
                    <button
                      onClick={() =>
                        setExpandedOrder(isExpanded ? null : order.id)
                      }
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.createdAt)} &middot;{" "}
                            {order.itemCount}{" "}
                            {order.itemCount === 1 ? "item" : "items"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded items */}
                    {isExpanded && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-3">
                        {order.paymentMethod && (
                          <p className="text-xs text-gray-500">
                            Paid via{" "}
                            <span className="font-medium capitalize">
                              {order.paymentMethod}
                            </span>
                          </p>
                        )}
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
                              <Link
                                href={`/shop/${item.productSlug}`}
                                className="text-sm font-medium text-gray-900 hover:text-purple-600 line-clamp-1"
                              >
                                {item.productName}
                              </Link>
                              <p className="text-xs text-gray-500">
                                Size: {item.size} &times; {item.quantity}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(
                                item.priceAtTime * item.quantity,
                                order.currency
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
