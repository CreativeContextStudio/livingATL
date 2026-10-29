"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, PlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/player";
import { capturePortalEvent } from "@/lib/portal/analytics";
import type { PortalCitation } from "@/app/api/portal/chat/route";
import { ContentNotice } from "./content-notice";
import { useListeningQueue } from "@/components/queue/listening-queue";
import { formatSpeakerName, titleForCard } from "@/lib/format";

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
/** Transcript chunks carry speaker tags for retrieval; show them as a
 *  plain "Interviewer:" cue (or nothing for the storyteller). */
function readableExcerpt(text: string): string {
  return text
    .replace(/…$/, "")
    // A tag cut off by the stored excerpt's truncation ("… [INTE").
    .replace(/\s*\[[A-Z]*\]?\s*$/, "")
    .replace(/\[INTERVIEWER\]\s*/g, "Interviewer: ")
    .replace(/\[(INTERVIEWEE|OTHER)\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Oral history interview of Roy Dunn, clip 2 of 2" → "Clip 2 of 2" (the
 *  storyteller's name is already the row's title); other titles shortened. */
function recordingLabel(title: string): string {
  const short = titleForCard(title);
  const clip = /,\s*(clip \d+ of \d+)$/i.exec(short);
  if (clip) return clip[1].charAt(0).toUpperCase() + clip[1].slice(1);
  return short;
}

export function CitationsPanel({
  citations,
  collapsed = false,
  headingLevel = "h2",
}: {
  citations: PortalCitation[];
  collapsed?: boolean;
  /** h3 inside the Portal conversation (under each question's h2). */
  headingLevel?: "h2" | "h3";
}) {
  // Follows `collapsed` (earlier answers fold away when a new one arrives)
  // until the reader toggles it themselves.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const isOpen = toggled ?? !collapsed;
  const headingId = useId();
  const Heading = headingLevel;

  if (citations.length === 0) return null;

  if (collapsed && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setToggled(true)}
        className={cn(
          "inline-flex items-center gap-1 self-start rounded-md px-1 py-0.5",
          "font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground",
          "transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <ChevronDownIcon className="size-3" />
        <span>
          Show {citations.length} source{citations.length === 1 ? "" : "s"}
        </span>
      </button>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2"
    >
      <Heading
        id={headingId}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground"
      >
        Sources · {citations.length}
      </Heading>
      <ol className="flex flex-col gap-2">
        {citations.map((citation) => {
          const timestamp = formatTimestamp(citation.startTime);
          const href = `/player/${encodeURIComponent(citation.catalogNumber)}?t=${timestamp}&from=portal`;
          const speaker = citation.intervieweeName ? formatSpeakerName(citation.intervieweeName) : "Unnamed storyteller";
          return (
            <li
              key={citation.index}
              // Stretched-link card: the title link covers the row, the
              // snippet button sits above it (a button can't nest in a link).
              className="relative flex flex-col gap-1 rounded-md border border-border/50 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-[3px] inline-flex h-5 min-w-5 items-center justify-center rounded-[min(var(--radius-md),10px)] border border-border bg-background px-1.5 font-mono text-[10px] font-medium tabular-nums text-muted-foreground"
                >
                  {citation.index}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
                    className="font-heading text-sm font-semibold leading-tight text-foreground outline-none after:absolute after:inset-0 after:content-['']"
                  >
                    {speaker}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {recordingLabel(citation.recordingTitle)} · {timestamp}
                  </p>
                </div>
                <div className="relative z-10 shrink-0">
                  <SnippetButton citation={citation} />
                </div>
              </div>
              <ContentNotice notes={citation.contentNotes ?? []} className="pl-7" />
              <p className="line-clamp-3 pl-7 text-[13px] leading-relaxed text-foreground/75">
                &ldquo;{readableExcerpt(citation.excerpt)}&hellip;&rdquo;
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Seconds of a source played inline from the panel (F-portal-share). */
const SNIPPET_SECONDS = 25;

/** Hear the cited passage without leaving the answer: plays a short clip
 *  from the citation's start through the site-wide listening queue. */
function SnippetButton({ citation }: { citation: PortalCitation }) {
  const { enqueue } = useListeningQueue();
  if (!citation.audioUrl || citation.endTime <= citation.startTime) return null;
  const end = Math.min(citation.endTime, citation.startTime + SNIPPET_SECONDS);
  const seconds = Math.round(end - citation.startTime);
  return (
    <button
      type="button"
      onClick={() =>
        enqueue(
          [
            {
              id: `snip:${citation.catalogNumber}:${Math.round(citation.startTime)}`,
              catalogNumber: citation.catalogNumber,
              title: citation.recordingTitle,
              storyteller: citation.intervieweeName ? formatSpeakerName(citation.intervieweeName) : null,
              audioUrl: citation.audioUrl as string,
              start: citation.startTime,
              end,
            },
          ],
          { play: true },
        )
      }
      aria-label={`Play ${seconds} s: ${citation.recordingTitle} at ${formatTimestamp(citation.startTime)}`}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 font-mono text-[10px] tabular-nums text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PlayIcon aria-hidden className="size-3" />
      {seconds} s
    </button>
  );
}
