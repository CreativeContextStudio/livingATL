import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";

import { PlayerClient } from "@/components/player/player-client";
import {
  getThemeAccent,
  type ThemeAccent,
} from "@/components/shared/theme-accent";
import {
  fetchPlayerData,
  fetchRelatedRecordings,
  type PlayerSpeaker,
} from "@/lib/queries/player";

/**
 * React.cache memoizes per-request so `generateMetadata` and the page body
 * share a single Supabase round-trip for the same catalog number. Without
 * this, every request on this route fetches twice.
 */
const getPlayerData = cache(fetchPlayerData);

import {
  formatDuration,
  formatRecordingDate,
  formatSpeakerName,
  titleForCard,
} from "@/lib/format";
import { formatTimestamp, safeDecodeCatalog } from "@/lib/player";
import { cn } from "@/lib/utils";
import {
  canRequestViewArchive,
  requireArchiveAccess,
} from "@/lib/access-request";
import { parseClipRange } from "@/lib/clips";
import { archiveIsPublic } from "@/lib/access";
import { headers } from "next/headers";
import { nonceFromCsp } from "@/lib/csp";
import { siteUrl } from "@/lib/site-url";

/**
 * Audio Player page — PRD §7.2.
 *
 * Fetches all Player data in one async call (recordings + transcripts +
 * metadata + speakers), guards 404, then hands off to `<PlayerClient>`
 * which owns the wavesurfer instance + playback state.
 *
 * Launch-gate behavior: this route is NOT on the preview allowlist in
 * `src/proxy.ts`, so it naturally rewrites to `/preview` until
 * `NEXT_PUBLIC_LAUNCH_ENABLED=true`. Same pattern as `/browse`.
 */

type RouteParams = { catalog: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  // Don't resolve (and leak) the recording title for a visitor the page
  // itself would redirect away.
  if (!(await canRequestViewArchive())) return { title: "livingATL" };
  const { catalog: catalogEncoded } = await params;
  const catalog = safeDecodeCatalog(catalogEncoded);
  if (!catalog) return { title: "Recording not found" };
  const data = await getPlayerData(catalog);
  if (!data) return { title: "Recording not found" };
  const interviewee = data.speakers.find((s) => s.role === "interviewee");
  const title = interviewee
    ? `${formatSpeakerName(interviewee.name)} · ${titleForCard(data.title)}`
    : data.title;
  const description = data.cardLine || undefined;
  // Clip links get a card quoting the clip; plain links quote the recording.
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const clip = parseClipRange(first(sp.t), first(sp.end));
  const card = `/player/${encodeURIComponent(catalog)}/card${
    clip ? `?t=${formatTimestamp(clip.start)}&end=${formatTimestamp(clip.end)}` : ""
  }`;
  const indexable = archiveIsPublic();
  return {
    title,
    description,
    alternates: { canonical: `/player/${encodeURIComponent(catalog)}` },
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: card, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [card] },
    // Indexable only once the archive is public (launched, no demo gate).
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

function buildStorytellerLabel(speakers: PlayerSpeaker[]): {
  name: string;
  life: string | null;
} {
  const interviewee = speakers.find((s) => s.role === "interviewee");
  if (!interviewee) return { name: "Storyteller unknown", life: null };
  const life = interviewee.birthYear
    ? `${interviewee.birthYear}${interviewee.deathYear ? `–${interviewee.deathYear}` : "–"}`
    : null;
  return { name: formatSpeakerName(interviewee.name), life };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  // PRD §8.8 backstop — the proxy is the first line; see src/lib/access.ts.
  await requireArchiveAccess();
  const { catalog: catalogEncoded } = await params;
  const catalog = safeDecodeCatalog(catalogEncoded);
  if (!catalog) notFound();
  const data = await getPlayerData(catalog);
  if (!data) notFound();

  const related = await fetchRelatedRecordings(
    data.id,
    data.themes,
    data.neighborhoods,
    4,
  );

  const storytellerLabel = buildStorytellerLabel(data.speakers);
  // Per-recording accent derived from the top theme. Drives the portrait
  // band at the head of the page + the placeholder portrait gradient; the
  // PlayerClient re-derives the same palette internally for waveform,
  // chapter scrubber, and transport (source of truth is `data.themes`).
  const accent = getThemeAccent(data.themes);
  const dateLabel = formatRecordingDate(
    data.recordingDate,
    data.recordingDatePrecision as
      | "year"
      | "month"
      | "exact"
      | "estimated"
      | null,
  );

  // Voice-beat line tail: prefer the first authored moment's era_label over
  // a raw count — "17 moments authored" is pipeline voice; "c. 1906–1930" is
  // the storyteller's arc (Player UX pass, Move 7).
  const firstEraLabel = data.briefMoments[0]?.era_label ?? null;
  const voiceBeatTail =
    firstEraLabel ??
    (data.briefMoments.length > 0
      ? `${data.briefMoments.length} chapter${data.briefMoments.length === 1 ? "" : "s"}`
      : null);

  // Structured data for search engines (schema.org AudioObject). Rendered as
  // a JSON data block; the CSP nonce is attached for consistency.
  const nonce = nonceFromCsp((await headers()).get("content-security-policy"));
  const intervieweeSpeaker = data.speakers.find((s) => s.role === "interviewee");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AudioObject",
    name: titleForCard(data.title),
    description: data.cardLine || undefined,
    url: new URL(`/player/${encodeURIComponent(data.catalogNumber)}`, siteUrl()).toString(),
    encodingFormat: "audio/mpeg",
    ...(data.durationSeconds ? { duration: `PT${Math.round(data.durationSeconds)}S` } : {}),
    ...(data.recordingDate ? { dateCreated: data.recordingDate } : {}),
    inLanguage: "en",
    identifier: data.catalogNumber,
    ...(intervieweeSpeaker
      ? { creator: { "@type": "Person", name: formatSpeakerName(intervieweeSpeaker.name) } }
      : {}),
    isPartOf: { "@type": "Collection", name: data.collection ?? "Living Atlanta" },
    ...(data.rightsHolder ? { copyrightHolder: { "@type": "Organization", name: data.rightsHolder } } : {}),
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:py-10 lg:py-14">
      <script
        type="application/ld+json"
        nonce={nonce}
        // JSON with `<` escaped so a quote containing "</script>" can't break out.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Breadcrumb — tiny mono trail anchoring the page in the collection.
          Unobtrusive at rest; hover picks up the foreground color on the
          linked crumbs. Current page (catalog number) stays unlinked with
          `aria-current="page"`. */}
      <nav
        aria-label="Breadcrumb"
        className="[&_a]:inline-flex [&_a]:min-h-6 [&_a]:items-center pointer-coarse:[&_a]:min-h-11 flex flex-wrap items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground"
      >
        <Link
          href="/"
          className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
        >
          livingATL
        </Link>
        <span aria-hidden className="text-muted-foreground">/</span>
        <Link
          href="/browse"
          className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
        >
          Interviews
        </Link>
        <span aria-hidden className="text-muted-foreground">/</span>
        <span aria-current="page" className="text-foreground/80">
          {data.catalogNumber}
        </span>
      </nav>

      <header className="flex flex-col gap-3">
        {/* Portrait band — a short horizontal rule in the recording's
            top-theme accent. Pairs the page header with the Player's
            waveform/chapter palette so a listener arriving at the page
            sees the theme before reading the storyteller name. */}
        <div
          aria-hidden
          className={cn("h-1.5 w-20 rounded-full", accent.tailwind.bgStrong)}
        />
        <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          {storytellerLabel.name}
          {storytellerLabel.life ? (
            <span className="ml-2 align-baseline text-sm font-normal tracking-normal text-muted-foreground sm:text-base">
              ({storytellerLabel.life})
            </span>
          ) : null}
        </h1>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_18rem] sm:items-stretch lg:grid-cols-[1fr_22rem]">
          <AboutThisRecording
            overview={data.briefOverview}
            title={titleForCard(data.title)}
            dateLabel={dateLabel}
            duration={formatDuration(data.durationSeconds)}
            voiceBeatTail={voiceBeatTail}
          />
          <StorytellerPortraitPlaceholder
            name={storytellerLabel.name}
            accent={accent}
          />
        </div>
      </header>

      <PlayerClient data={data} related={related} />
    </main>
  );
}

function AboutThisRecording({
  overview,
  title,
  dateLabel,
  duration,
  voiceBeatTail,
}: {
  overview: string | null | undefined;
  title: string;
  dateLabel: string;
  duration: string;
  voiceBeatTail: string | null;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card/40 px-5 py-4">
      <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        About this interview
      </p>
      {overview ? <p className="mt-2 mb-3 text-base leading-relaxed text-foreground/85">{overview}</p> : null}
      <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-3">
        <p className="text-sm text-foreground/90">{title}</p>
        <p className="text-xs text-muted-foreground">
          Recorded {dateLabel} · {duration}
          {voiceBeatTail ? ` · ${voiceBeatTail}` : ""}
        </p>
      </div>
    </section>
  );
}

function StorytellerPortraitPlaceholder({
  name,
  accent,
}: {
  name: string;
  accent: ThemeAccent;
}) {
  const initials = name
    .replace(/\s*\(.*$/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  // Gradient driven by the accent hex (Tailwind JIT can't compose
  // per-theme from/via/to utilities dynamically, so inline style it is).
  // `${hex}26` = hex + 0x26 alpha ≈ 15% opacity; `${hex}0D` ≈ 5%.
  const tintStrong = `${accent.hex.progress}26`;
  const tintSoft = `${accent.hex.progress}0D`;
  return (
    <div
      aria-hidden
      // Decorative; hidden on phones so the player isn't pushed a screen down.
      className="relative hidden h-full min-h-[14rem] w-full overflow-hidden rounded-xl ring-1 ring-foreground/10 sm:block"
      style={{
        background: `linear-gradient(to bottom right, ${tintStrong}, ${tintSoft}, var(--color-muted))`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${accent.hex.progress}2E, transparent 60%)`,
        }}
      />
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2",
          accent.tailwind.text,
          "opacity-70",
        )}
      >
        <ImageIcon className="size-9" strokeWidth={1.25} aria-hidden />
        {initials ? (
          <span
            className={cn(
              "font-heading text-3xl font-semibold tracking-tight",
              accent.tailwind.text,
            )}
          >
            {initials}
          </span>
        ) : null}
      </div>
      <span className="absolute bottom-2 left-3 font-mono text-[9px] tracking-[0.22em] text-muted-foreground uppercase">
        Portrait
      </span>
    </div>
  );
}
