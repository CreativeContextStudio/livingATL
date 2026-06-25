import { ArrowUpRightIcon } from "lucide-react";

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
 * vocabulary; extended with a stats rail, a partner strip, and an invite
 * note so the front door carries more presence than the other pages.
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
      tail: "Recorded late 1970s · digitized late 1990s",
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

export type PreviewHeroProps = {
  processedRecordings: number;
  distinctInterviewees: number;
};

export function PreviewHero({
  processedRecordings,
  distinctInterviewees,
}: PreviewHeroProps) {
  const stats = buildStats(processedRecordings, distinctInterviewees);

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
          Between 1914 and 1977, Atlanta lived through the decades that made
          it. In the mid-to-late 1970s, WRFG&apos;s{" "}
          <span className="font-medium text-foreground">Living Atlanta</span>{" "}
          series sat the city down at microphones and recorded what its
          people had lived through. More than 500 conversations, preserved
          by the Atlanta History Center and digitized in the late 1990s.
          livingATL opens that collection: searchable, listenable, and
          mapped to the neighborhoods, years, and movements its speakers
          shaped.
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

      <section
        aria-label="Invite access"
        className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card/40 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            Invite required
          </p>
          <p className="text-base leading-relaxed text-foreground/90">
            Have a personal link? Open it to step inside the preview.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground sm:self-center">
          <span>Public launch</span>
          <ArrowUpRightIcon aria-hidden className="size-3.5" />
          <span>Phase 2</span>
        </div>
      </section>
    </main>
  );
}
