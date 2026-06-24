"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, posthog } from "@/lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (pathname) {
      const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
