"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2, AlertCircle, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

function CheckoutForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await api.post("/payments/stripe/confirm", {
          orderId,
          paymentIntentId: paymentIntent.id,
        });
      } catch {
        // Webhook will handle confirmation as fallback
      }
      router.push(`/checkout/confirmation?orderId=${orderId}`);
    } else {
      setError("Payment was not completed. Please try again.");
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement className="mb-6" />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing payment...
          </>
        ) : (
          "Pay Now"
        )}
      </Button>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        Secured by Stripe
      </div>
    </form>
  );
}

export default function StripeCheckoutPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const clientSecret = searchParams.get("clientSecret");

  if (!orderId || !clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Invalid checkout session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">Complete Payment</h1>
          </div>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: { colorPrimary: "#7c3aed" },
              },
            }}
          >
            <CheckoutForm orderId={orderId} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}
