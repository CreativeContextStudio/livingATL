import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { titleClass } from "@/components/shell/page-header";

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
    <main className="page-container flex min-h-[60dvh] flex-col items-start justify-center gap-5 py-16">
      <p className="eyebrow">
        404 · Recording
      </p>
      <h1 className={titleClass()}>
        We couldn&rsquo;t find that recording
      </h1>
      <p className="max-w-prose leading-relaxed text-pretty text-muted-foreground">
        The catalog number may be mistyped, or the recording isn&rsquo;t
        available in the archive yet.
      </p>
      <Link href="/browse" className={buttonVariants()}>
        Browse the collection
      </Link>
    </main>
  );
}
