"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getLocalSession } from "@/lib/local-auth";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";

const PUBLIC_PATHS = new Set(["/login", "/signup", "/privacy"]);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, setAuth } = useAuthStore();

  useEffect(() => {
    setAuth(getLocalSession());
    void useCartStore.persist.rehydrate();
  }, [setAuth]);

  useEffect(() => {
    if (!loading && !user && !PUBLIC_PATHS.has(pathname)) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  const protectedPathPending = !PUBLIC_PATHS.has(pathname) && (loading || !user);

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        {protectedPathPending ? (
          <div className="grid min-h-screen place-items-center bg-[#f8f7f3]">
            <p className="font-display text-2xl font-bold">
              prashna<span className="text-[#b61f32]">.clo</span>
            </p>
          </div>
        ) : (
          children
        )}
      </Suspense>
    </QueryClientProvider>
  );
}
