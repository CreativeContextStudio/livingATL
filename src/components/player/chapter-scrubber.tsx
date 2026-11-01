"use client";

import { useMemo } from "react";
import { ChevronDownIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MomentTooltipBody } from "@/components/shared/moment-chip";
import {
  PRIMARY_ACCENT,
  type ThemeAccent,
} from "@/components/shared/theme-accent";
import { formatTimestamp, momentTimeRange } from "@/lib/player";
import { cn } from "@/lib/utils";
import type { BriefMoment } from "@/lib/queries/recordings";
import type { TranscriptSegment } from "@/lib/queries/player";
import { usePlayer, usePlayerTime } from "./player-context";

/**
 * Chapter scrubber — horizontal bar above the waveform showing each brief
 * moment as a clickable segment sized proportional to its duration. Click
 * seeks the wavesurfer to the moment's canonical start (resolved via
 * segment_indices at click time per PRD §7.3.1, not the cached start_time
 * which can drift on re-transcription).
 *
 * Highlights (`moment.highlight === true`) render with a brighter accent
 * color so the curated "start here" moments surface at a glance.
 *
 * The matching wavesurfer regions for on-waveform hover markers are added
 * separately in Pass C (alongside sensitivity markers).
 */

type Resolved = {
  moment: BriefMoment;
  startPct: number;
  widthPct: number;
  start: number;
  end: number;
  isActive: boolean;
  isHighlight: boolean;
};

/** Narrower chapters stay unlabeled; their title shows on hover. */
const MIN_LABEL_WIDTH_PCT = 5;

/** Summary-row label: the playing chapter's title, else the first one. */
function activeChapterLabel(chapters: Resolved[]): string {
  const c = chapters.find((ch) => ch.isActive) ?? chapters[0];
  if (!c) return "";
  const themes = c.moment.themes ?? [];
  return (
    c.moment.title ??
    (themes.length > 0
      ? themes.map((t) => t.replace(/_/g, " ")).join(" · ")
      : "Chapter")
  );
}

export function ChapterScrubber({
  moments,
  segments,
  totalDurationSeconds,
  accent = PRIMARY_ACCENT.tailwind,
}: {
  moments: BriefMoment[];
  segments: TranscriptSegment[];
  totalDurationSeconds: number;
  /** Per-recording palette for active + highlight chapter fills. Falls
   *  back to the Atlanta coral `PRIMARY_ACCENT` when the parent doesn't
   *  know the theme yet (e.g., component mounted before data resolves). */
  accent?: ThemeAccent["tailwind"];
}) {
  const { duration, seekAndPlay } = usePlayer();
  const resolvedDuration = duration > 0 ? duration : totalDurationSeconds;

  // Geometry is time-independent; only the active flag follows the playhead.
  const layout: Resolved[] = useMemo(() => {
    if (!moments.length || resolvedDuration <= 0) return [];
    return moments
      .map<Resolved | null>((moment) => {
        const range = momentTimeRange(moment, segments);
        if (!range) return null;
        const width = range.end - range.start;
        return {
          moment,
          startPct: (range.start / resolvedDuration) * 100,
          widthPct: Math.max((width / resolvedDuration) * 100, 0.7),
          start: range.start,
          end: range.end,
          isActive: false,
          isHighlight: Boolean(moment.highlight),
        };
      })
      .filter((c): c is Resolved => c !== null);
  }, [moments, segments, resolvedDuration]);

  // Comma-joined indices of chapters containing the playhead (chapters can
  // overlap). A string snapshot, so this re-renders only when the set
  // changes — not on every animation frame.
  const activeKey = usePlayerTime((t) =>
    layout
      .flatMap((c, i) => (t >= c.start && t <= c.end ? [i] : []))
      .join(","),
  );
  const chapters: Resolved[] = useMemo(() => {
    const active = new Set(activeKey.split(","));
    return layout.map((c, i) => ({ ...c, isActive: active.has(String(i)) }));
  }, [layout, activeKey]);

  if (chapters.length === 0) {
    return (
      <div className="relative min-h-20 w-full overflow-hidden bg-muted/60">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="rounded-full bg-background/80 px-3 py-1 font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground backdrop-blur-sm md:text-[10px]">
            No chapters yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delay={180}>
      {/* Mobile (< md): a fully-tappable chapter list. The proportional bar
          below forces a 640px horizontal scroll and renders short moments a
          few pixels wide (untappable), and its titles only surface on hover —
          which never fires on touch. The list gives every chapter a 44px row,
          its title, and a timestamp. Hidden at `md` where the bar takes over. */}
      {/* Collapsed by default so the transport stays near the top on
          phones; the summary row names the chapter that's playing. */}
      <details className="group/chapters bg-muted/40 md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted-foreground">
            Chapters ({chapters.length})
          </span>
          <span className="min-w-0 flex-1 truncate font-medium text-foreground/90">
            {activeChapterLabel(chapters)}
          </span>
          <ChevronDownIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open/chapters:rotate-180"
          />
        </summary>
      <ul className="divide-y divide-border border-t border-border">
        {chapters.map((c, i) => {
          const themes = c.moment.themes ?? [];
          const label =
            c.moment.title ??
            (themes.length > 0
              ? themes.map((t) => t.replace(/_/g, " ")).join(" · ")
              : "Chapter");
          return (
            <li key={`m-${c.start}-${i}`}>
              <button
                type="button"
                onClick={() => seekAndPlay(c.start)}
                aria-label={`Jump to "${c.moment.title ?? "chapter"}" at ${formatTimestamp(c.start)}`}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  c.isActive ? accent.bgSoft : "hover:bg-foreground/5",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    c.isActive || c.isHighlight
                      ? accent.bgStrong
                      : "bg-foreground/25",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/90">
                  {label}
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatTimestamp(c.start)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      </details>

      <div className="hidden w-full overflow-x-auto scrollbar-soft md:block md:overflow-x-visible">
      <div
        className="relative min-h-20 w-full min-w-[640px] overflow-hidden bg-muted/60 md:min-w-0"
        role="group"
        aria-label="Chapter scrubber"
      >
        {chapters.map((c, i) => {
          const themes = c.moment.themes ?? [];
          const label = c.moment.title ?? themes.map((t) => t.replace(/_/g, " ")).join(" · ");
          // Per-recording accent drives the chapter fills: highlighted
          // moments take the medium tint, the rest a muted ghost. The playing
          // chapter inverts, so it stands out in every palette.
          const bgClass = c.isActive
            ? "bg-foreground"
            : c.isHighlight
              ? accent.bgMedium
              : accent.bgSoft;
          // Neutral ink, not the accent: these are titles people read, and
          // no per-theme color holds 4.5:1 on all three fills.
          const labelClass = c.isActive ? "text-background" : "text-foreground";
          return (
            <Tooltip key={`${c.start}-${i}`}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => seekAndPlay(c.start)}
                    aria-label={`Jump to "${c.moment.title ?? "chapter"}" at ${formatTimestamp(c.start)}`}
                    aria-current={c.isActive ? "true" : undefined}
                    data-playing={c.isActive ? "" : undefined}
                    className={cn(
                      "absolute top-0 bottom-0 flex flex-col items-start gap-1 overflow-hidden border-r border-background/50 px-1.5 py-1.5 text-left transition-[background,transform] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      bgClass,
                    )}
                    style={{ left: `${c.startPct}%`, width: `${c.widthPct}%` }}
                  >
                    {label && c.widthPct >= MIN_LABEL_WIDTH_PCT ? (
                      <span className={cn("line-clamp-4 w-full break-words text-[11px] font-medium leading-tight", labelClass)}>
                        {label}
                      </span>
                    ) : null}
                  </button>
                }
              />
              <TooltipContent side="top" className="max-w-xs">
                <MomentTooltipBody
                  moment={c.moment}
                  start={c.start}
                  end={c.end}
                />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Small label the Player renders above the unified timeline with chapter
 * counts. Split out so the overlay itself stays focused on hit-testing.
 */
export function ChapterCountsLabel({
  moments,
  segments,
  totalDurationSeconds,
}: {
  moments: BriefMoment[];
  segments: TranscriptSegment[];
  totalDurationSeconds: number;
}) {
  const { duration } = usePlayer();
  const resolvedDuration = duration > 0 ? duration : totalDurationSeconds;
  const counts = useMemo(() => {
    if (!moments.length || resolvedDuration <= 0) {
      return { total: 0, highlights: 0 };
    }
    let total = 0;
    let highlights = 0;
    for (const moment of moments) {
      if (!momentTimeRange(moment, segments)) continue;
      total += 1;
      if (moment.highlight) highlights += 1;
    }
    return { total, highlights };
  }, [moments, segments, resolvedDuration]);

  if (counts.total === 0) return null;

  return (
    // Below md the collapsed "Chapters (N)" summary row already carries the
    // count, so this label only shows alongside the desktop chapter bar.
    <div className="hidden items-baseline justify-between text-[11px] text-muted-foreground md:flex">
      <p className="font-heading font-semibold tracking-[0.12em] uppercase">
        Chapters
      </p>
      <p className="font-mono tabular-nums">
        {counts.total} chapters · {counts.highlights} highlights
      </p>
    </div>
  );
}
