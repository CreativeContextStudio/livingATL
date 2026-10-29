import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { fetchArchiveStatsOrNull } from "@/lib/queries/recordings";

/**
 * About page — what the collection is, how livingATL presents it, how the
 * transcripts and tags are made, and who is behind it.
 *
 * Copy rules (2026-10-29 rewrite): plain and brief; state only what is
 * true today. WRFG recorded and digitized the tapes; the Atlanta History
 * Center houses the collection. AI drafts, the project team reviews — no
 * absolute promises about review.
 *
 * Design: sibling of `/browse`, `/contact` and `<PreviewHero />` — same
 * `max-w-7xl` shell, mono eyebrow + `font-heading` hero, `rounded-xl
 * border bg-card/XX` cards with short accent rules.
 */

export const metadata: Metadata = {
  title: "About · livingATL",
  description:
    "livingATL puts WRFG's Living Atlanta interviews online: Atlantans recorded in the late 1970s, telling stories of the city from 1914 to 1977.",
};

const PRINCIPLES: Array<{ heading: string; body: string; accent: string }> = [
  {
    heading: "Presented as spoken",
    body: "Recordings are not edited. They include the language of their time. Where a recording has difficult material, a short note comes before it plays.",
    accent: "bg-primary",
  },
  {
    heading: "Linked to the source",
    body: "Chapters, summaries, and Portal answers point to the place in the recording they come from, so you can hear it for yourself.",
    accent: "bg-amber-500/80",
  },
  {
    heading: "AI helps, people review",
    body: "AI drafts transcripts, chapters, and topic tags, and the project team reviews them. Transcripts can still contain errors. If you find one, please tell us.",
    accent: "bg-teal-500/80",
  },
];

const STEPS: Array<{ label: string; body: string }> = [
  {
    label: "Transcribe",
    body: "Speech-recognition software (Whisper) turns each recording into a transcript. It runs on the project's own computers.",
  },
  {
    label: "Separate the speakers",
    body: "Software tells the interviewer's voice apart from the storyteller's, so each line is attributed to the right person.",
  },
  {
    label: "Add chapters and tags",
    body: "An AI model (Claude) reads the transcript and drafts chapters, summaries, places, and topics, and marks passages that need a content note.",
  },
  {
    label: "Review",
    body: "The project team checks the drafts and fixes what it finds. Corrections from listeners come in through the Contact page.",
  },
];

export default async function AboutPage() {
  const stats = await fetchArchiveStatsOrNull();
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 lg:gap-12 lg:py-14">
      <header className="flex max-w-3xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <div aria-hidden className="h-1.5 w-20 rounded-full bg-primary" />
          <p className="font-mono text-xs tracking-[0.22em] uppercase text-muted-foreground">
            About
          </p>
        </div>
        <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          A public home for the Living Atlanta interviews
        </h1>
      </header>

      <section aria-label="The recordings" className="flex max-w-3xl flex-col gap-4 text-base leading-relaxed text-foreground/85">
        <p>
          In the late 1970s, WRFG (Radio Free Georgia, 89.3 FM) recorded more
          than 500 interviews for its{" "}
          <span className="font-medium text-foreground">Living Atlanta</span>{" "}
          series. Atlantans described the city they knew from 1914 to 1977:
          their neighborhoods, jobs, churches, and schools, and life under
          segregation. WRFG aired the series in the early 1980s and later
          digitized the tapes. The Atlanta History Center houses the
          collection.
        </p>
        <p>
          livingATL puts the interviews online with transcripts, chapters, and
          maps, so anyone can find them and listen.{" "}
          {stats
            ? `${stats.processedRecordings} recordings from ${stats.distinctInterviewees} storytellers are online so far; more are added as they are prepared.`
            : "More recordings are added as they are prepared."}
        </p>
      </section>

      <section aria-label="How we present the recordings" className="flex flex-col gap-4">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          How we present them
        </p>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li key={p.heading} className="flex">
              <article className="flex h-full w-full flex-col gap-3 rounded-xl border border-border bg-card/60 p-5">
                <div aria-hidden className={cn("h-1 w-12 rounded-full", p.accent)} />
                <h2 className="font-heading text-lg font-semibold leading-tight tracking-tight">
                  {p.heading}
                </h2>
                <p className="text-sm leading-relaxed text-foreground/80">{p.body}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="How it's made" className="flex flex-col gap-4">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          How it&apos;s made
        </p>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <article className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card/50 p-5">
                <p className="font-mono text-[10px] tabular-nums tracking-[0.22em] uppercase text-muted-foreground">
                  Step {i + 1}
                </p>
                <h3 className="font-heading text-base font-semibold leading-tight tracking-tight">
                  {s.label}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/80">{s.body}</p>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-label="Who's behind it"
        className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card/40 p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
      >
        <div className="flex max-w-3xl flex-col gap-2">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            Who&apos;s behind it
          </p>
          <p className="text-sm leading-relaxed text-foreground/85">
            WRFG recorded and digitized the interviews. The Atlanta History
            Center houses the collection. Creative Context Studio designed and
            built livingATL. Questions, corrections, or want to help? Get in
            touch.
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-background/80 px-4 py-2 font-mono text-[10px] tracking-[0.22em] uppercase text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-center"
        >
          Contact
          <ArrowUpRightIcon aria-hidden className="size-3.5" />
        </Link>
      </section>
    </main>
  );
}
