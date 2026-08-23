"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentOrder, paymentLabel, type LocalOrder } from "@/lib/local-orders";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ConfirmationPage() {
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setOrder(getCurrentOrder()); setLoaded(true); }, []);
  if (!loaded) return <div className="mx-auto max-w-lg px-6 py-24 text-center"><p className="text-sm text-neutral-500">Loading your local order...</p></div>;
  if (!order) return <div className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="font-display text-4xl">No recent order</h1><Link href="/shop" className="mt-6 inline-block bg-black px-5 py-3 text-white">Continue shopping</Link></div>;
  return <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8"><div className="text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-green-600" /><p className="mt-4 text-xs font-bold uppercase text-green-700">Order confirmed</p><h1 className="mt-2 font-display text-4xl">Thank you for your order.</h1><p className="mt-3 text-neutral-500">{order.id} · {formatDate(order.createdAt)}</p></div><div className="mt-10 border border-black/10 bg-white p-5 sm:p-8"><h2 className="font-display text-2xl">Order summary</h2><div className="mt-5 space-y-4">{order.items.map((item) => <div key={`${item.productId}-${item.size}`} className="flex items-center gap-4 border-b border-black/10 pb-4">{item.productImage && <div className="relative h-20 w-16 overflow-hidden"><Image src={item.productImage} alt="" fill className="object-cover" sizes="64px" /></div>}<div className="flex-1"><p className="font-semibold">{item.productName}</p><p className="text-sm text-neutral-500">Size {item.size} · Quantity {item.quantity}</p></div><p className="font-bold">{formatCurrency(item.unitPrice * item.quantity)}</p></div>)}</div><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><Info label="Total" value={formatCurrency(order.total)} /><Info label="Payment Method" value={paymentLabel(order.paymentMethod)} /><Info label="Payment Status" value={order.paymentStatus} /><Info label="Order Status" value={order.orderStatus} />{order.transactionId && <Info label="Transaction ID" value={order.transactionId} />}</dl>{order.transactionId && <p className="mt-6 border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Demo payment only. No real transaction was processed.</p>}</div><div className="mt-8 text-center"><Link href="/shop" className="inline-block bg-black px-6 py-3 text-sm font-bold uppercase text-white">Continue shopping</Link></div></div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-neutral-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>; }
