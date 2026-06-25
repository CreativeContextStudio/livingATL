/**
 * Shared visual contract for brief-moment chips rendered on:
 *  - the Player's chapter scrubber (`player/chapter-scrubber.tsx`)
 *  - the Interactive Timeline (§7.3, §7.3.1 — forthcoming)
 *  - optionally other surfaces that want a miniature moment marker
 *
 * The Timeline will render the same 583 authored moments that the Player's
 * chapter bar shows. Keeping the color tokens + highlight treatment + tooltip
 * body in one module prevents the two surfaces from visually arguing about
 * the same data — one source of truth for "what is a highlight," "what is
 * active," "what does a base chapter look like."
 *
 * If you add a new visual signal (e.g. a dimmed state for recordings outside
 * the active filter on the Timeline) put the token here rather than inline.
 */

import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/player";
import type { BriefMoment } from "@/lib/queries/recordings";

/** Background-color class strings, keyed by moment state. Applied to the
 *  chip's container (the clickable surface itself). */
export const MOMENT_BG_COLORS = {
  base: "bg-primary/20",
  highlight: "bg-primary/50",
  active: "bg-primary",
} as const;

/** Text-color class strings, keyed by whether the chip is currently the
 *  active moment (audio playhead inside its range). Applied to labels that
 *  sit *inside* the chip (e.g. theme names). */
export const MOMENT_TEXT_COLORS = {
  inactive: "text-primary",
  active: "text-primary-foreground",
} as const;

/** Coral accent pip shown in the tooltip next to a highlight moment's
 *  title. Coral (the brand accent) marks editorial emphasis — distinct
 *  from amber, which is now reserved for content advisories. Picked up by
 *  both the Player chapter tooltip and the Timeline's hover popup. */
export const MOMENT_HIGHLIGHT_PIP_CLASS =
  "inline-block size-1.5 rounded-full bg-primary";

/** Derive the background-color class for a chip given its state. */
export function momentBgClass({
  isActive,
  isHighlight,
}: {
  isActive: boolean;
  isHighlight: boolean;
}): string {
  if (isActive) return MOMENT_BG_COLORS.active;
  if (isHighlight) return MOMENT_BG_COLORS.highlight;
  return MOMENT_BG_COLORS.base;
}

/** Derive the text-color class for labels inside a chip. */
export function momentTextClass(isActive: boolean): string {
  return isActive ? MOMENT_TEXT_COLORS.active : MOMENT_TEXT_COLORS.inactive;
}

/**
 * Tooltip body rendered when a moment chip is hovered. Surfaces the full
 * editorial payload: title, themes, era label, authored summary, highlight
 * reason (for highlight moments only), and the resolved timecode range.
 *
 * Used by the Player's chapter scrubber today and by the Timeline's
 * hover popup when it ships. Consumes a resolved `start`/`end` rather
 * than reading `moment.start_time`/`moment.end_time` directly because
 * those cached fields drift on re-transcription (PRD §7.3.1); callers
 * should resolve via `momentTimeRange(moment, segments)`.
 */
export function MomentTooltipBody({
  moment,
  start,
  end,
}: {
  moment: BriefMoment;
  start: number;
  end: number;
}) {
  const themes = moment.themes ?? [];
  const isHighlight = Boolean(moment.highlight);
  return (
    <div className="flex flex-col gap-1 text-left">
      <div className="flex items-center gap-2">
        {isHighlight ? (
          <span aria-hidden className={MOMENT_HIGHLIGHT_PIP_CLASS} />
        ) : null}
        <span className="font-heading text-sm font-semibold">
          {moment.title ?? "Moment"}
        </span>
      </div>
      {themes.length > 0 ? (
        <span className="text-[11px] text-background/70">
          {themes.map((t) => t.replace(/_/g, " ")).join(" · ")}
        </span>
      ) : null}
      {moment.era_label ? (
        <span className="text-[11px] text-background/70">
          {moment.era_label}
        </span>
      ) : null}
      {moment.summary ? (
        <span className={cn("text-[11px] leading-snug text-background/80")}>
          {moment.summary}
        </span>
      ) : null}
      {isHighlight && moment.highlight_reason ? (
        <span className="text-[11px] leading-snug text-background/70 italic">
          Why it&rsquo;s a highlight: {moment.highlight_reason}
        </span>
      ) : null}
      <span className="font-mono text-[11px] text-background/70">
        {formatTimestamp(start)} – {formatTimestamp(end)}
      </span>
    </div>
  );
}
