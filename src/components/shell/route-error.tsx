"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Shared body for every `error.tsx` boundary. Renders inside the root layout,
 * so the header, theme, and footer stay intact (unlike `global-error.tsx`).
 *
 * Server Component errors arrive here with a generic message and a `digest`;
 * `instrumentation.ts`'s `onRequestError` already reported the real error, so
 * only client-side errors (no digest) are sent to Sentry from here.
 */
export function RouteError({
  error,
  retry,
  surface,
}: {
  error: unknown;
  retry: () => void;
  /** What failed to load, e.g. "The collection". Defaults to "This page". */
  surface?: string;
}) {
  const digest =
    error instanceof Error && "digest" in error
      ? (error as Error & { digest?: string }).digest
      : undefined;

  useEffect(() => {
    if (!digest) Sentry.captureException(error);
  }, [error, digest]);

  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col items-start justify-center gap-5 px-6 py-16">
      <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="font-heading text-3xl font-bold">
        {surface ?? "This page"} didn&rsquo;t load
      </h1>
      <p className="max-w-prose text-muted-foreground">
        The archive couldn&rsquo;t be reached just now. This is usually
        temporary — try again in a moment.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      </div>
      {digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {digest}
        </p>
      ) : null}
    </main>
  );
}
