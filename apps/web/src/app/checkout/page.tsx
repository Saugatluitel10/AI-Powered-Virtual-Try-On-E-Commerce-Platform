"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartStore, type ServerCartItem } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const DELIVERY_FEE = 150;

type PaymentMethod = "esewa" | "khalti" | "cod";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isSynced, fetchCart, serverItems, getSubtotal } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("esewa");
  const esewaFormRef = useRef<HTMLFormElement>(null);
  const [esewaFormData, setEsewaFormData] = useState<Record<string, string> | null>(null);

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    district: "",
    province: "",
  });

  useEffect(() => {
    if (user && !isSynced) {
      fetchCart().then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, isSynced, fetchCart]);

  // Auto-submit eSewa form after state update
  useEffect(() => {
    if (esewaFormData && esewaFormRef.current) {
      esewaFormRef.current.submit();
    }
  }, [esewaFormData]);

  const subtotal = getSubtotal();
  const total = subtotal + (serverItems.length > 0 ? DELIVERY_FEE : 0);

  function validateAddress(): boolean {
    return !!(
      address.fullName.trim() &&
      address.phone.trim() &&
      address.street.trim() &&
      address.city.trim() &&
      address.district.trim()
    );
  }

  async function handleSubmit() {
    setError(null);

    if (!validateAddress()) {
      setError("Please fill in all required address fields.");
      return;
    }
    if (serverItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create order
      const orderRes = await api.post<{
        data: { id: string; totalAmount: number; currency: string };
      }>("/orders", {
        shippingAddress: address,
        paymentMethod,
      });

      const orderId = orderRes.data.data.id;

      if (paymentMethod === "cod") {
        router.push(`/checkout/confirmation?orderId=${orderId}`);
        return;
      }

      if (paymentMethod === "esewa") {
        const esewaRes = await api.post<{
          data: { paymentUrl: string; formData: Record<string, string | number> };
        }>("/payments/esewa/initiate", { orderId });

        const { paymentUrl, formData } = esewaRes.data.data;
        const stringFormData: Record<string, string> = {};
        for (const [key, val] of Object.entries(formData)) {
          stringFormData[key] = String(val);
        }
        stringFormData._paymentUrl = paymentUrl;
        setEsewaFormData(stringFormData);
        return;
      }

      if (paymentMethod === "khalti") {
        const khaltiRes = await api.post<{
          data: { pidx: string; paymentUrl: string };
        }>("/payments/khalti/initiate", { orderId });

        window.location.href = khaltiRes.data.data.paymentUrl;
        return;
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden eSewa form for redirect */}
      {esewaFormData && (
        <form
          ref={esewaFormRef}
          method="POST"
          action={esewaFormData._paymentUrl}
          className="hidden"
        >
          {Object.entries(esewaFormData)
            .filter(([k]) => k !== "_paymentUrl")
            .map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
        </form>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/shop"
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        {serverItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cart is empty</h2>
            <Link href="/shop">
              <Button className="bg-purple-600 hover:bg-purple-700 mt-4">
                Continue Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left — Address & Payment */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    Shipping Address
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={address.fullName}
                        onChange={(e) =>
                          setAddress((a) => ({ ...a, fullName: e.target.value }))
                        }
                        placeholder="Ram Bahadur"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={address.phone}
                        onChange={(e) =>
                          setAddress((a) => ({ ...a, phone: e.target.value }))
                        }
                        placeholder="98XXXXXXXX"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        value={address.street}
                        onChange={(e) =>
                          setAddress((a) => ({ ...a, street: e.target.value }))
                        }
                        placeholder="Thamel, near Garden of Dreams"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={address.city}
                        onChange={(e) =>
                          setAddress((a) => ({ ...a, city: e.target.value }))
                        }
                        placeholder="Kathmandu"
                      />
                    </div>
                    <div>
                      <Label htmlFor="district">District *</Label>
                      <Input
                        id="district"
                        value={address.district}
                        onChange={(e) =>
                          setAddress((a) => ({ ...a, district: e.target.value }))
                        }
                        placeholder="Kathmandu"
                      />
                    </div>
                    <div>
                      <Label htmlFor="province">Province</Label>
                      <Input
                        id="province"
                        value={address.province}
                        onChange={(e) =>
                          setAddress((a) => ({ ...a, province: e.target.value }))
                        }
                        placeholder="Bagmati"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    Payment Method
                  </h2>
                  <div className="space-y-3">
                    {([
                      {
                        id: "esewa" as const,
                        label: "eSewa",
                        desc: "Pay with your eSewa wallet",
                        color: "bg-green-500",
                      },
                      {
                        id: "khalti" as const,
                        label: "Khalti",
                        desc: "Pay with Khalti digital wallet",
                        color: "bg-purple-500",
                      },
                      {
                        id: "cod" as const,
                        label: "Cash on Delivery",
                        desc: "Pay when you receive your order",
                        color: "bg-gray-500",
                      },
                    ] as const).map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          paymentMethod === method.id
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="sr-only"
                        />
                        <div
                          className={`w-3 h-3 rounded-full ${
                            paymentMethod === method.id ? "bg-purple-600" : "bg-gray-300"
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{method.label}</p>
                          <p className="text-sm text-gray-500">{method.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right — Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {serverItems.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
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
                          {formatCurrency(item.unitPrice * item.quantity, item.currency)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery</span>
                      <span>{formatCurrency(DELIVERY_FEE)}</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-purple-600">{formatCurrency(total)}</span>
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : paymentMethod === "cod" ? (
                      "Place Order"
                    ) : (
                      `Pay ${formatCurrency(total)}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
