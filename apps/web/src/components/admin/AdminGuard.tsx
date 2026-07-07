"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    api
      .get<{ data: { role: string } }>("/auth/me")
      .then((res) => {
        if (res.data.data.role === "ADMIN") {
          setAuthorized(true);
        } else {
          router.replace("/admin/login?error=unauthorized");
        }
      })
      .catch(() => {
        router.replace("/admin/login");
      })
      .finally(() => setChecking(false));
  }, [user, authLoading, router]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-on-primary animate-spin mx-auto mb-4" />
          <p className="text-on-primary/60 text-[11px] font-bold uppercase tracking-[0.15em]">
            Verifying access
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
