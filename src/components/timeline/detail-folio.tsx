"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { XIcon, PlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/player";
import { MOMENT_HIGHLIGHT_PIP_CLASS } from "@/components/shared/moment-chip";
import { familyColorVar, isThemeKey, themeKeyToFamily, themeLabel } from "@/lib/theme-colors";
import { neighborhoodColor } from "@/lib/neighborhood-colors";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  TimelineHistoricalEvent,
  TimelineMoment,
} from "@/lib/queries/timeline";
import { MomentQueueButtons } from "@/components/queue/queue-buttons";

/**
 * Interactive Timeline — detail panel for the selected moment or
 * historical event (PRD §7.3). A single vertical column: it sits in the
 * sticky side panel beside the chart on desktop and in the bottom sheet
 * on phones. Click-only — hover previews are the lightweight
 * `HoverTooltip`. Memoized so hover state in the parent doesn't
 * re-render it.
 */

export type FolioSelection =
  | { kind: "moment"; id: string; moment: TimelineMoment }
  | { kind: "event"; id: string; event: TimelineHistoricalEvent };

type Props = {
  selected: FolioSelection;
  onClear: () => void;
  /** The journey bar above carries the close button for moments. */
  hideClear?: boolean;
};

function TimelineDetailFolioImpl({ selected, onClear, hideClear = false }: Props) {
  return (
    <section aria-live="polite" className="relative flex flex-col p-5">
      {selected.kind === "moment" ? (
        <FolioMomentBody moment={selected.moment} onClear={onClear} hideClear={hideClear} />
      ) : (
        <FolioEventBody event={selected.event} onClear={onClear} />
      )}
    </section>
  );
}

/** The "clear pin" affordance — same X button as before, but now floats
 *  in the top-right of the body so the kicker row could go away and the
 *  year takes that visual real estate. */
function ClearPinButton({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label="Clear pinned selection"
      className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <XIcon aria-hidden className="size-3.5" />
    </button>
  );
}

/**
 * React.memo prevents folio re-render when the parent's hover state
 * changes. Props are all stable references (setPinned-returned selection,
 * useCallback'd onClear, stable corpus object from the RSC). The Folio
 * only re-renders when pinned flips or the corpus object identity
 * changes.
 */
export const TimelineDetailFolio = memo(TimelineDetailFolioImpl);

// ---------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------

function FolioMomentBody({
  moment,
  onClear,
  hideClear,
}: {
  moment: TimelineMoment;
  onClear: () => void;
  hideClear: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const yearLabel = momentYearLabel(moment);
  const anchorYear = momentAnchorYearLabel(moment);
  const byline = moment.intervieweeName ?? moment.recordingTitle;
  const advisoryNote = advisoryProse(moment);
  const playFrom = Math.max(0, Math.round(moment.startTime));
  const themes = moment.themes;
  const neighborhoods = moment.neighborhoods;

  return (
    <>
      {hideClear ? null : <ClearPinButton onClear={onClear} />}
      <div className="flex flex-col gap-3">
        <div className={cn("flex items-baseline gap-2", !hideClear && "pr-10")}>
          <p className="font-heading text-3xl font-bold tracking-tight text-primary-ink">{anchorYear}</p>
          {yearLabel && yearLabel !== anchorYear ? (
            <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">{yearLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="flex items-start gap-2 font-heading text-lg font-bold leading-snug tracking-tight">
            {moment.highlight ? (
              <span aria-hidden className={cn(MOMENT_HIGHLIGHT_PIP_CLASS, "mt-2.5 shrink-0")} />
            ) : null}
            <span className="min-w-0">{moment.title}</span>
          </h2>
          <p className="text-sm text-muted-foreground">From {byline}&rsquo;s interview</p>
        </div>
        {moment.summary ? (
          <div className="flex flex-col">
            <p className="border-l-[3px] border-primary/60 pl-3 text-sm leading-relaxed text-foreground/90 line-clamp-[8]">
              {moment.summary}
            </p>
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className="mt-1.5 ml-3 self-start font-mono text-[11px] tracking-[0.12em] uppercase text-primary-ink transition-colors hover:text-primary-ink/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Read more: ${moment.title}`}
            >
              Read more
            </button>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Link
            href={`/player/${encodeURIComponent(moment.catalogNumber)}?t=${playFrom}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 font-heading text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PlayIcon aria-hidden className="size-3.5" />
            Open in Player at {formatTimestamp(moment.startTime)}
          </Link>
          {/* Listen without leaving the Timeline (F-queue). */}
          <MomentQueueButtons moment={moment} />
        </div>
        {themes.length > 0 ? <ThemeTagRow label="Themes" themes={themes} /> : null}
        {neighborhoods.length > 0 ? (
          <NeighborhoodTagRow label="Neighborhoods" neighborhoods={neighborhoods} />
        ) : null}
        {advisoryNote ? (
          <p className="rounded-md border border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/10 px-3 py-2 text-xs leading-relaxed text-foreground/85">
            <span className="font-semibold text-[color:var(--color-warning-ink)]">Content advisory. </span>
            {advisoryNote}
          </p>
        ) : null}
      </div>

      <MomentDetailDialog
        moment={moment}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

function FolioEventBody({
  event,
  onClear,
}: {
  event: TimelineHistoricalEvent;
  onClear: () => void;
}) {
  const when = eventWhenLabel(event);
  const kindLabel = event.category.replace(/_/g, " ");
  const referencedSummary =
    event.recordingCount === 1
      ? "One narrator in the collection returned to this."
      : `${event.recordingCount} narrators in the collection returned to this.`;

  return (
    <>
      <ClearPinButton onClear={onClear} />
      <div className="flex flex-col gap-3">
        <p className="pr-10 font-heading text-3xl font-bold tracking-tight text-primary-ink">{when}</p>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-bold leading-snug tracking-tight">{event.label}</h2>
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
            Historical event · {kindLabel}
          </p>
        </div>
        <p className="border-l-[3px] border-primary/60 pl-3 text-sm leading-relaxed text-foreground/90">
          {referencedSummary}
        </p>
        {event.recordingCatalogs.length > 0 ? (
          <TagRow label="Referenced in" values={event.recordingCatalogs} monospace />
        ) : null}
      </div>

    </>
  );
}

// ---------------------------------------------------------------------------
// Read-more dialogs
// ---------------------------------------------------------------------------

/** Full-detail modal for a moment. Opened from the folio's "… read more"
 *  affordance. Renders the same editorial payload without line clamps so
 *  the reader can take in the entire summary, "why this matters" gloss,
 *  and structured tags in one place. Pairs with the in-card "Play from"
 *  button — kept here too so the dialog can stand on its own. */
function MomentDetailDialog({
  moment,
  open,
  onOpenChange,
}: {
  moment: TimelineMoment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const yearLabel = momentYearLabel(moment);
  const anchorYear = momentAnchorYearLabel(moment);
  const byline = moment.intervieweeName ?? moment.recordingTitle;
  const advisoryNote = advisoryProse(moment);
  const playFrom = Math.max(0, Math.round(moment.startTime));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-2xl lg:max-w-3xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <p className="font-heading text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
              {anchorYear}
            </p>
            {yearLabel && yearLabel !== anchorYear ? (
              <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
                {yearLabel}
              </p>
            ) : null}
          </div>

          <DialogTitle className="flex items-start gap-2 font-heading text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            {moment.highlight ? (
              <span
                aria-hidden
                className={cn(MOMENT_HIGHLIGHT_PIP_CLASS, "mt-2.5 shrink-0")}
              />
            ) : null}
            <span className="min-w-0">{moment.title}</span>
          </DialogTitle>

          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
            From {byline}&rsquo;s interview
          </p>

          {moment.summary ? (
            <p className="border-l-[3px] border-primary/60 pl-4 text-base leading-relaxed text-foreground/90">
              {moment.summary}
            </p>
          ) : null}

          {moment.highlight && moment.highlightReason ? (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary-ink">
                Why this matters
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                {moment.highlightReason}
              </p>
            </div>
          ) : null}

          {moment.themes.length > 0 ? (
            <ThemeTagRow label="Themes" themes={moment.themes} />
          ) : null}
          {moment.neighborhoods.length > 0 ? (
            <NeighborhoodTagRow
              label="Neighborhoods"
              neighborhoods={moment.neighborhoods}
            />
          ) : null}

          {advisoryNote ? (
            <div className="rounded-lg border border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/10 p-4">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-destructive">
                Content advisory
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                {advisoryNote}
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link
              href={`/player/${encodeURIComponent(moment.catalogNumber)}?t=${playFrom}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-heading text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PlayIcon aria-hidden className="size-3.5" />
              Play from {formatTimestamp(moment.startTime)}
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TagRow({
  label,
  values,
  monospace = false,
}: {
  label: string;
  values: string[];
  monospace?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
        {label}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <li
            key={v}
            className={cn(
              "rounded-md bg-muted px-2 py-0.5 text-[11px] text-foreground/85",
              monospace ? "font-mono tracking-tight" : "tracking-normal",
            )}
          >
            {monospace ? v : v.replace(/_/g, " ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Neighborhood chip row — each chip adopts a hash-assigned color from
 *  the neighborhood palette (see `neighborhood-colors.ts`) so a given
 *  place always renders in the same hue across recordings. Distinct
 *  from the theme palette's warm/red/gold axis to keep the two fields
 *  visually separable. */
function NeighborhoodTagRow({
  label,
  neighborhoods,
}: {
  label: string;
  neighborhoods: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
        {label}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {neighborhoods.map((n) => {
          const color = neighborhoodColor(n);
          return (
            <li key={n} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium tracking-normal text-foreground">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              {n}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Theme-tagged chip row — each chip adopts its theme's palette color
 *  as both the chip bg (tinted 18%) and the chip text, so the visual
 *  link to the dot on the canvas is obvious. */
function ThemeTagRow({ label, themes }: { label: string; themes: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
        {label}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {themes.map((t) => {
          // Same family color as the dot on the chart.
          const color = familyColorVar(isThemeKey(t) ? themeKeyToFamily(t) : null);
          return (
            <li key={t} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium tracking-normal text-foreground">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              {themeLabel(t)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The "big" year: where the moment begins — the year its dot sits at on
 *  the chart. The full era shows beside it. */
function momentAnchorYearLabel(m: TimelineMoment): string {
  if (m.eraStartYear != null) return String(m.eraStartYear);
  if (m.eraEndYear != null) return String(m.eraEndYear);
  return "—";
}

/** The "pretty" era string: prefers authored era_label, falls through to
 *  a numeric range or a single year. Used as a secondary line when it
 *  differs from the anchor. */
function momentYearLabel(m: TimelineMoment): string | null {
  if (m.eraLabel) return m.eraLabel;
  if (m.eraStartYear != null && m.eraEndYear != null) {
    return m.eraStartYear === m.eraEndYear
      ? String(m.eraStartYear)
      : `${m.eraStartYear}–${m.eraEndYear}`;
  }
  return null;
}

function eventWhenLabel(e: TimelineHistoricalEvent): string {
  if (e.yearStart != null && e.yearEnd != null) {
    return e.yearStart === e.yearEnd
      ? String(e.yearStart)
      : `${e.yearStart}–${e.yearEnd}`;
  }
  return e.year != null ? String(e.year) : "undated";
}

/** Render the advisory as editorial prose when the recording's advisory
 *  gate is on. Replaces today's cramped [ADVISORY] chip. */
function advisoryProse(moment: TimelineMoment): string | null {
  if (moment.contentAdvisory?.display_advisory !== true) return null;
  const themes = moment.contentAdvisory.sensitive_themes ?? [];
  if (themes.length === 0) {
    return "This recording carries a pre-playback advisory. The archive preserves original language.";
  }
  const list = themes
    .slice(0, 3)
    .map((t) => t.replace(/_/g, " "))
    .join(", ");
  return `This recording contains period-specific references to ${list}. The archive preserves original language.`;
}
