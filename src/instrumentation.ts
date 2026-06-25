/**
 * Server + edge runtime instrumentation for @sentry/nextjs 10.x on Next.js 16.
 * Runs once per runtime at cold start. Also exports the `onRequestError` hook
 * so Sentry can capture errors thrown inside Server Components and Route
 * Handlers.
 *
 * PRD §8.6 privacy constraint: sendDefaultPii is explicitly false. Oral
 * history content must never leave our stack through an error report.
 */

import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      sendDefaultPii: false,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      sendDefaultPii: false,
      debug: false,
    });
  }
}

/**
 * Next.js 15+ hook for reporting errors thrown inside Server Components,
 * Route Handlers, and Server Actions. @sentry/nextjs ships a pre-built
 * helper — we just re-export it.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  ...args
) => {
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(...args);
};
