"use client";

import { memo, forwardRef, type ReactNode } from "react";

import { cleanSegmentText, formatTimestamp } from "@/lib/player";
import { cn } from "@/lib/utils";
import type {
  FlaggedSpan,
  TranscriptSegment,
} from "@/lib/queries/player";
import { SensitivityMarker } from "./sensitivity-marker";

/**
 * Wrap every case-insensitive occurrence of `query` inside `text` with a
 * `<mark>`. The focused match (the one the search bar is currently pointing
 * to) gets a stronger fill so it's distinguishable from its siblings when
 * the pane scrolls it into view. Returns the raw text unchanged when the
 * query is empty.
 */
function renderWithHighlights(
  text: string,
  query: string,
  isFocused: boolean,
): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const needle = q.toLowerCase();
  const haystack = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  while (cursor < text.length) {
    const hit = haystack.indexOf(needle, cursor);
    if (hit === -1) {
      parts.push(text.slice(cursor));
      break;
    }
    if (hit > cursor) parts.push(text.slice(cursor, hit));
    parts.push(
      <mark
        key={key++}
        className={cn(
          "rounded-sm px-0.5",
          isFocused
            ? "bg-primary text-primary-foreground"
            : "bg-yellow-300/60 text-foreground dark:bg-yellow-400/30",
        )}
      >
        {text.slice(hit, hit + q.length)}
      </mark>,
    );
    cursor = hit + q.length;
  }
  return <>{parts}</>;
}

/**
 * Single transcript segment row. Memoized because re-rendering 1,200+
 * segments on every `timeupdate` tick is otherwise wasteful — only the
 * active segment's active class changes.
 *
 * Role-label rendering happens at the group level (see TranscriptPane),
 * not inside this component, so contiguous same-role segments flow
 * visually without a label on every row.
 *
 * Sensitivity markers render on the FIRST segment that overlaps each
 * flagged span (see TranscriptPane's preprocessing). This keeps the
 * transcript from getting visually loud when a span covers many segments.
 */
export type SegmentProps = {
  segment: TranscriptSegment;
  index: number;
  isActive: boolean;
  isLowConfidence: boolean;
  /** Flagged spans for which this segment is the *first* overlapper.
   *  Pre-computed by the parent to avoid per-segment span scans. */
  spanEntries?: FlaggedSpan[];
  onSeek: (seconds: number) => void;
  /** Current transcript-search query — used to highlight matches inline. */
  searchQuery?: string;
  /** True when this segment is the currently-focused search match (the one
   *  the "X of N" indicator is pointing to). */
  isSearchFocused?: boolean;
};

export const TranscriptSegmentRow = memo(
  forwardRef<HTMLDivElement, SegmentProps>(function TranscriptSegmentRow(
    {
      segment,
      index,
      isActive,
      isLowConfidence,
      spanEntries,
      onSeek,
      searchQuery = "",
      isSearchFocused = false,
    },
    ref,
  ) {
    const text = cleanSegmentText(segment.text);
    if (!text) return null;

    return (
      <div
        ref={ref}
        data-segment-index={index}
        data-active={isActive || undefined}
        className={cn(
          "group grid grid-cols-[auto_1fr] gap-3 rounded-md px-3 py-2 transition-colors",
          "hover:bg-muted/50",
          isActive && "bg-primary/10 ring-1 ring-primary/20",
          isLowConfidence && !isActive && "opacity-60",
          // Search-focus outline — rendered on top of the active-state ring
          // so navigating a query while the same segment is playing is
          // still visually readable.
          isSearchFocused && "ring-2 ring-ring/60",
        )}
      >
        <button
          type="button"
          onClick={() => onSeek(segment.start)}
          className={cn(
            "relative self-start font-mono text-[10px] tabular-nums text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:text-foreground",
            // Expand the touch hit-area on mobile without affecting layout
            // (the pseudo-element overlays, the text stays put). Removed at md.
            "after:absolute after:-inset-3 after:content-[''] md:after:hidden",
            isLowConfidence &&
              "underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px]",
          )}
          aria-label={
            isLowConfidence
              ? `Jump to ${formatTimestamp(segment.start)}. Speaker diarization confidence low`
              : `Jump to ${formatTimestamp(segment.start)}`
          }
          title={
            isLowConfidence
              ? "Speaker diarization confidence: low"
              : `Jump to ${formatTimestamp(segment.start)}`
          }
        >
          {isLowConfidence ? (
            <span aria-hidden className="mr-0.5 text-muted-foreground/70">
              ~
            </span>
          ) : null}
          {formatTimestamp(segment.start)}
        </button>
        <div className="flex items-start gap-2">
          {spanEntries && spanEntries.length > 0 ? (
            <div className="mt-1 flex flex-col items-center gap-1">
              {spanEntries.map((span, si) => (
                <SensitivityMarker key={si} span={span} />
              ))}
            </div>
          ) : null}
          <p
            className={cn(
              "flex-1",
              // Player UX Move 5: interviewee gets slightly heavier type so
              // the storyteller's own words read as the foreground voice. The
              // interviewer stays at the default size — conversation
              // rhythm, not hierarchy-of-importance. Back out to a
              // font-weight delta if this reads as "interviewer doesn't
              // matter."
              segment.speaker_role === "interviewee"
                ? "text-[15px] leading-[1.75]"
                : "text-sm leading-relaxed",
              isActive ? "text-foreground" : "text-foreground/80",
            )}
          >
            {renderWithHighlights(text, searchQuery, isSearchFocused)}
          </p>
        </div>
      </div>
    );
  }),
);
