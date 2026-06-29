"use client";

import { useEffect } from "react";

type MetricName = "CLS" | "FCP" | "INP" | "LCP" | "TTFB";

interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
}

function sendToAnalytics(metric: WebVitalMetric) {
  const body = JSON.stringify({
    name: metric.name,
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    page: window.location.pathname,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/v1/analytics/vitals", body);
  }

  if (typeof window !== "undefined" && "posthog" in window) {
    (window as Record<string, unknown>).posthog &&
      (window.posthog as { capture?: (event: string, props: Record<string, unknown>) => void })?.capture?.("web_vital", {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating,
        page: window.location.pathname,
      });
  }
}

export function WebVitals() {
  useEffect(() => {
    import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onCLS(sendToAnalytics as (metric: unknown) => void);
      onFCP(sendToAnalytics as (metric: unknown) => void);
      onINP(sendToAnalytics as (metric: unknown) => void);
      onLCP(sendToAnalytics as (metric: unknown) => void);
      onTTFB(sendToAnalytics as (metric: unknown) => void);
    }).catch(() => {});
  }, []);

  return null;
}
