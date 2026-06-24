import * as Sentry from "@sentry/node";

export function initSentry() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [Sentry.prismaIntegration()],
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value ?? "";
      if (message.includes("AI service") || message.includes("Replicate")) {
        event.tags = { ...event.tags, category: "ai_service" };
      }
      if (message.includes("eSewa") || message.includes("Khalti") || message.includes("Stripe") || message.includes("payment")) {
        event.tags = { ...event.tags, category: "payment" };
      }
      return event;
    },
  });
}

export { Sentry };
