"use client";

import { ArrowLeftIcon, ArrowRightIcon, HeadphonesIcon, PauseIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TimelineMoment } from "@/lib/queries/timeline";

/**
 * Timeline journey controls — the top of the detail panel / bottom sheet
 * while a moment is open. Earlier / Later step through the stories in year
 * order (the chart glides to follow); "Listen through" plays each story and
 * moves on when it ends. The journey walks the highlights by default, or
 * every story, always within the current Theme / Place filter.
 */

export type JourneyScope = "highlights" | "all";

export type JourneyState = {
  /** 0-based position of the open moment in the journey; null when the
   *  open moment isn't one of its stops (e.g. a non-highlight dot). */
  position: number | null;
  total: number;
  /** 0..1 — how far along the journey the open moment sits. */
  progress: number;
  earlier: TimelineMoment | null;
  later: TimelineMoment | null;
  scope: JourneyScope;
  /** False when the filter leaves no highlights (the journey then walks all). */
  canScopeHighlights: boolean;
  listening: boolean;
  canListen: boolean;
};

type Props = {
  journey: JourneyState;
  onStep: (dir: -1 | 1) => void;
  onToggleListen: () => void;
  onScope: (scope: JourneyScope) => void;
  onClose: () => void;
};

function stepYear(m: TimelineMoment): string {
  return String(m.eraStartYear ?? m.eraEndYear ?? "");
}

export function JourneyBar({ journey, onStep, onToggleListen, onScope, onClose }: Props) {
  const { position, total, progress, earlier, later, scope, canScopeHighlights, listening, canListen } = journey;
  const noun = scope === "highlights" && canScopeHighlights ? "highlights" : "chapters";
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-card/95 px-4 pb-3 pt-4 backdrop-blur supports-backdrop-filter:bg-card/85">
      <div className="flex items-center gap-2">
        <StepButton dir={-1} target={earlier} onStep={onStep} />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground" aria-live="polite">
            {position != null ? (
              <>
                {position + 1} of {total}
                <span className="sr-only"> {noun}</span>
              </>
            ) : (
              `${total} ${noun}`
            )}
          </span>
          <div
            role="progressbar"
            aria-label="Journey progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-1 w-full overflow-hidden rounded-full bg-foreground/10"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(2, progress * 100)}%` }}
            />
          </div>
        </div>
        <StepButton dir={1} target={later} onStep={onStep} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chapter"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11"
        >
          <XIcon aria-hidden className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleListen}
          disabled={!canListen && !listening}
          aria-pressed={listening}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:h-10",
            listening
              ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          {listening ? <PauseIcon aria-hidden className="size-3.5" /> : <HeadphonesIcon aria-hidden className="size-3.5" />}
          {listening ? "Listening through" : "Listen through"}
        </button>

        {canScopeHighlights ? (
          <div role="group" aria-label="Journey stops" className="flex items-center rounded-full border border-border bg-background p-0.5">
            {(["highlights", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onScope(s)}
                aria-pressed={scope === s}
                // Distinct from the toolbar's "Highlights" filter.
                aria-label={s === "highlights" ? "Journey through highlights" : "Journey through all chapters"}
                className={cn(
                  "h-7 rounded-full px-2.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-9",
                  scope === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "highlights" ? "Highlights" : "All"}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepButton({
  dir,
  target,
  onStep,
}: {
  dir: -1 | 1;
  target: TimelineMoment | null;
  onStep: (dir: -1 | 1) => void;
}) {
  const label = dir < 0 ? "Earlier chapter" : "Later chapter";
  return (
    <button
      type="button"
      onClick={() => onStep(dir)}
      disabled={!target}
      aria-label={target ? `${label}, ${stepYear(target)}: ${target.title}` : `${label} (none)`}
      title={target ? `${stepYear(target)} · ${target.title}` : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 font-mono text-xs tabular-nums transition-colors hover:border-primary/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:h-11",
        dir > 0 && "flex-row-reverse",
      )}
    >
      {dir < 0 ? <ArrowLeftIcon aria-hidden className="size-3.5" /> : <ArrowRightIcon aria-hidden className="size-3.5" />}
      {target ? stepYear(target) : "—"}
    </button>
  );
}
