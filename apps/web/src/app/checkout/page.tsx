"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Loader2, Smartphone, Truck, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { createLocalOrder, type PaymentMethod, paymentLabel } from "@/lib/local-orders";
import { formatCurrency } from "@/lib/utils";

const DELIVERY_FEE = 150;
const paymentMethods: { id: PaymentMethod; note: string }[] = [
  { id: "fonepay", note: "Demo mobile payment" }, { id: "esewa", note: "Demo wallet payment" },
  { id: "khalti", note: "Demo wallet payment" }, { id: "card", note: "Demo card form" },
  { id: "cod", note: "Pay when your order arrives" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, clearLocal } = useCartStore();
  const [method, setMethod] = useState<PaymentMethod>("fonepay");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentState, setPaymentState] = useState<"ready" | "loading" | "success">("ready");
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState({ fullName: "", phone: "", address: "", city: "Kathmandu" });
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const subtotal = getSubtotal();
  const deliveryFee = items.length ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  function validate() {
    if (!customer.fullName.trim() || !/^9\d{9}$/.test(customer.phone) || !customer.address.trim() || !customer.city.trim()) {
      setError("Enter your name, a valid 10-digit Nepal phone number, address, and city.");
      return false;
    }
    setError(""); return true;
  }

  function placeOrder() {
    if (!items.length) return;
    if (method === "card" && (!card.name.trim() || card.number.replace(/\s/g, "").length < 12 || !/^\d{2}\/\d{2}$/.test(card.expiry) || !/^\d{3,4}$/.test(card.cvv))) {
      setError("Enter valid demo card details. They are checked only in this browser and are never stored."); return;
    }
    setError(""); setPaymentState("loading");
    window.setTimeout(() => {
      setPaymentState("success");
      window.setTimeout(() => {
        const transactionId = `DEMO-${method.toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
        createLocalOrder({ customer, items: [...items], subtotal, deliveryFee, total, paymentMethod: method, paymentStatus: "Demo paid", transactionId });
        clearLocal(); router.push("/checkout/confirmation");
      }, 900);
    }, 1200);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate() || !items.length) return;
    if (method === "cod") {
      createLocalOrder({ customer, items: [...items], subtotal, deliveryFee, total, paymentMethod: method, paymentStatus: "Payment on delivery" });
      clearLocal(); router.push("/checkout/confirmation"); return;
    }
    setPaymentState("ready"); setPaymentOpen(true);
  }

  if (!items.length) return <div className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="font-display text-4xl">Your cart is empty</h1><p className="mt-3 text-neutral-500">Add something you love before checking out.</p><Link href="/shop" className="mt-6 inline-block bg-black px-6 py-3 text-sm font-bold uppercase text-white">Go to shop</Link></div>;

  return <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-8"><p className="text-xs font-bold uppercase text-[#b61f32]">Secure local demo</p><h1 className="mt-2 font-display text-4xl">Checkout</h1><form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
    <div className="space-y-8"><section className="border border-black/10 bg-white p-5 sm:p-7"><h2 className="font-display text-2xl">Delivery details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Full name" value={customer.fullName} onChange={(value) => setCustomer({ ...customer, fullName: value })} /><Field label="Phone" value={customer.phone} onChange={(value) => setCustomer({ ...customer, phone: value })} placeholder="98XXXXXXXX" /><div className="sm:col-span-2"><Field label="Street address" value={customer.address} onChange={(value) => setCustomer({ ...customer, address: value })} /></div><Field label="City" value={customer.city} onChange={(value) => setCustomer({ ...customer, city: value })} /></div></section>
      <section className="border border-black/10 bg-white p-5 sm:p-7"><h2 className="font-display text-2xl">Payment method</h2><p className="mt-1 text-sm text-neutral-500">All online payments are simulations. No money is processed.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{paymentMethods.map((item) => <button key={item.id} type="button" onClick={() => setMethod(item.id)} className={`flex min-h-20 items-center gap-3 border p-4 text-left ${method === item.id ? "border-[#b61f32] bg-[#fff4f4]" : "border-black/15"}`}>{item.id === "cod" ? <Truck /> : item.id === "card" ? <CreditCard /> : <Smartphone />}<span><strong className="block">{paymentLabel(item.id)}</strong><span className="text-xs text-neutral-500">{item.note}</span></span></button>)}</div></section>
      {error && <p role="alert" className="border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    </div>
    <aside className="h-fit border border-black/10 bg-white p-5 lg:sticky lg:top-24"><h2 className="font-display text-2xl">Your order</h2><div className="mt-5 space-y-4">{items.map((item) => <div key={`${item.productId}-${item.size}`} className="flex gap-3">{item.productImage && <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-neutral-100"><Image src={item.productImage} alt="" fill className="object-cover" sizes="64px" /></div>}<div className="min-w-0 text-sm"><p className="font-semibold">{item.productName}</p><p className="text-neutral-500">Size {item.size} · Qty {item.quantity}</p><p className="mt-1 font-bold">{formatCurrency(item.unitPrice * item.quantity)}</p></div></div>)}</div><div className="mt-5 space-y-2 border-t border-black/10 pt-4 text-sm"><Row label="Subtotal" value={formatCurrency(subtotal)} /><Row label="Delivery" value={formatCurrency(deliveryFee)} /><div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div></div><button type="submit" className="mt-6 w-full bg-[#b61f32] px-5 py-4 text-sm font-bold uppercase text-white">{method === "cod" ? "Confirm order" : `Continue with ${paymentLabel(method)}`}</button></aside>
  </form>
  {paymentOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md bg-white p-6 sm:p-8"><button onClick={() => setPaymentOpen(false)} className="ml-auto grid h-9 w-9 place-items-center" aria-label="Close payment"><X /></button>{paymentState === "ready" && <><p className="text-xs font-bold uppercase text-[#b61f32]">Demo Payment</p><h2 className="mt-2 font-display text-4xl">{paymentLabel(method)}</h2><p className="mt-4 text-2xl font-bold">{formatCurrency(total)}</p><p className="mt-2 text-sm text-neutral-500">This is a local demonstration. No real transaction will be processed.</p>{method === "card" && <div className="mt-5 space-y-3"><Field label="Cardholder name" value={card.name} onChange={(value) => setCard({ ...card, name: value })} /><Field label="Card number" value={card.number} onChange={(value) => setCard({ ...card, number: value })} placeholder="4242 4242 4242 4242" /><div className="grid grid-cols-2 gap-3"><Field label="Expiry" value={card.expiry} onChange={(value) => setCard({ ...card, expiry: value })} placeholder="12/30" /><Field label="CVV" value={card.cvv} onChange={(value) => setCard({ ...card, cvv: value })} placeholder="123" /></div><p className="text-xs text-neutral-500">Card values are not stored or sent anywhere.</p></div>}{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<button onClick={placeOrder} className="mt-6 w-full bg-[#b61f32] px-5 py-4 text-sm font-bold uppercase text-white">Continue to Demo Payment</button></>}{paymentState === "loading" && <div className="py-16 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-[#b61f32]" /><h2 className="mt-5 font-display text-2xl">Completing demo payment...</h2></div>}{paymentState === "success" && <div className="py-12 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /><h2 className="mt-5 font-display text-3xl">Payment Successful</h2><p className="mt-2 text-sm text-neutral-500">Demo payment only. No real transaction was processed.</p></div>}</div></div>}
  </div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="block text-xs font-bold uppercase">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full border border-black/25 px-3 text-sm font-normal normal-case" /></label>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between"><span className="text-neutral-500">{label}</span><span>{value}</span></div>; }
