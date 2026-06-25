import Link from "next/link";

import { formatDuration, formatSpeakerName, titleForCard } from "@/lib/format";
import type { RelatedRecording } from "@/lib/queries/player";

/**
 * Related recordings rail — PRD §7.2. Server-rendered list of other
 * recordings sharing themes or neighborhoods with the current one,
 * ranked by facet overlap (see `fetchRelatedRecordings` for scoring).
 */
export function RelatedRecordings({
  related,
}: {
  related: RelatedRecording[];
}) {
  if (related.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-5">
      <h3 className="font-heading text-xs font-semibold tracking-[0.14em] uppercase">
        Related recordings
      </h3>
      <ul className="flex flex-col gap-3">
        {related.map((r) => {
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
                className="group flex flex-col gap-1 rounded-md border border-border/50 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <p className="font-heading text-sm font-semibold leading-tight">
                  {label}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {r.briefOverview ?? titleForCard(r.title)}
                </p>
                <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {formatDuration(r.durationSeconds)} · {r.catalogNumber}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
