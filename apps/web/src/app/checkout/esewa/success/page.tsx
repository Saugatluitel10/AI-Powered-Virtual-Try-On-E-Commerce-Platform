"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import api from "@/lib/api";

export default function EsewaSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const encodedResponse = searchParams.get("data");

    if (!orderId || !encodedResponse) {
      setError("Missing payment data. Please contact support.");
      return;
    }

    api
      .post("/payments/esewa/verify", { orderId, encodedResponse })
      .then(() => {
        router.replace(`/checkout/confirmation?orderId=${orderId}`);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error ?? "Payment verification failed. Please contact support.";
        setError(msg);
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
        <p className="text-gray-500 text-center mb-6 max-w-md">{error}</p>
        <Link href="/shop">
          <Button className="bg-purple-600 hover:bg-purple-700">Back to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
      <p className="text-gray-600 font-medium">Verifying your eSewa payment...</p>
      <p className="text-gray-400 text-sm mt-1">Please wait, do not close this page.</p>
    </div>
  );
}
