"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Loader2,
  ChevronRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<{ data: { items: OrderData[] } }>("/orders")
      .then((res) => setOrders(res.data.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) =>
    search
      ? o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.items.some((i) => i.productName.toLowerCase().includes(search.toLowerCase()))
      : true
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          {orders.length > 0 && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">When you place an order, it will appear here.</p>
            <Link href="/shop">
              <Button className="bg-purple-600 hover:bg-purple-700">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(order.createdAt)} &middot; {order.itemCount}{" "}
                          {order.itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
