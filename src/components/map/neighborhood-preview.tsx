"use client";

import Link from "next/link";
import { XIcon } from "lucide-react";

import { AdvisoryBadge } from "@/components/browser/advisory-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatDuration,
  formatRecordingDate,
  formatSpeakerName,
  titleForCard,
} from "@/lib/format";
import { placeHref } from "@/lib/places";
import { cn } from "@/lib/utils";
import type { MapRecording } from "@/lib/queries/map";

/**
 * Side panel shown to the right of the Map. Two states:
 *   - No neighborhood active: empty-state prompt
 *   - Active neighborhood: scrollable list of recordings that include
 *     that neighborhood in `metadata_extracted.neighborhoods[]`.
 *
 * Click a recording card → `/player/[catalog]` (same URL shape as the
 * Browser cards). We deliberately do NOT reuse the Browser's
 * `RecordingCard` here because the grid tile doesn't compose well into a
 * vertical list; the visual language (speaker name heading, first-
 * sentence summary, chips, catalog mono, advisory badge) matches by
 * convention.
 */
export function NeighborhoodPreview({
  activeNeighborhood,
  recordings,
  total,
  onClose,
  className,
}: {
  activeNeighborhood: string | null;
  recordings: MapRecording[];
  total: number;
  onClose: () => void;
  /** Optional overrides — used by the mobile bottom-sheet to strip the
   *  card chrome and let the panel fill the sheet. Desktop passes nothing. */
  className?: string;
}) {
  if (!activeNeighborhood) {
    return (
      <aside
        className={cn(
          "flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-6 text-center",
          className,
        )}
      >
        <p className="font-heading text-lg font-semibold leading-tight">
          Each neighborhood remembers a different Atlanta.
        </p>
        <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Click any pin to hear the storytellers whose lives unfolded there.
          Pin size tracks how many interviews touch that place.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card/50",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/70 p-5">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
            Neighborhood
          </p>
          <h2 className="font-heading text-xl leading-tight font-semibold">
            {activeNeighborhood}
          </h2>
          <p className="text-xs text-muted-foreground">
            {recordings.length} recording{recordings.length === 1 ? "" : "s"}
            {total > 0 && total !== recordings.length
              ? ` · ${total} across all filters`
              : ""}
          </p>
          <Link
            href={placeHref(activeNeighborhood)}
            className="mt-1 self-start text-xs font-medium text-primary-ink underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            About {activeNeighborhood} →
          </Link>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Clear selected neighborhood"
        >
          <XIcon />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-2 p-4">
          {recordings.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-muted-foreground">
              No interviews in the current filter touch {activeNeighborhood}.
            </li>
          ) : null}
          {recordings.map((r) => {
            const interviewee = r.interviewees[0];
            const life = interviewee?.birthYear
              ? ` (${interviewee.birthYear}${interviewee.deathYear ? `–${interviewee.deathYear}` : "–"})`
              : "";
            const label = interviewee
              ? `${formatSpeakerName(interviewee.name)}${life}`
              : titleForCard(r.title);
            return (
              <li key={r.id}>
                <Link
                  href={`/player/${encodeURIComponent(r.catalogNumber)}`}
                  className="group flex flex-col gap-2 rounded-lg border border-border/60 bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-heading text-sm font-semibold leading-tight">
                      {label}
                    </p>
                    {r.contentAdvisory?.display_advisory ? (
                      <AdvisoryBadge advisory={r.contentAdvisory} />
                    ) : null}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {r.summary}
                  </p>
                  <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {formatDuration(r.durationSeconds)} ·{" "}
                    {formatRecordingDate(
                      r.recordingDate,
                      r.recordingDatePrecision as
                        | "year"
                        | "month"
                        | "exact"
                        | "estimated"
                        | null,
                    )}{" "}
                    · {r.catalogNumber}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </aside>
  );
}
