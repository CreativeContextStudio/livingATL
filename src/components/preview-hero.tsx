import Link from "next/link";
import {
  BookOpenIcon,
  MapPinIcon,
  HeadphonesIcon,
  ClockIcon,
  LandmarkIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  type LucideIcon,
} from "lucide-react";

import { canRequestViewArchive } from "@/lib/access-request";
import type { ArchiveStats } from "@/lib/queries/recordings";
import { cn } from "@/lib/utils";

/**
 * Shared preview-mode content rendered by both `/` and `/preview` while the
 * launch gate (PRD §8.8) is false. Single source of truth so the two routes
 * can't drift. When the gate flips to `true` and the site goes public, the
 * plan is:
 *   - `src/app/page.tsx` gets replaced with the real landing page
 *   - `src/app/preview/page.tsx` keeps rendering <PreviewHero /> so
 *     allowlisted preview visitors still have a status page
 *
 * Design intent: a sibling of `/browse`, `/map`, and `/contact`. Same
 * `max-w-7xl` shell, mono-eyebrow + `font-heading` hero + muted body
 * vocabulary; extended with a stats rail and a partner strip so the front
 * door carries more presence than the other pages. Copy: plain and brief —
 * what the collection is, what's online, how to start.
 */

function buildStats(
  archive: ArchiveStats | null,
): Array<{ label: string; value: string; tail: string }> {
  return [
    { label: "Years", value: "1914–1977", tail: "the stories cover" },
    { label: "Interviews", value: "500+", tail: "recorded by WRFG" },
    {
      label: "Online now",
      // Null when the database is unreachable; the card stays.
      value: archive ? String(archive.processedRecordings) : "—",
      tail: archive
        ? `recordings from ${archive.distinctInterviewees} storytellers`
        : "recordings",
    },
  ];
}

type Steward = { name: string; role: string; accent: string };

const STEWARDS: Steward[] = [
  { name: "WRFG", role: "Recorded and digitized the tapes", accent: "bg-primary" },
  {
    name: "Atlanta History Center",
    role: "Houses the collection",
    accent: "bg-amber-500/80",
  },
  {
    name: "Creative Context Studio",
    role: "Designed and built livingATL",
    accent: "bg-teal-500/80",
  },
];

type Surface = {
  label: string;
  heading: string;
  body: string;
  href: string;
  icon: LucideIcon;
  iconAccent: string;
};

const SURFACES: Surface[] = [
  {
    label: "Collection",
    heading: "Browse the recordings",
    body: "Filter by neighborhood, theme, or decade, or search for a name.",
    href: "/browse",
    icon: BookOpenIcon,
    iconAccent: "bg-primary/15 text-primary-ink",
  },
  {
    label: "Listening paths",
    heading: "Start with a path",
    body: "A few minutes from several interviews, in order. A good first listen.",
    href: "/paths",
    icon: HeadphonesIcon,
    iconAccent: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  },
  {
    label: "Timeline",
    heading: "Move through the decades",
    body: "Each moment sits on the year it describes. Select one to read it and listen.",
    href: "/timeline",
    icon: ClockIcon,
    iconAccent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  {
    label: "Map",
    heading: "Find a neighborhood",
    body: "See which recordings talk about a place.",
    href: "/map",
    icon: MapPinIcon,
    iconAccent: "bg-primary/15 text-primary-ink",
  },
  {
    label: "Neighborhoods",
    heading: "Read about a place",
    body: "Each neighborhood page gathers its recordings and moments.",
    href: "/places",
    icon: LandmarkIcon,
    iconAccent: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  },
  {
    label: "AI Portal",
    heading: "Ask a question",
    body: "Ask about people, places, or events. Each answer links to the recordings it draws on.",
    href: "/portal",
    icon: SparklesIcon,
    iconAccent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
];

export type PreviewHeroProps = {
  /** Null when the database is unreachable; the stats card degrades. */
  stats: ArchiveStats | null;
};

export async function PreviewHero({ stats: archive }: PreviewHeroProps) {
  const stats = buildStats(archive);
  // Can this visitor actually reach /browse, /map, …? Then the surface cards
  // are live links; otherwise they render inert. Same rule as the proxy.
  const entered = await canRequestViewArchive();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-12 px-6 py-10 lg:gap-16 lg:py-16">
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div aria-hidden className="h-1.5 w-20 rounded-full bg-primary" />
          <p className="font-mono text-xs tracking-[0.22em] uppercase text-muted-foreground">
            livingATL · Private preview
          </p>
        </div>

        <h1 className="max-w-4xl font-heading text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
          Atlanta, in the words of the people who lived it.
        </h1>

        <p className="max-w-3xl text-lg leading-relaxed text-foreground/85">
          In the late 1970s, WRFG radio recorded more than 500 interviews for
          its <span className="font-medium text-foreground">Living Atlanta</span>{" "}
          series. Atlantans talked about life in the city from 1914 to 1977:
          work, family, church, school, and segregation. The Atlanta
          History Center houses the collection.
        </p>

        <p className="max-w-3xl text-lg leading-relaxed text-foreground/85">
          livingATL puts these recordings online, with transcripts, so you can
          search them, listen, and follow the stories by neighborhood and year.
        </p>
      </section>

      <section aria-label="Collection at a glance" className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          At a glance
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <li key={s.label}>
              <article className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card/60 p-5">
                <p className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                  {s.label}
                </p>
                <p className="font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground">
                  {s.value}
                </p>
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                  {s.tail}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Ways in" className="flex flex-col gap-4">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          Ways in
        </p>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SURFACES.map((s) => {
            const Icon = s.icon;
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
                      s.iconAccent,
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  {entered ? (
                    <ArrowUpRightIcon
                      aria-hidden
                      className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                    {s.label}
                  </p>
                  <h2 className="font-heading text-xl font-semibold leading-tight tracking-tight">
                    {s.heading}
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {s.body}
                </p>
              </>
            );
            return (
              <li key={s.label} className="flex">
                {entered ? (
                  <Link
                    href={s.href}
                    className="group flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-foreground/30 hover:bg-card/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Stewardship" className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          Who&apos;s behind it
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEWARDS.map((s) => (
            <li key={s.name}>
              <article className="flex h-full items-center gap-4 rounded-xl border border-border bg-card/50 p-4">
                <div
                  aria-hidden
                  className={cn("size-10 shrink-0 rounded-full", s.accent)}
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="font-heading text-sm font-semibold leading-tight tracking-tight">
                    {s.name}
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                    {s.role}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="About the recordings" className="flex max-w-3xl flex-col gap-2">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          About the recordings
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Recordings play as they were spoken, including the language of their
          time; some open with a short content note. Transcripts are made by
          software and can contain errors. AI helps with summaries and the
          Portal, and its answers link back to the recordings they come from.{" "}
          <Link href="/about" className="font-medium text-foreground underline-offset-4 hover:underline">
            More about the project
          </Link>
        </p>
      </section>
    </main>
  );
}
