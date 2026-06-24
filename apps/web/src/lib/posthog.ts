"use client";

import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    capture_pageview: false,
    persistence: "localStorage",
    autocapture: true,
  });
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, traits);
}

export function resetUser() {
  if (typeof window === "undefined") return;
  posthog.reset();
}

export { posthog };
