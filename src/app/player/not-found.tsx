import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Recording not found",
};

/**
 * `/player/*` 404 — unknown catalog number, or a recording that
 * isn't published (not `completed`). Raised from the segment layout, before
 * streaming, so the response is a real 404. Lives in `player/` (not
 * `[catalog]/`) because a layout's `notFound()` is handled by the parent
 * segment's boundary.
 */
export default function RecordingNotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col items-start justify-center gap-5 px-6 py-16">
      <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
        404 · Recording
      </p>
      <h1 className="font-heading text-3xl font-bold">
        We couldn&rsquo;t find that recording
      </h1>
      <p className="max-w-prose text-muted-foreground">
        The catalog number may be mistyped, or the recording isn&rsquo;t
        available in the archive yet.
      </p>
      <Link href="/browse" className={buttonVariants()}>
        Browse the collection
      </Link>
    </main>
  );
}
