"use client";

import { trackEvent } from "./posthog";

export const FUNNEL_EVENTS = {
  LANDING_VIEW: "landing_page_viewed",
  SIGNUP_START: "signup_started",
  SIGNUP_COMPLETE: "signup_completed",
  PHOTO_UPLOAD_START: "photo_upload_started",
  PHOTO_UPLOAD_COMPLETE: "photo_upload_completed",
  BODY_SCAN_COMPLETE: "body_scan_completed",
  PRODUCT_VIEW: "product_viewed",
  TRYON_START: "tryon_started",
  TRYON_COMPLETE: "tryon_completed",
  ADD_TO_CART: "add_to_cart",
  CHECKOUT_START: "checkout_started",
  PAYMENT_INITIATED: "payment_initiated",
  PURCHASE_COMPLETE: "purchase_completed",
  STYLE_ADVICE_REQUESTED: "style_advice_requested",
  WARDROBE_SAVE: "wardrobe_item_saved",
} as const;

type FunnelEvent = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];

export function trackFunnel(
  event: FunnelEvent,
  properties?: Record<string, unknown>
) {
  trackEvent(event, {
    ...properties,
    funnel_version: "beta_v1",
    timestamp: new Date().toISOString(),
  });
}

export function trackDropOff(
  fromStep: FunnelEvent,
  reason?: string
) {
  trackEvent("funnel_drop_off", {
    from_step: fromStep,
    reason: reason ?? "unknown",
    funnel_version: "beta_v1",
  });
}
