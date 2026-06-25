"use client";

import { cn } from "@/lib/utils";
import { MOMENT_HIGHLIGHT_PIP_CLASS } from "@/components/shared/moment-chip";
import type {
  TimelineHistoricalEvent,
  TimelineMoment,
} from "@/lib/queries/timeline";

/**
 * Interactive Timeline — hover tooltip.
 *
 * Cheap floating card. Shows a short preview when the cursor is over a
 * marker. Click a marker to open the full editorial view in the
 * persistent folio above the canvas; this tooltip is just a "what am I
 * looking at?" at-a-glance signal.
 *
 * Deliberately minimal DOM and zero expensive children — the folio
 * handles the heavy lift, so hovering across 500+ markers stays smooth.
 * Position is set once per `mouseenter` (not per `mousemove`) so the
 * tooltip doesn't thrash React state at cursor-refresh rates.
 */

export type HoverTip =
  | { kind: "moment"; moment: TimelineMoment; x: number; y: number }
  | { kind: "event"; event: TimelineHistoricalEvent; x: number; y: number };

const OFFSET_X = 14;
const OFFSET_Y = 14;

export function HoverTooltip({ tip }: { tip: HoverTip }) {
  const style: React.CSSProperties = {
    left: tip.x + OFFSET_X,
    top: tip.y + OFFSET_Y,
  };
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[var(--z-toast)] max-w-[280px] rounded-lg bg-foreground px-3 py-2 shadow-lg"
      style={style}
    >
      {tip.kind === "moment" ? (
        <MomentHoverBody moment={tip.moment} />
      ) : (
        <EventHoverBody event={tip.event} />
      )}
      <span className="mt-1.5 block font-mono text-[9px] tracking-[0.18em] uppercase text-background/40">
        Click to pin
      </span>
    </div>
  );
}

function MomentHoverBody({ moment }: { moment: TimelineMoment }) {
  const year = momentAnchorYearLabel(moment);
  const byline = moment.intervieweeName ?? moment.recordingTitle;
  return (
    <div className="flex flex-col gap-1 text-left">
      <div className="flex items-center gap-2">
        {moment.highlight ? (
          <span aria-hidden className={MOMENT_HIGHLIGHT_PIP_CLASS} />
        ) : null}
        <span className="font-heading text-[13px] font-semibold leading-tight text-background line-clamp-1">
          {moment.title}
        </span>
      </div>
      <span className="font-heading text-[11px] font-bold tracking-tight text-primary">
        {year}
        <span className="ml-2 font-sans font-normal text-background/60">
          {byline}
        </span>
      </span>
      {moment.summary ? (
        <p className={cn("text-[11px] leading-snug text-background/80 line-clamp-2")}>
          {moment.summary}
        </p>
      ) : null}
    </div>
  );
}

function EventHoverBody({ event }: { event: TimelineHistoricalEvent }) {
  const when = eventWhenLabel(event);
  return (
    <div className="flex flex-col gap-1 text-left">
      <span className="font-heading text-[13px] font-semibold leading-tight text-background line-clamp-1">
        {event.label}
      </span>
      <span className="font-heading text-[11px] font-bold tracking-tight text-primary">
        {when}
        <span className="ml-2 font-sans font-normal uppercase tracking-[0.12em] text-background/60">
          {event.category.replace(/_/g, " ")}
        </span>
      </span>
      <p className="text-[11px] leading-snug text-background/70">
        {event.recordingCount === 1
          ? "Mentioned by 1 narrator"
          : `Mentioned by ${event.recordingCount} narrators`}
      </p>
    </div>
  );
}

function momentAnchorYearLabel(m: TimelineMoment): string {
  if (m.eraStartYear != null && m.eraEndYear != null) {
    const mid = Math.round((m.eraStartYear + m.eraEndYear) / 2);
    return String(mid);
  }
  return m.eraStartYear != null
    ? String(m.eraStartYear)
    : m.eraEndYear != null
      ? String(m.eraEndYear)
      : "—";
}

function eventWhenLabel(e: TimelineHistoricalEvent): string {
  if (e.yearStart != null && e.yearEnd != null) {
    return e.yearStart === e.yearEnd
      ? String(e.yearStart)
      : `${e.yearStart}–${e.yearEnd}`;
  }
  return e.year != null ? String(e.year) : "undated";
}
