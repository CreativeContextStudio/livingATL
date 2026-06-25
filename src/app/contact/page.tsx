import type { Metadata } from "next";
import {
  CassetteTapeIcon,
  HandHeartIcon,
  HandshakeIcon,
  UsersRoundIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Contact page. The Player's AI-advisory dialog and the site footer both
 * point listeners here when they want to flag a miscategorized recording,
 * suggest a canonical name, question an AI-authored summary, or offer a
 * correction. The intake channel itself is still on the Phase 2 punch
 * list — this page is honest about that (the "Intake · Placeholder" card)
 * while introducing the three stewarding organizations so visitors know
 * whose hands the archive sits in.
 *
 * Design intent: a typographic sibling of `/browse` and `/map`. Same
 * `max-w-7xl` shell, same mono-eyebrow + heading + subhead header
 * pattern, same `rounded-xl border bg-card/XX` card vocabulary. The
 * partner cards echo the Player's portrait-band motif (short accent
 * rule over the org name) so the whole page feels like it belongs to
 * the rest of the site without introducing new visual grammar.
 */
export const metadata: Metadata = {
  title: "Contact · livingATL",
  description:
    "Reach the livingATL stewards (WRFG, Atlanta History Center, and Creative Context Studio) about the collection, the AI-augmented metadata, or anything that seems to undermine the goal of preserving authentic Atlanta voices.",
};

type Partner = {
  /** Two-digit label shown in the mono tail above the org name. */
  index: string;
  /** Short role label — the mono eyebrow on the card. */
  role: string;
  name: string;
  /** Longer descriptor shown under the org name in mono. */
  descriptor: string;
  body: string;
  /** Tailwind class for the accent rule at the top of the card. Matches
   *  the Player's portrait-band pattern. Kept deliberately muted so the
   *  three cards read as a set, not three competing brands. */
  accent: string;
};

type SupportTrack = {
  index: string;
  label: string;
  heading: string;
  body: string;
  cta: string;
  icon: LucideIcon;
  /** Muted accent for the icon chip — matches the Partner card palette so
   *  the two sections read as the same family. */
  accent: string;
};

const SUPPORT_TRACKS: SupportTrack[] = [
  {
    index: "01",
    label: "Org + brand partners",
    heading: "Extend the work",
    body: "Cultural institutions, universities, libraries, and mission-aligned brands who want to help the archive go further. Partners co-produce new collections alongside the Living Atlanta core, host classroom and community programs, underwrite research fellowships, and open distribution channels so the voices reach the neighborhoods and classrooms they belong to.",
    cta: "Partnership intake · Forthcoming",
    icon: HandshakeIcon,
    accent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  {
    index: "02",
    label: "Sponsorship",
    heading: "Underwrite the archive",
    body: "Sponsors cover transcription, diarization, LLM + agentic review, API + token usage, hosting, and subscription costs that keep the archive online. Every dollar processes the next recording in the queue. No advertising, no paywalls, no lock-in. Sponsor credit lives in a dedicated acknowledgments page; the collection stays free, ad-free, and citation-first.",
    cta: "Sponsorship kit · Forthcoming",
    icon: HandHeartIcon,
    accent: "bg-primary/15 text-primary",
  },
  {
    index: "03",
    label: "Volunteer reviewers",
    heading: "Queue up for human review",
    body: "Historians, archivists, and community members review AI-augmented transcripts and metadata before anything goes public. Low-confidence chunks and flagged sensitive passages sit in a queue that only ships after a human signs off. We're building the reviewer cohort now.",
    cta: "Reviewer signup · Forthcoming",
    icon: UsersRoundIcon,
    accent: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  },
  {
    index: "04",
    label: "Creatives and Artists",
    heading: "Make new work with the tape",
    body: "Musicians, filmmakers, writers, designers, coders, and installation artists. livingATL collaborates with and commissions creators responding to the archive. Audio documentaries, place-based installations, editorial features, visual essays, code-based experiments: if a story in the collection sparks a piece, we want to make it together.",
    cta: "Commissions intake · Forthcoming",
    icon: CassetteTapeIcon,
    accent: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  },
];

const PARTNERS: Partner[] = [
  {
    index: "01",
    role: "Broadcast partner",
    name: "WRFG",
    descriptor: "Radio Free Georgia · 89.3 FM",
    body: "Atlanta's community radio station. The Living Atlanta oral history series was recorded in the mid-to-late 1970s and aired on WRFG in the early 1980s; every recording in this archive began on its tapes, reels, and field cassettes.",
    accent: "bg-primary",
  },
  {
    index: "02",
    role: "Archive steward",
    name: "Atlanta History Center",
    descriptor: "Kenan Research Center",
    body: "Steward of the original Living Atlanta tapes, catalog metadata, and accompanying papers. The Center digitized the reel-to-reel masters in the late 1990s; livingATL builds on that preservation work. The audio, the catalog numbers, and the finding aids all come from its collection.",
    accent: "bg-amber-500/80",
  },
  {
    index: "03",
    role: "Design + build",
    name: "Creative Context Studio",
    descriptor: "Platform partner",
    body: "Designed and built the livingATL platform (transcription pipeline, player, and AI-assisted metadata layer) in partnership with WRFG and the Atlanta History Center.",
    accent: "bg-teal-500/80",
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 lg:py-14">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          Contact · Stewardship
        </p>
        <h1 className="font-heading text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          Reach the stewards
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          livingATL is assembled and maintained by three partners. A proper
          intake channel, for miscategorizations, canonical-name corrections,
          feedback on AI-authored summaries, and community contributions,
          lands in Phase 2. In the meantime, the organizations below hold the
          ground truth for the collection.
        </p>
      </header>

      <section
        aria-label="Intake status"
        className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-card/40 p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
      >
        <div className="flex flex-1 flex-col gap-2">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
            Intake · Placeholder
          </p>
          <h2 className="font-heading text-xl font-semibold leading-tight tracking-tight">
            A proper contact channel is on the way.
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            If you have feedback on a specific recording today, note its
            catalog number (visible in the URL and on every card) and hold
            onto it. We&apos;ll post a formal address here once the editorial
            review loop is wired up.
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse"
            />
            In build
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            Partners
          </p>
          <p className="font-mono text-[11px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
            03 · Organizations
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PARTNERS.map((p) => (
            <li key={p.name} className="flex">
              <article className="relative flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5">
                {/* Portrait-band accent rule — short, muted, echoes the
                    Player page's theme-accent tail so the partner cards
                    feel like they belong to the same family. */}
                <div
                  aria-hidden
                  className={cn("h-1 w-12 rounded-full", p.accent)}
                />

                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                    {p.role}
                  </p>
                  <p className="font-mono text-[10px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/60">
                    {p.index}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="font-heading text-xl font-semibold leading-tight tracking-tight">
                    {p.name}
                  </h3>
                  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground/80">
                    {p.descriptor}
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-foreground/80">
                  {p.body}
                </p>

                <div className="mt-auto border-t border-border/70 pt-3">
                  <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                    Link · Forthcoming
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Support livingATL" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            Support
          </p>
          <p className="font-mono text-[11px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
            04 · Ways to contribute
          </p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          livingATL is actively seeking partners, sponsors, volunteer reviewers, and creative collaborators. The recordings and briefs are not accessible until they clear human review.
        </p>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SUPPORT_TRACKS.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.label} className="flex">
                <article className="relative flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
                        t.accent,
                      )}
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <p className="font-mono text-[10px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/60">
                      {t.index}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                      {t.label}
                    </p>
                    <h3 className="font-heading text-xl font-semibold leading-tight tracking-tight">
                      {t.heading}
                    </h3>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground/80">
                    {t.body}
                  </p>

                  <div className="mt-auto border-t border-border/70 pt-3">
                    <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                      {t.cta}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
