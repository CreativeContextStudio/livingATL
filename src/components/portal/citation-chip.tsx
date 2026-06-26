"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/player";
import { capturePortalEvent } from "@/lib/portal/analytics";
import type { PortalCitation } from "@/app/api/portal/chat/route";

/**
 * Inline citation pill rendered inside the Portal's answer card wherever
 * the LLM emitted a `[N]` marker. Deep-links into the Audio Player at the
 * chunk's start timestamp using the same `?t=MM:SS` share-URL contract that
 * ShareButton uses (see `lib/player.ts::formatTimestamp` +
 * `components/player/share-button.tsx`).
 *
 * Visual register: quiet outline pill at `size="xs"`-equivalent height,
 * radius tracking the shadcn `--radius-md` scale so it reads as a sibling
 * of the app's other inline chips (filter chips, kbd hints, badge).
 *
 * `data-citation-index` gives downstream UI (e.g. a future "highlight the
 * cited row in CitationsPanel when the inline chip is hovered") a stable
 * selector without requiring a context provider.
 */
export function CitationChip({ citation }: { citation: PortalCitation }) {
  const timestamp = formatTimestamp(citation.startTime);
  const href = `/player/${encodeURIComponent(citation.catalogNumber)}?t=${timestamp}`;
  const label = citation.intervieweeName
    ? `${citation.intervieweeName} at ${timestamp}`
    : `${citation.recordingTitle} at ${timestamp}`;

  return (
    <Link
      href={href}
      onClick={() => {
        capturePortalEvent("portal_citation_click", {
          catalog_number: citation.catalogNumber,
          start_time: citation.startTime,
          citation_index: citation.index,
        });
      }}
      title={label}
      aria-label={`Open Player for ${label}`}
      data-citation-index={citation.index}
      className={cn(
        "relative inline-flex h-5 min-w-5 items-center justify-center rounded-[min(var(--radius-md),10px)] border border-border bg-background px-1.5 align-baseline font-mono text-[10px] font-medium tabular-nums text-muted-foreground transition-colors",
        // Enlarge the touch hit-area on mobile without disturbing inline text
        // flow (the pseudo-element overlays; a modest inset avoids stealing
        // taps from adjacent words). Removed at md where a cursor is precise.
        "after:absolute after:-inset-1.5 after:content-[''] md:after:hidden",
        "hover:border-primary/40 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      {citation.index}
    </Link>
  );
}
