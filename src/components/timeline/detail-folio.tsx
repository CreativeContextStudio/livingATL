"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { XIcon, PlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/player";
import { MOMENT_HIGHLIGHT_PIP_CLASS } from "@/components/shared/moment-chip";
import { themeColorVar, themeLabel } from "@/lib/theme-colors";
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

/**
 * Interactive Timeline — persistent detail folio (PRD §7.3, Phase 2).
 *
 * Docked above the canvas. Renders the full editorial payload for the
 * currently pinned marker so the user can read the summary at their own
 * pace. Click-only — hover previews are handled by the lightweight
 * `HoverTooltip` to keep 500+ markers smooth.
 *
 * Two display modes:
 *   - `empty`  — no pinned selection. Shows an archive overview + prompt.
 *   - `pinned` — user clicked a marker. Amber pip in the kicker row,
 *                Clear button visible, full editorial body.
 *
 * The folio has a fixed height so the canvas below it never reflows on
 * selection change. Memoized at the bottom of this file so hover state
 * changes in the parent don't re-render the heavy tree.
 */

export type FolioSelection =
  | { kind: "moment"; id: string; moment: TimelineMoment }
  | { kind: "event"; id: string; event: TimelineHistoricalEvent };

export type FolioCorpus = {
  momentCount: number;
  narratorCount: number;
  yearRange: [number, number];
};

type Props = {
  selected: FolioSelection | null;
  onClear: () => void;
  corpus: FolioCorpus;
};

function TimelineDetailFolioImpl({ selected, onClear, corpus }: Props) {
  const mode: "empty" | "pinned" = selected ? "pinned" : "empty";

  return (
    <section
      aria-live="polite"
      data-mode={mode}
      className="relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 lg:h-[320px]"
    >
      {selected?.kind === "moment" ? (
        <FolioMomentBody moment={selected.moment} onClear={onClear} />
      ) : selected?.kind === "event" ? (
        <FolioEventBody event={selected.event} onClear={onClear} />
      ) : (
        <FolioEmptyBody corpus={corpus} />
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
      className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:right-5 sm:top-5"
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
}: {
  moment: TimelineMoment;
  onClear: () => void;
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
      <ClearPinButton onClear={onClear} />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[4fr_1fr]">
        {/* Left: editorial body — 80% of the row. Title and summary sized
            so typical content fits the fixed folio height; anything beyond
            the clamp overflows into the "read more" dialog. */}
        <div className="flex min-w-0 flex-col gap-2 overflow-hidden pr-10">
          {/* Year promoted to top of card (replaces the old "MOMENT"
              kicker). Era label sits inline so "1891 · 1880s-c. 1900"
              reads as a single dateline. */}
          <div className="flex items-baseline gap-3">
            <p className="font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              {anchorYear}
            </p>
            {yearLabel && yearLabel !== anchorYear ? (
              <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
                {yearLabel}
              </p>
            ) : null}
          </div>
          <h2 className="flex items-start gap-2 font-heading text-base font-bold leading-tight tracking-tight sm:text-lg">
            {moment.highlight ? (
              <span
                aria-hidden
                className={cn(MOMENT_HIGHLIGHT_PIP_CLASS, "mt-2 shrink-0")}
              />
            ) : null}
            <span title={moment.title} className="line-clamp-2 min-w-0">
              {moment.title}
            </span>
          </h2>
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground line-clamp-1">
            From {byline}&rsquo;s interview
          </p>
          {moment.summary ? (
            <div className="flex min-h-0 flex-col">
              <p className="border-l-[3px] border-primary/60 pl-4 text-sm leading-relaxed text-foreground/90 line-clamp-[5]">
                {moment.summary}
              </p>
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="mt-1.5 ml-4 self-start font-mono text-[11px] tracking-[0.12em] uppercase text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:rounded-sm"
                aria-label={`Read full summary for ${moment.title}`}
              >
                … read more
              </button>
            </div>
          ) : null}
        </div>

        {/* Right: structured aside — 20% of the row. */}
        <aside className="flex min-w-0 flex-col gap-3 overflow-hidden border-l border-border/60 pl-5 lg:pl-6">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-soft pr-1">
            {themes.length > 0 ? (
              <ThemeTagRow label="Themes" themes={themes} />
            ) : null}
            {neighborhoods.length > 0 ? (
              <NeighborhoodTagRow label="Neighborhoods" neighborhoods={neighborhoods} />
            ) : null}
            {advisoryNote ? (
              <span
                title={advisoryNote}
                className="inline-flex self-start rounded-md border border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase text-[color:var(--color-warning)]"
              >
                Advisory
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              In the recording
            </span>
            <Link
              href={`/player/${encodeURIComponent(moment.catalogNumber)}?t=${playFrom}`}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-3 py-2 font-heading text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <PlayIcon aria-hidden className="size-3.5" />
              Play from {formatTimestamp(moment.startTime)}
            </Link>
          </div>
        </aside>
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
  const [detailOpen, setDetailOpen] = useState(false);
  const when = eventWhenLabel(event);
  const kindLabel = event.category.replace(/_/g, " ");
  const referencedSummary =
    event.recordingCount === 1
      ? "One narrator in the collection returned to this."
      : `${event.recordingCount} narrators in the collection returned to this.`;

  return (
    <>
      <ClearPinButton onClear={onClear} />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-2 overflow-hidden pr-10">
          {/* Year promoted to top of card. */}
          <p className="font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {when}
          </p>
          <h2 className="font-heading text-base font-bold leading-tight tracking-tight sm:text-lg">
            <span title={event.label} className="line-clamp-2 block">
              {event.label}
            </span>
          </h2>
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground line-clamp-1">
            {kindLabel}
          </p>
          <div className="flex min-h-0 flex-col">
            <p className="border-l-[3px] border-primary/60 pl-4 text-sm leading-relaxed text-foreground/90 line-clamp-[5]">
              {referencedSummary}
            </p>
            {event.recordingCatalogs.length > 0 ? (
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="mt-1.5 ml-4 self-start font-mono text-[11px] tracking-[0.12em] uppercase text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:rounded-sm"
                aria-label={`See all narrators referencing ${event.label}`}
              >
                … see all narrators
              </button>
            ) : null}
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-2 overflow-hidden border-l border-border/60 pl-5 lg:pl-6">
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-soft pr-1">
            <TagRow
              label="Referenced in"
              values={event.recordingCatalogs}
              monospace
            />
          </div>
        </aside>
      </div>

      <EventDetailDialog
        event={event}
        when={when}
        kindLabel={kindLabel}
        summary={referencedSummary}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

function FolioEmptyBody({ corpus }: { corpus: FolioCorpus }) {
  const [from, to] = corpus.yearRange;
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
        {corpus.momentCount} moments
        <span className="mx-2 text-muted-foreground/50">·</span>
        {corpus.narratorCount} narrators
        <span className="mx-2 text-muted-foreground/50">·</span>c. {from}
        –{to}
      </p>
      <h2 className="max-w-xl font-heading text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        Hover or click any dot to explore a specific moment.
      </h2>
      <p className="max-w-xl text-sm text-muted-foreground">
        Move over a marker for a preview; click to pin it here and read at
        your own pace. Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to clear.
      </p>
    </div>
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
            <p className="font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
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
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary">
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-heading text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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

/** Full-detail modal for a historical event. */
function EventDetailDialog({
  event,
  when,
  kindLabel,
  summary,
  open,
  onOpenChange,
}: {
  event: TimelineHistoricalEvent;
  when: string;
  kindLabel: string;
  summary: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-2xl lg:max-w-3xl">
        <div className="flex flex-col gap-4">
          <p className="font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {when}
          </p>
          <DialogTitle className="font-heading text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            {event.label}
          </DialogTitle>
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
            {kindLabel}
          </p>
          <p className="border-l-[3px] border-primary/60 pl-4 text-base leading-relaxed text-foreground/90">
            {summary}
          </p>
          {event.recordingCatalogs.length > 0 ? (
            <TagRow
              label="Referenced in"
              values={event.recordingCatalogs}
              monospace
            />
          ) : null}
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
            <li
              key={n}
              style={{
                backgroundColor: `color-mix(in oklab, ${color} 20%, transparent)`,
                color: color,
              }}
              className="rounded-md px-2 py-0.5 text-[11px] font-medium tracking-normal"
            >
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
          const color = themeColorVar(t);
          return (
            <li
              key={t}
              style={{
                backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
                color: color,
              }}
              className="rounded-md px-2 py-0.5 text-[11px] font-medium tracking-normal"
            >
              {themeLabel(t)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The "big" year: a single numeric anchor for display. Prefers the era
 *  midpoint when both start and end are set. */
function momentAnchorYearLabel(m: TimelineMoment): string {
  if (m.eraStartYear != null && m.eraEndYear != null) {
    const mid = Math.round((m.eraStartYear + m.eraEndYear) / 2);
    return String(mid);
  }
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
