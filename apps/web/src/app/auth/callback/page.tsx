"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.getSession();

      if (authError || !data.session) {
        setError("Authentication failed. Please try again.");
        return;
      }

      try {
        await api.post(
          "/auth/social/callback",
          {},
          { headers: { Authorization: `Bearer ${data.session.access_token}` } }
        );
      } catch {}

      router.push("/");
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <a href="/login" className="text-primary font-bold editorial-underline">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-on-surface-variant">Completing sign in...</p>
      </div>
    </div>
  );
}
