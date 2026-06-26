import { cookies } from "next/headers";
import Link from "next/link";
import {
  BookOpenIcon,
  MapPinIcon,
  HeadphonesIcon,
  ClockIcon,
  SparklesIcon,
  PodcastIcon,
  ArrowUpRightIcon,
  type LucideIcon,
} from "lucide-react";

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
 * door carries more presence than the other pages.
 * Kept fully static — the launch-gate page shouldn't hit the DB.
 */

function buildStats(
  processedRecordings: number,
  distinctInterviewees: number,
): Array<{ label: string; value: string; tail: string }> {
  return [
    {
      label: "The tapes",
      value: "1914–1977",
      tail: "Recorded late 1970s · digitized by WRFG",
    },
    {
      label: "Processed",
      value: `${processedRecordings} / ${distinctInterviewees}`,
      tail: "recordings · distinct storytellers",
    },
    {
      label: "Access",
      value: "Invite-only",
      tail: "Citation-first preview",
    },
  ];
}

type Steward = { name: string; role: string; accent: string };

const STEWARDS: Steward[] = [
  { name: "WRFG", role: "Broadcast origin", accent: "bg-primary" },
  {
    name: "Atlanta History Center",
    role: "Archive home",
    accent: "bg-amber-500/80",
  },
  {
    name: "Creative Context Studio",
    role: "Design + build",
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
    heading: "Every storyteller, findable.",
    body: "Search by theme, neighborhood, era, or name. Pull up a 1947 domestic worker alongside a 1974 civil rights organizer and see what they share.",
    href: "/browse",
    icon: BookOpenIcon,
    iconAccent: "bg-primary/15 text-primary",
  },
  {
    label: "Map",
    heading: "Find your neighborhood's tape.",
    body: "Every storyteller placed where they lived, worked, and were recorded. Open your block and hear who came before you.",
    href: "/map",
    icon: MapPinIcon,
    iconAccent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  {
    label: "Player",
    heading: "Sit inside the recording.",
    body: "Transcript tracks with the audio. Chapters move you through moments the storyteller chose. Every AI summary cites the second of tape it came from.",
    href: "/browse",
    icon: HeadphonesIcon,
    iconAccent: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  },
  {
    label: "Timeline",
    heading: "Walk the decades.",
    body: "Move through 1914–1977 along a scrubbable timeline. Storyteller-authored moments surface as dots. Tap one and you're inside the tape at that beat.",
    href: "/timeline",
    icon: ClockIcon,
    iconAccent: "bg-primary/15 text-primary",
  },
  {
    label: "AI Portal",
    heading: "Ask the archive.",
    body: "A citation-first conversational interface over the full collection. Every answer cites the recording, the speaker, and the timecode it came from. No fabricated quotes.",
    href: "/portal",
    icon: SparklesIcon,
    iconAccent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
];

type Placeholder = {
  label: string;
  heading: string;
  body: string;
  icon: LucideIcon;
  iconAccent: string;
};

const PLACEHOLDERS: Placeholder[] = [
  {
    label: "Podcast",
    heading: "The archive, on the air.",
    body: "Curated audio episodes drawn straight from the tapes. Themes, neighborhoods, and storyteller arcs threaded together with light editorial framing and full citations back to the source recordings.",
    icon: PodcastIcon,
    iconAccent: "bg-teal-500/10 text-teal-700/80 dark:text-teal-400/80",
  },
];

export type PreviewHeroProps = {
  processedRecordings: number;
  distinctInterviewees: number;
};

/**
 * Has this visitor entered the site? Mirrors the precedence in `proxy.ts`:
 * when SITE_GATE_TOKEN is set the demo password gate is authoritative (the
 * `la_gate` cookie must match, regardless of the launch flag); otherwise the
 * launch flag decides. Returns false in plain invite-only preview, where no
 * cookie grants access. Drives whether the surface cards are live links —
 * an entered visitor can actually reach `/browse`, `/map`, etc., so the cards
 * navigate; everyone else gets the same cards rendered inert.
 */
async function hasEntered(): Promise<boolean> {
  const gateToken = process.env.SITE_GATE_TOKEN;
  if (gateToken) {
    const gateCookie = (await cookies()).get("la_gate")?.value ?? "";
    return gateCookie.length === gateToken.length && gateCookie === gateToken;
  }
  return process.env.NEXT_PUBLIC_LAUNCH_ENABLED === "true";
}

export async function PreviewHero({
  processedRecordings,
  distinctInterviewees,
}: PreviewHeroProps) {
  const stats = buildStats(processedRecordings, distinctInterviewees);
  const entered = await hasEntered();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-12 px-6 py-10 lg:gap-16 lg:py-16">
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div aria-hidden className="h-1.5 w-20 rounded-full bg-primary" />
          <p className="font-mono text-xs tracking-[0.22em] uppercase text-muted-foreground">
            livingATL · Invite-only preview
          </p>
        </div>

        <h1 className="font-heading text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl lg:text-[5.25rem]">
          Atlanta&rsquo;s living story,
          <br />
          <span className="text-foreground/60">
            spoken by the voices that knew it then and remember it now.
          </span>
        </h1>

        <p className="text-lg leading-relaxed text-foreground/85">
          Between 1914 and 1977, Atlanta lived through the decades that
          shaped the culture and communities we know today. In the
          mid-to-late 1970s, WRFG&apos;s{" "}
          <span className="font-medium text-foreground">Living Atlanta</span>{" "}
          series invited Atlantans to sit down at microphones and tell those
          stories in their own words. The result was more than 500
          conversations, now digitized by WRFG and preserved by the Atlanta
          History Center.
        </p>

        <p className="text-lg leading-relaxed text-foreground/85">
          livingATL opens that collection to new kinds of discovery:
          searchable, listenable, and mapped to the neighborhoods, years, and
          movements its speakers helped shape.
        </p>

      </section>

      <section aria-label="Collection at a glance" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            At a glance
          </p>
          <p className="font-mono text-[11px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
            03 · Data points
          </p>
        </div>
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
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground/80">
                  {s.tail}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="How to livingATL" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            How to livingATL
          </p>
          <p className="font-mono text-[11px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
            06 · Surfaces
          </p>
        </div>
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
                  <h3 className="font-heading text-xl font-semibold leading-tight tracking-tight">
                    {s.heading}
                  </h3>
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
                    className="group flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-foreground/30 hover:bg-card/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
          {PLACEHOLDERS.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.label} className="flex">
                <article className="flex h-full w-full flex-col gap-4 rounded-xl border border-dashed border-border bg-card/30 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
                        p.iconAccent,
                      )}
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
                      Soon
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                      {p.label}
                    </p>
                    <h3 className="font-heading text-xl font-semibold leading-tight tracking-tight text-foreground/90">
                      {p.heading}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/70">
                    {p.body}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Stewardship" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            Stewarded by
          </p>
          <p className="font-mono text-[11px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
            03 · Partners
          </p>
        </div>
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

      <section aria-label="Editorial guarantee" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div aria-hidden className="h-1.5 w-20 rounded-full bg-foreground/70" />
          <p className="font-mono text-xs tracking-[0.22em] uppercase text-muted-foreground">
            Citation-first preview
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The tapes are the beginning of the sentence, not the end. Atlanta
          residents will add their own recordings to the same shelf as the
          Living Atlanta tapes, so the archive keeps growing the way the
          city does.
          For now we&apos;re in{" "}
          <span className="font-medium text-foreground/90">
            citation-first preview
          </span>{" "}
          with WRFG and the Atlanta History Center. Every AI-synthesized
          answer traces back to source audio with timecodes. No fabricated
          quotes. No impersonation.
        </p>
      </section>
    </main>
  );
}
