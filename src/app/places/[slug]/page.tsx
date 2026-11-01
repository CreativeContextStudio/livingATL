import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRangeIcon, LibraryIcon, MapIcon, SparklesIcon } from "lucide-react";

import { RecordingCard } from "@/components/browser/recording-card";
import { MomentQueueButtons } from "@/components/queue/queue-buttons";
import { neighborhoodStyle, themeStyle } from "@/components/shared/category-colors";
import { Badge } from "@/components/ui/badge";
import { requireArchiveAccess } from "@/lib/access-request";
import { formatSpeakerName } from "@/lib/format";
import { PLACE_NOTES } from "@/lib/place-notes";
import { placeFromSlug, placeSlug } from "@/lib/places";
import { formatTimestamp } from "@/lib/player";
import { fetchBrowserFacets, fetchBrowserRecordings } from "@/lib/queries/recordings";
import { fetchTimelineData, type TimelineMoment } from "@/lib/queries/timeline";
import { cn } from "@/lib/utils";

/**
 * Place page (F-places) — one neighborhood, gathered from Browse (the
 * recordings that touch it) and the Timeline (brief moments set there),
 * with a slot for steward context (`src/lib/place-notes.ts`) and links out
 * to the same place on the Map, Timeline and Browse. A cheap first cut of
 * the PRD §7.7 wiki. The slug resolves against the live neighborhood
 * facets, so unknown slugs 404.
 */

const MAX_MOMENTS = 8;

async function resolvePlace(slug: string): Promise<string | null> {
  const { neighborhoods } = await fetchBrowserFacets();
  return placeFromSlug(
    neighborhoods.map((n) => n.value),
    slug,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const name = await resolvePlace((await params).slug);
  return name
    ? {
        title: `${name} · Places`,
        description: `Interviews and chapters from the Living Atlanta oral histories that touch ${name}.`,
      }
    : {};
}

/** Highlights first, then by era; one per recording before repeats. */
function pickMoments(moments: TimelineMoment[]): TimelineMoment[] {
  const sorted = [...moments].sort(
    (a, b) =>
      Number(b.highlight) - Number(a.highlight) ||
      (a.eraStartYear ?? 9999) - (b.eraStartYear ?? 9999),
  );
  const seen = new Set<string>();
  const firstPass = sorted.filter((m) => !seen.has(m.catalogNumber) && seen.add(m.catalogNumber));
  const rest = sorted.filter((m) => !firstPass.includes(m));
  return [...firstPass, ...rest]
    .slice(0, MAX_MOMENTS)
    .sort((a, b) => (a.eraStartYear ?? 9999) - (b.eraStartYear ?? 9999));
}

function eraText(m: TimelineMoment): string | null {
  if (m.eraLabel) return m.eraLabel;
  if (m.eraStartYear === null) return null;
  return m.eraEndYear && m.eraEndYear !== m.eraStartYear
    ? `${m.eraStartYear}–${m.eraEndYear}`
    : String(m.eraStartYear);
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireArchiveAccess();
  const { slug } = await params;
  const name = await resolvePlace(slug);
  if (!name) notFound();

  const [recordings, timeline] = await Promise.all([
    fetchBrowserRecordings({ neighborhood: name }, "date_recorded_desc"),
    fetchTimelineData(),
  ]);
  const moments = timeline.moments.filter((m) => m.neighborhoods.includes(name));
  const shown = pickMoments(moments);

  const years = moments.flatMap((m) =>
    [m.eraStartYear, m.eraEndYear].filter((y): y is number => y !== null),
  );
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : null;

  const themeCounts = new Map<string, number>();
  for (const r of recordings) for (const t of r.themes) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
  const topThemes = [...themeCounts].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);

  const note = PLACE_NOTES[placeSlug(name)];
  const style = neighborhoodStyle(name);
  const q = encodeURIComponent(name);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="[&_a]:inline-flex [&_a]:min-h-6 [&_a]:items-center pointer-coarse:[&_a]:min-h-11 font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          <Link href="/places" className="hover:text-foreground hover:underline underline-offset-4">
            Places
          </Link>{" "}
          / {name}
        </nav>
        <div className="flex items-center gap-3">
          <span aria-hidden className={cn("size-3.5 rounded-full border", style.border, style.bg)} />
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{name}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {recordings.length} recording{recordings.length === 1 ? "" : "s"} · {moments.length} chapter
          {moments.length === 1 ? "" : "s"}
          {span ? ` · stories spanning ${span}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <PlaceLink href={`/map?neighborhood=${q}`} icon={MapIcon}>
            See on the map
          </PlaceLink>
          <PlaceLink href={`/timeline?neighborhoods=${q}`} icon={CalendarRangeIcon}>
            Chapters on the timeline
          </PlaceLink>
          <PlaceLink href={`/browse?neighborhood=${q}`} icon={LibraryIcon}>
            Browse interviews
          </PlaceLink>
        </div>
      </header>

      {note ? (
        <section aria-labelledby="place-context" className="flex max-w-3xl flex-col gap-3">
          <h2 id="place-context" className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            Steward context
          </h2>
          {note.body.map((para, i) => (
            <p key={i} className="leading-relaxed text-foreground/85">
              {para}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">
            {note.author} · updated {note.updated}
          </p>
        </section>
      ) : (
        <section
          aria-label="Steward context"
          className="flex max-w-3xl flex-col gap-1.5 rounded-xl border border-dashed border-border bg-card/40 p-5"
        >
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
            Steward context · Forthcoming
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            A short history of {name}, written by the archive&apos;s stewards, will appear here. Until
            then, the storytellers below speak for it in their own words.
          </p>
        </section>
      )}

      {topThemes.length > 0 ? (
        <section aria-labelledby="place-themes" className="flex flex-col gap-2">
          <h2 id="place-themes" className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            What people talk about here
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {topThemes.map((t) => {
              const s = themeStyle(t);
              return (
                <Badge
                  key={t}
                  variant="outline"
                  className={cn(s.border, s.bg, s.text, "hover:opacity-80")}
                  render={<Link href={`/browse?neighborhood=${q}&theme=${encodeURIComponent(t)}`} />}
                >
                  {t.replace(/_/g, " ")}
                </Badge>
              );
            })}
          </div>
        </section>
      ) : null}

      {shown.length > 0 ? (
        <section aria-labelledby="place-moments" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="place-moments" className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
              Chapters set in {name}
            </h2>
            {moments.length > shown.length ? (
              <Link
                href={`/timeline?neighborhoods=${q}`}
                className="text-xs font-medium text-primary-ink underline-offset-4 hover:underline"
              >
                See them all on the timeline
              </Link>
            ) : null}
          </div>
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {shown.map((m) => (
              <li
                key={`${m.catalogNumber}:${m.momentIndex}`}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card/50 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[11px] tabular-nums tracking-[0.12em] uppercase text-muted-foreground">
                    {eraText(m) ?? "Undated"}
                    {m.highlight ? (
                      <span className="ml-2 inline-flex items-center gap-1 normal-case tracking-normal text-primary-ink">
                        <SparklesIcon aria-hidden className="size-3" />
                        Highlight
                      </span>
                    ) : null}
                  </p>
                </div>
                <h3 className="font-heading font-semibold leading-snug">
                  <Link
                    href={`/player/${encodeURIComponent(m.catalogNumber)}?t=${formatTimestamp(m.startTime)}`}
                    className="inline-flex min-h-6 items-center pointer-coarse:min-h-11 hover:underline underline-offset-4"
                  >
                    {m.title}
                  </Link>
                </h3>
                <p className="text-xs italic text-muted-foreground">
                  {m.intervieweeName ? formatSpeakerName(m.intervieweeName) : m.recordingTitle} ·{" "}
                  {formatTimestamp(m.startTime)}
                </p>
                {m.summary ? (
                  <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">{m.summary}</p>
                ) : null}
                <div className="mt-auto pt-1">
                  <MomentQueueButtons moment={m} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="place-recordings" className="flex flex-col gap-3">
        <h2 id="place-recordings" className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          Recordings that touch {name}
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recordings.map((r) => (
            <li key={r.id} className="flex">
              <RecordingCard recording={r} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function PlaceLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof MapIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon aria-hidden className="size-4" />
      {children}
    </Link>
  );
}
