"use client";

import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getLocalOrders, paymentLabel, type LocalOrder } from "@/lib/local-orders";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setOrders(getLocalOrders()); setLoaded(true); }, []);
  if (!loaded) return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8"><p className="text-xs font-bold uppercase text-[#b61f32]">Stored in this browser</p><h1 className="mt-2 font-display text-4xl">Your orders</h1><p className="mt-8 text-sm text-neutral-500">Loading your local orders...</p></div>;
  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8"><p className="text-xs font-bold uppercase text-[#b61f32]">Stored in this browser</p><h1 className="mt-2 font-display text-4xl">Your orders</h1>{orders.length === 0 ? <div className="mt-10 border border-dashed border-black/30 py-16 text-center"><PackageCheck className="mx-auto h-12 w-12 text-neutral-300" /><h2 className="mt-4 font-display text-2xl">No orders yet</h2><Link href="/shop" className="mt-5 inline-block bg-black px-5 py-3 text-sm font-bold uppercase text-white">Start shopping</Link></div> : <div className="mt-8 space-y-4">{orders.map((order) => <article key={`${order.id}-${order.createdAt}`} className="border border-black/10 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold">{order.id}</p><p className="mt-1 text-sm text-neutral-500">{formatDate(order.createdAt)} · {order.items.length} item types</p></div><span className="bg-green-100 px-3 py-1 text-xs font-bold uppercase text-green-800">{order.orderStatus}</span></div><div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-black/10 pt-4 text-sm"><p>{paymentLabel(order.paymentMethod)} · {order.paymentStatus}</p><p className="font-bold">{formatCurrency(order.total)}</p></div></article>)}</div>}</div>;
}
