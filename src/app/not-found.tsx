import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { titleClass } from "@/components/shell/page-header";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Root 404 — unmatched URLs and any `notFound()` without a closer
 * `not-found.tsx`. Renders inside the root layout so header/theme stay.
 */
export default function NotFound() {
  return (
    <main className="page-container flex min-h-[60dvh] flex-col items-start justify-center gap-5 py-16">
      <p className="eyebrow">
        404
      </p>
      <h1 className={titleClass()}>
        We couldn&rsquo;t find that page
      </h1>
      <p className="max-w-prose leading-relaxed text-pretty text-muted-foreground">
        The link may be mistyped, or the page may have moved.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back to home
      </Link>
    </main>
  );
}
