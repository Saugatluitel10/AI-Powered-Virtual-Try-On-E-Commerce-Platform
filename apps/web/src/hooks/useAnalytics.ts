"use client";

import { useCallback } from "react";
import { trackEvent } from "@/lib/posthog";

export function useAnalytics() {
  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      trackEvent(event, properties);
    },
    []
  );

  return {
    track,
    photoUploaded: (props?: Record<string, unknown>) => track("photo_uploaded", props),
    analysisComplete: (props?: Record<string, unknown>) => track("analysis_complete", props),
    tryonStarted: (props?: Record<string, unknown>) => track("tryon_started", props),
    tryonComplete: (props?: Record<string, unknown>) => track("tryon_complete", props),
    addToCart: (props?: Record<string, unknown>) => track("add_to_cart", props),
    purchaseComplete: (props?: Record<string, unknown>) => track("purchase_complete", props),
    styleQuizCompleted: (props?: Record<string, unknown>) => track("style_quiz_completed", props),
    stylistChatStarted: (props?: Record<string, unknown>) => track("stylist_chat_started", props),
  };
}
