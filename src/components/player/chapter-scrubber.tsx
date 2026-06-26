"use client";

import { useMemo } from "react";

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
import { usePlayer } from "./player-context";

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
  const { currentTime, duration, seekAndPlay } = usePlayer();
  const resolvedDuration = duration > 0 ? duration : totalDurationSeconds;

  const chapters: Resolved[] = useMemo(() => {
    if (!moments.length || resolvedDuration <= 0) return [];
    const playing = currentTime;
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
          isActive: playing >= range.start && playing <= range.end,
          isHighlight: Boolean(moment.highlight),
        };
      })
      .filter((c): c is Resolved => c !== null);
  }, [moments, segments, resolvedDuration, currentTime]);

  if (chapters.length === 0) {
    return (
      <div className="relative min-h-20 w-full overflow-hidden bg-muted/60">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="rounded-full bg-background/80 px-3 py-1 font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground backdrop-blur-sm md:text-[10px]">
            No chapter moments authored yet. AI summary in sidebar
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
      <ul className="divide-y divide-border bg-muted/40 md:hidden">
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
                  "flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
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

      <div className="hidden w-full overflow-x-auto scrollbar-soft md:block md:overflow-x-visible">
      <div
        className="relative min-h-20 w-full min-w-[640px] overflow-hidden bg-muted/60 md:min-w-0"
        role="group"
        aria-label="Chapter scrubber"
      >
        {chapters.map((c, i) => {
          const themes = c.moment.themes ?? [];
          // Per-recording accent drives the chapter fills. Active (currently
          // playing) chapter uses the solid `bgStrong`; highlighted moments
          // take the soft tint but brightened. Inactive/non-highlight
          // chapters fall back to a muted ghost.
          const bgClass = c.isActive
            ? accent.bgStrong
            : c.isHighlight
              ? accent.bgMedium
              : accent.bgSoft;
          const labelClass = c.isActive
            ? accent.textOn
            : accent.text;
          return (
            <Tooltip key={`${c.start}-${i}`}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => seekAndPlay(c.start)}
                    aria-label={`Jump to "${c.moment.title ?? "chapter"}" at ${formatTimestamp(c.start)}`}
                    className={cn(
                      "absolute top-0 bottom-0 flex flex-col items-start gap-1 overflow-hidden border-r border-background/50 px-1.5 py-1.5 text-left transition-[background,transform] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                      bgClass,
                    )}
                    style={{ left: `${c.startPct}%`, width: `${c.widthPct}%` }}
                  >
                    {themes.length > 0 ? (
                      <span className="flex flex-wrap gap-x-1 gap-y-0.5 leading-tight">
                        {themes.map((t) => (
                          <span
                            key={t}
                            className={cn(
                              "text-[11px] font-medium tracking-tight whitespace-nowrap md:text-[10px]",
                              labelClass,
                            )}
                          >
                            {t.replace(/_/g, " ")}
                          </span>
                        ))}
                      </span>
                    ) : c.moment.title ? (
                      <span
                        className={cn(
                          "text-[11px] font-medium tracking-tight leading-tight md:text-[10px]",
                          labelClass,
                        )}
                      >
                        {c.moment.title}
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
    <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
      <p className="font-heading font-semibold tracking-[0.12em] uppercase">
        Chapters
      </p>
      <p className="font-mono tabular-nums">
        {counts.total} moments · {counts.highlights} highlights
      </p>
    </div>
  );
}
