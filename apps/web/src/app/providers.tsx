"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, Suspense } from "react";
import { getLocalSession } from "@/lib/local-auth";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  const { setAuth, setLoading } = useAuthStore();

  useEffect(() => {
    setAuth(getLocalSession());
    void useCartStore.persist.rehydrate();
  }, [setAuth, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </QueryClientProvider>
  );
}
