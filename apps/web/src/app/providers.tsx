"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, Suspense } from "react";
import { initPostHog, identifyUser, resetUser } from "@/lib/posthog";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

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
    initPostHog();
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Hydrate on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session);
    });

    // Keep in sync with Supabase auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session);
      if (session?.user) {
        identifyUser(session.user.id, { email: session.user.email });
      } else {
        resetUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [setAuth, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <PostHogProvider>{children}</PostHogProvider>
      </Suspense>
    </QueryClientProvider>
  );
}
