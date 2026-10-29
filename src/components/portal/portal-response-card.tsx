"use client";

import { Fragment, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AIAdvisoryLink } from "@/components/player/ai-advisory-link";
import { CitationChip } from "./citation-chip";
import type { PortalCitation } from "@/app/api/portal/chat/route";

/**
 * The archive's answer body. The "THE ARCHIVE" speaker label + `· N voices`
 * eyebrow live on the outer `AssistantTurn` in `portal-client.tsx` — this
 * component renders just the prose body + footer meta line.
 *
 * Visually this is now flush-left prose inside the conversation column, not
 * a nested card. AISummaryCard voice parity (PRD §7.4) is carried by the
 * footer ("AI-generated · N source excerpts · AI advisory") + the
 * `<AIAdvisoryLink />` dialog trigger — not by a card container.
 *
 * Body parses `[N]` markers out of the streamed text and replaces them with
 * inline `<CitationChip>` links. Markers referencing an unknown citation
 * index pass through as plain text (rare — the prompt constrains the model
 * to only cite numbers that exist in the excerpt list).
 */

type Props = {
  text: string;
  citations: PortalCitation[];
  loading?: boolean;
};

const CITATION_PATTERN = /\[(\d+(?:\s*[,|]\s*\d+)*)\]/g;

function renderBody(text: string, citations: PortalCitation[]): ReactNode {
  const byIndex = new Map(citations.map((c) => [c.index, c]));
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(CITATION_PATTERN)) {
    const matchStart = match.index ?? 0;
    if (matchStart > cursor) {
      nodes.push(
        <Fragment key={`t-${key++}`}>
          {text.slice(cursor, matchStart)}
        </Fragment>,
      );
    }

    const numbers = match[1]
      .split(/[,|]/)
      .map((n) => Number.parseInt(n.trim(), 10))
      .filter((n) => Number.isFinite(n));

    const chips: ReactNode[] = [];
    for (const n of numbers) {
      const citation = byIndex.get(n);
      if (!citation) continue;
      chips.push(<CitationChip key={`c-${key++}`} citation={citation} />);
    }

    if (chips.length > 0) {
      nodes.push(
        <span key={`grp-${key++}`} className="mx-0.5 inline-flex gap-0.5">
          {chips}
        </span>,
      );
    } else {
      nodes.push(
        <Fragment key={`raw-${key++}`}>{match[0]}</Fragment>,
      );
    }

    cursor = matchStart + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(
      <Fragment key={`t-${key++}`}>{text.slice(cursor)}</Fragment>,
    );
  }

  return nodes;
}

export function PortalResponseCard({ text, citations, loading }: Props) {
  const hasCitations = citations.length > 0;
  // The cited sources (and their count) are listed under the answer.
  const sourceCountLabel = loading
    ? "Searching the archive…"
    : hasCitations
      ? "AI-generated answer"
      : "AI-generated · no matching recordings";

  return (
    // Announcements are handled once, by the persistent role="status" in
    // portal-client — a live region that unmounts mid-stream announces nothing.
    <div className="flex w-full flex-col gap-3">
      {loading ? (
        <div
          className="flex flex-col gap-2.5"
          role="status"
          aria-label="Archive is thinking"
        >
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-[92%] rounded-md" />
          <Skeleton className="h-3 w-[76%] rounded-md" />
          <div className="mt-2 flex items-center gap-1.5">
            <Skeleton className="h-5 w-10 rounded-md" />
            <Skeleton className="h-5 w-10 rounded-md" />
            <Skeleton className="h-5 w-10 rounded-md" />
          </div>
        </div>
      ) : (
        <div className="whitespace-pre-line text-base leading-7 text-foreground">
          {renderBody(text, citations)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
          {sourceCountLabel}
        </p>
        {loading ? null : (
          <>
            <span
              aria-hidden
              className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground"
            >
              ·
            </span>
            <AIAdvisoryLink />
          </>
        )}
      </div>
    </div>
  );
}
