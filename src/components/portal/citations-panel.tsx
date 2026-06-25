"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/player";
import { capturePortalEvent } from "@/lib/portal/analytics";
import type { PortalCitation } from "@/app/api/portal/chat/route";

/**
 * Source panel rendered beneath an archive answer. Two modes:
 *
 *   - Default (current turn): the full list renders inline — "Sources
 *     cited · N" eyebrow + an ordered list of rows, each echoing the
 *     Player's `RelatedRecordings` card rhythm (title + italic
 *     attribution stacked, mono timestamp as trailing pill).
 *   - `collapsed` (past turns): a single toggle button "▾ N sources"
 *     that expands in place to the full panel on click. Keeps prior
 *     exchanges compact so the current answer carries visual weight —
 *     coda behavior per the chat-thread redesign.
 *
 * The rows are chips in spirit; the Player's `RelatedRecordings` is the
 * visual reference so this reads as "a row of recordings you can go
 * listen to," not "an academic footnotes list."
 */
export function CitationsPanel({
  citations,
  collapsed = false,
}: {
  citations: PortalCitation[];
  collapsed?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!collapsed);

  if (citations.length === 0) return null;

  if (collapsed && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 self-start rounded-md px-1 py-0.5",
          "font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground",
          "transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <ChevronDownIcon className="size-3" />
        <span>
          {citations.length} source{citations.length === 1 ? "" : "s"}
        </span>
      </button>
    );
  }

  return (
    <section
      aria-labelledby="portal-sources-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <h4
          id="portal-sources-heading"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground"
        >
          Sources cited · {citations.length}
        </h4>
        <div aria-hidden className="h-px flex-1 bg-border/70" />
      </div>
      <ol className="flex flex-col gap-2">
        {citations.map((citation) => {
          const timestamp = formatTimestamp(citation.startTime);
          const href = `/player/${encodeURIComponent(citation.catalogNumber)}?t=${timestamp}`;
          const attribution = citation.intervieweeName ?? "unnamed interviewee";
          return (
            <li key={citation.index}>
              <Link
                href={href}
                onClick={() => {
                  capturePortalEvent("portal_citation_click", {
                    catalog_number: citation.catalogNumber,
                    start_time: citation.startTime,
                    citation_index: citation.index,
                    source: "panel",
                  });
                }}
                className="group flex flex-col gap-1 rounded-md border border-border/50 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-[3px] inline-flex h-5 min-w-5 items-center justify-center rounded-[min(var(--radius-md),10px)] border border-border bg-background px-1.5 font-mono text-[10px] font-medium tabular-nums text-muted-foreground"
                  >
                    {citation.index}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="font-heading text-sm font-semibold leading-tight text-foreground">
                      {citation.recordingTitle}
                    </p>
                    <p className="text-xs italic text-muted-foreground">
                      {attribution}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {timestamp}
                  </span>
                </div>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/75">
                  {citation.excerpt}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
