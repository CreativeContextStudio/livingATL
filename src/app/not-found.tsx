import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Root 404 — unmatched URLs and any `notFound()` without a closer
 * `not-found.tsx`. Renders inside the root layout so header/theme stay.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col items-start justify-center gap-5 px-6 py-16">
      <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
        404
      </p>
      <h1 className="font-heading text-3xl font-bold">
        We couldn&rsquo;t find that page
      </h1>
      <p className="max-w-prose text-muted-foreground">
        The link may be mistyped, or the page may have moved.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back to home
      </Link>
    </main>
  );
}
