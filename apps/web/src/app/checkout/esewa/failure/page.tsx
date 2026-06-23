"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EsewaFailurePage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <XCircle className="w-16 h-16 text-red-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
      <p className="text-gray-500 text-center mb-6 max-w-md">
        Your eSewa payment was not completed. No charges have been made.
        {orderId && " You can try again from your orders page."}
      </p>
      <div className="flex gap-3">
        {orderId && (
          <Link href="/orders">
            <Button variant="outline">View Orders</Button>
          </Link>
        )}
        <Link href="/shop">
          <Button className="bg-purple-600 hover:bg-purple-700">Back to Shop</Button>
        </Link>
      </div>
    </div>
  );
}
