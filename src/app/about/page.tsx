import type { Metadata } from "next";
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
import { fetchArchiveStats } from "@/lib/queries/recordings";

/**
 * About page. The public-facing identity page for livingATL — what the
 * archive is, whose voices live in it, who's stewarding it, and how the
 * AI-augmented pipeline works without rewriting what was spoken.
 *
 * Voice notes:
 *   - Echoes the existing site-wide phrases ("citation-first preview mode",
 *     "authentic Atlanta voices", "preserve, don't censor") so listeners
 *     arriving from the AI advisory, PreviewHero, or Contact page hear the
 *     same editorial voice.
 *   - PRD §5 vision line — "These are not 'old' stories. They are from our
 *     elders. They are a light to guide today's Atlanta..." — anchors the
 *     Vision card verbatim so the platform's stated purpose stays visible
 *     on its public identity page.
 *
 * Design intent: sibling of `/browse`, `/map`, `/contact`, and
 * `<PreviewHero />`. Same `max-w-7xl` shell, mono-eyebrow + `font-heading`
 * hero, `rounded-xl border bg-card/XX` card vocabulary, portrait-band
 * accent rules, mono `NN · Count` section tails.
 */

export const metadata: Metadata = {
  title: "About · livingATL",
  description:
    "livingATL opens the Living Atlanta oral history collection (1914–1977): 500+ recordings from the people who lived the city. It also builds the room for Atlantans to keep recording alongside them. Citation-first. Preserve, don't censor.",
};

function buildStats(
  processedRecordings: number,
  distinctInterviewees: number,
): Array<{ label: string; value: string; tail: string }> {
  return [
    {
      label: "Processed",
      value: `${processedRecordings} / ${distinctInterviewees}`,
      tail: "recordings · distinct storytellers",
    },
    {
      label: "Collection",
      value: "500+",
      tail: "recordings waiting to be heard",
    },
    {
      label: "Era",
      value: "1914–1977",
      tail: "Living Atlanta tapes",
    },
  ];
}

type Principle = {
  index: string;
  label: string;
  heading: string;
  body: string;
  accent: string;
};

const PRINCIPLES: Principle[] = [
  {
    index: "01",
    label: "Editorial stance",
    heading: "Preserve, don't censor.",
    body: "We do not edit the historical record to make it more comfortable for the present. Recordings play exactly as they were spoken, including language specific to the speaker's decade. A preventive advisory frames sensitive passages before playback, so a listener is prepared, not protected from what was actually said.",
    accent: "bg-primary",
  },
  {
    index: "02",
    label: "Citation-first",
    heading: "Every answer traces back.",
    body: "Every summary, every chapter, every semantic-search result links to source audio with timecodes. No fabricated quotes. No impersonation. If a claim cannot be cited back to the tape, it is not made.",
    accent: "bg-amber-500/80",
  },
  {
    index: "03",
    label: "Human before publishing",
    heading: "AI assists. People ship.",
    body: "Every low-confidence transcript and every sensitivity-flagged passage sits in a review queue until a human reviewer signs it off. Automation carries the volume. The editorial call is never automated.",
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
    label: "Interactive Timeline",
    heading: "Walk the decades.",
    body: "Move through 1914–1977 along a scrubbable timeline. Storyteller-authored moments surface as dots. Tap one and you're inside the tape at that beat.",
    icon: ClockIcon,
    iconAccent: "bg-primary/10 text-primary/80",
  },
  {
    label: "AI Portal",
    heading: "Ask the archive.",
    body: "A citation-first conversational interface over the full collection. Every answer cites the recording, the speaker, and the timecode it came from. No fabricated quotes.",
    icon: SparklesIcon,
    iconAccent: "bg-amber-500/10 text-amber-700/80 dark:text-amber-400/80",
  },
  {
    label: "Podcast",
    heading: "The archive, on the air.",
    body: "Curated audio episodes drawn straight from the tapes. Themes, neighborhoods, and storyteller arcs threaded together with light editorial framing and full citations back to the source recordings.",
    icon: PodcastIcon,
    iconAccent: "bg-teal-500/10 text-teal-700/80 dark:text-teal-400/80",
  },
];

export default async function AboutPage() {
  const { processedRecordings, distinctInterviewees } =
    await fetchArchiveStats();
  const STATS = buildStats(processedRecordings, distinctInterviewees);
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 lg:gap-12 lg:py-14">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div aria-hidden className="h-1.5 w-20 rounded-full bg-primary" />
          <p className="font-mono text-xs tracking-[0.22em] uppercase text-muted-foreground">
            About · livingATL
          </p>
        </div>
        <h1 className="font-heading text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          Atlanta&rsquo;s oral history, carried forward through the voices
          of those who lived it.
        </h1>
      </header>

      <section aria-label="At a glance" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            At a glance
          </p>
          <p className="font-mono text-[11px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
            03 · Data points
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STATS.map((s) => (
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

      <section aria-label="Vision" className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1.9fr] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div aria-hidden className="h-1.5 w-20 rounded-full bg-primary" />
            <p className="font-mono text-xs tracking-[0.22em] uppercase text-muted-foreground">
              Vision · §5
            </p>
          </div>
          <blockquote className="font-heading text-2xl leading-[1.15] font-bold tracking-tight text-foreground sm:text-3xl lg:text-xl lg:leading-snug xl:text-2xl">
            &ldquo;These are not &lsquo;old&rsquo; stories. They are from our
            elders. They are{" "}
            <span className="text-primary">
              a light to guide today&apos;s Atlanta
            </span>{" "}
            toward the future its communities want to build.&rdquo;
          </blockquote>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div aria-hidden className="h-1.5 w-20 rounded-full bg-amber-500/80" />
            <p className="font-mono text-xs tracking-[0.22em] uppercase text-muted-foreground">
              What we&apos;re building
            </p>
          </div>
          <h2 className="font-heading text-xl leading-snug font-semibold tracking-tight text-foreground/85 sm:text-2xl lg:text-lg xl:text-xl">
            The archive is the opening move. Around it we are building the
            room where those elder voices meet the Atlantans coming after
            them, where a 1970s WRFG tape and a recording made next month
            sit on the{" "}
            <span className="text-amber-700 dark:text-amber-400">
              same shelf
            </span>
            , tagged to the same neighborhoods, answering the same
            questions.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            The collection stays free, ad-free, and citation-first. Every
            AI-synthesized summary, chapter, and search answer points back
            to source audio with timecodes. No fabricated quotes. No
            impersonation. No paraphrase standing in for the tape.
          </p>
        </div>
      </section>

      <section aria-label="Why this archive matters" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div aria-hidden className="h-1.5 w-20 rounded-full bg-foreground/70" />
          <p className="font-mono text-xs tracking-[0.22em] uppercase text-muted-foreground">
            Why this archive
          </p>
        </div>
        <p className="text-base leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Living Atlanta</span>{" "}
          is a radio oral history of the city between 1914 and 1977: more
          than 500 interviews WRFG recorded in the mid-to-late 1970s,
          broadcast on Radio Free Georgia in the early 1980s, and entrusted
          to the Atlanta History Center, which digitized the tapes in the
          late 1990s. It is, quietly, one of the most complete first-person
          portraits of 20th-century Atlanta in existence. For the decades
          since, it has sat in a reading room, cited by historians,
          heard by almost no one. livingATL is opening it: searchable,
          listenable, neighborhood-mapped, and fully cited back to tape.
          Not a word rewritten. The people in these recordings are mostly
          gone. Their grandchildren are not.
        </p>
      </section>

      <section aria-label="Editorial principles" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            Principles
          </p>
          <p className="font-mono text-[11px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
            03 · Editorial stance
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li key={p.label} className="flex">
              <article className="relative flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5">
                <div
                  aria-hidden
                  className={cn("h-1 w-12 rounded-full", p.accent)}
                />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                    {p.label}
                  </p>
                  <p className="font-mono text-[10px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/60">
                    {p.index}
                  </p>
                </div>
                <h3 className="font-heading text-xl font-semibold leading-tight tracking-tight">
                  {p.heading}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {p.body}
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
            return (
              <li key={s.label} className="flex">
                <Link
                  href={s.href}
                  className="group flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-foreground/30 hover:bg-card/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
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
                    <ArrowUpRightIcon
                      aria-hidden
                      className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                    />
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
                </Link>
              </li>
            );
          })}
          {PLACEHOLDERS.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.label} className="flex">
                <article
                  aria-disabled="true"
                  className="flex h-full w-full flex-col gap-4 rounded-xl border border-dashed border-border bg-card/30 p-5"
                >
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

      <section
        aria-label="Stewardship handoff"
        className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card/40 p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
      >
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            Stewardship
          </p>
          <h2 className="font-heading text-xl font-semibold leading-tight tracking-tight">
            Stewarded by WRFG, the Atlanta History Center, and Creative
            Context Studio.
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            Read more about the partners, and about the sponsorship,
            partnership, and volunteer-reviewer tracks the archive is
            actively opening, on the Contact page.
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-background/80 px-4 py-2 font-mono text-[10px] tracking-[0.22em] uppercase text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:self-center"
        >
          Contact
          <ArrowUpRightIcon aria-hidden className="size-3.5" />
        </Link>
      </section>

      <section aria-label="How the platform was built" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            How it&apos;s built
          </p>
          <p className="font-mono text-[11px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
            04 · Pipeline stages
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              step: "01",
              label: "Could the audio leak.",
              body: "Whisper transcribes the tapes locally on Apple Metal. No third-party API. No cloud trip for the audio. The recordings never leave a reviewer's machine until a human decides they're ready.",
            },
            {
              step: "02",
              label: "Could the wrong voice get the wrong words.",
              body: "Speaker diarization (pyannote.audio) labels who is speaking when (interviewer versus interviewee), and carries voice identity across multi-clip recordings, so the storyteller stays the storyteller from start to finish.",
            },
            {
              step: "03",
              label: "Could the AI make something up.",
              body: "Claude reads each transcript and drafts chapters, themes, neighborhoods, and a preservation-first sensitivity review. Every field is a draft. A human approves each one before it reaches the archive.",
            },
            {
              step: "04",
              label: "Could a bad transcript ship.",
              body: "Low-confidence segments and flagged passages sit in a review queue until an assigned human reviewer signs them off. The public archive only ever sees recordings that have cleared that gate.",
            },
          ].map((s) => (
            <li key={s.step}>
              <article className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card/50 p-5">
                <p className="font-mono text-[10px] tabular-nums tracking-[0.22em] uppercase text-muted-foreground/60">
                  Stage {s.step}
                </p>
                <p className="font-heading text-base font-semibold leading-tight tracking-tight">
                  {s.label}
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {s.body}
                </p>
              </article>
            </li>
          ))}
        </ol>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No audio was altered. No transcript was rewritten. No spoken word
          was edited. AI carries the volume. A human signed every
          curatorial call before it reached you.
        </p>
      </section>
    </main>
  );
}
