"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";

export default function BrandRegisterPage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.post("/auth/register-brand", { brandName: brandName.trim() });
      setSuccess(true);
      setTimeout(() => router.push("/brand"), 2000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to register brand";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Brand Registered!</h2>
            <p className="text-gray-500">
              Your brand is pending admin verification. Redirecting to the brand portal...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Register Your Brand</h1>
              <p className="text-sm text-gray-500">Start selling on VTryon</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name
              </label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Your brand name"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={submitting || !brandName.trim()}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Register Brand
            </Button>

            <p className="text-xs text-gray-500 text-center">
              After registration, your brand will need to be verified by an admin before you can start selling.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
