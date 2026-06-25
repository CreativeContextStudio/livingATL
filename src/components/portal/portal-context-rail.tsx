import Link from "next/link";
import {
  ArrowUpRightIcon,
  HistoryIcon,
  LibraryIcon,
  MapIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Portal context rail — left column of the Portal page.
 *
 * Companion to the chat workspace on the right. Visual register matches the
 * Player's `MetadataSidebar` + `PreviewHero`'s stats rail + the "About this
 * recording" card on the Player page: mono-eyebrow labels, small-caps
 * uppercase tracking, `font-heading` numerals, `rounded-xl border border-border
 * bg-card/40` container, primary accent stripe for hierarchy.
 *
 * Layout intent: the rail reads as "here's what you're actually asking" —
 * a collection span timeline, a three-tile at-a-glance row, a short
 * preservation note, and two outbound links into the sibling surfaces
 * (Browse / Map). At smaller sizes the stats stack vertically so the rail
 * stays legible on narrow viewports.
 *
 * Sibling components consulted for the aesthetic:
 *   - `src/components/player/metadata-sidebar.tsx` (sectioned `rounded-xl`
 *     card with mono-uppercase section headings)
 *   - `src/components/preview-hero.tsx` (stats rail with `At a glance`
 *     eyebrow + `NN · Data points` tabular-nums tail)
 *   - `src/app/player/[catalog]/page.tsx::AboutThisRecording` (compact
 *     editorial card with uppercase eyebrow and mt-auto footer rule)
 */
export function PortalContextRail() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header: breadcrumb + eyebrow stripe + compact two-tier hero. */}
      <div className="flex flex-col gap-4">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground"
        >
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/"
                className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                livingATL
              </Link>
            </li>
            <li aria-hidden className="text-muted-foreground/60">
              /
            </li>
            <li aria-current="page" className="text-foreground">
              Portal
            </li>
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <div aria-hidden className="h-1.5 w-16 rounded-full bg-primary" />
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
            Ask the archive
          </p>
        </div>

        <h1 className="font-heading text-2xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-3xl">
          Fifty years of Atlanta voices, answering back.
        </h1>

        <p className="text-sm leading-relaxed text-foreground/80">
          Ask about a person, a neighborhood, an era, an event. The Portal
          answers from the Living Atlanta oral history collection and cites
          the recordings and timestamps it drew from. If the archive
          doesn&rsquo;t cover your question, it will say so.
        </p>
      </div>

      {/* Collection span — horizontal ruler with year anchors, a single
          peach tick for the WRFG broadcast origin band (mid-to-late 1970s),
          and a faint progress fill. Reads as "here's the temporal shape of
          what the archive knows about." */}
      <CollectionSpan />

      {/* At a glance — three compact stat tiles. Same visual grammar as
          preview-hero's stats rail but sized for a sidebar: smaller value
          type, smaller padding, two-column on narrow widths so they fit
          under the hero without overflowing. */}
      <AtAGlance />

      {/* Citation-first preservation note. Editorial voice, short. Paired
          accent stripe echoes the top of the rail so the rail frames itself
          with matching bookends. */}
      <EditorialNote />

      {/* Keep exploring — restyled outbound links to Browse + Map. Icon
          + two-line card each so they feel editorial, not like orphan
          chip buttons at the bottom of a `<dl>`. */}
      <KeepExploring />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function CollectionSpan() {
  // Broadcast-band bounds against the 1914–1977 span. 1976 is Living Atlanta's
  // principal production year per PRD §1; 1979 is a conservative tail for the
  // "mid-to-late 70s" framing. These drive the visual band only — the actual
  // archive span is the label row.
  const SPAN_START = 1914;
  const SPAN_END = 1977;
  const BROADCAST_START = 1976;
  const BROADCAST_END = 1979;
  const clamp = (year: number) =>
    Math.max(
      0,
      Math.min(
        100,
        ((year - SPAN_START) / (SPAN_END - SPAN_START)) * 100,
      ),
    );
  const broadcastLeft = clamp(BROADCAST_START);
  const broadcastWidth = clamp(BROADCAST_END) - broadcastLeft;

  return (
    <section
      aria-label="Collection span"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          The tapes
        </p>
        <p className="font-mono text-[10px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
          {SPAN_END - SPAN_START} years
        </p>
      </div>

      {/* Timeline bar — thin track, broadcast band in primary, end caps in
          foreground for skim-legibility. */}
      <div className="flex flex-col gap-2">
        <div
          role="img"
          aria-label={`Oral history span ${SPAN_START} to ${SPAN_END}, recorded around 1976`}
          className="relative h-1.5 w-full rounded-full bg-border/70"
        >
          <div
            aria-hidden
            className="absolute top-0 bottom-0 rounded-full bg-primary/80"
            style={{
              left: `${broadcastLeft}%`,
              width: `${Math.max(broadcastWidth, 1.5)}%`,
            }}
          />
          <div
            aria-hidden
            className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-foreground/80"
          />
          <div
            aria-hidden
            className="absolute top-1/2 right-0 size-2 -translate-x-0 -translate-y-1/2 rounded-full bg-foreground/80"
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>{SPAN_START}</span>
          <span className="text-muted-foreground/70">
            ↑ recorded mid-to-late 1970s
          </span>
          <span>{SPAN_END}</span>
        </div>
      </div>
    </section>
  );
}

type Stat = {
  label: string;
  value: string;
  tail: string;
};

const STATS: Stat[] = [
  {
    label: "Span",
    value: "1914–1977",
    tail: "Recorded late 1970s",
  },
  {
    label: "Voices",
    value: "100+",
    tail: "Distinct storytellers",
  },
  {
    label: "Guarantee",
    value: "Citation-first",
    tail: "Every claim links to tape",
  },
];

function AtAGlance() {
  return (
    <section aria-label="At a glance" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          At a glance
        </p>
        <p className="font-mono text-[10px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground/80">
          03 · Facts
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {STATS.map((s) => (
          <li key={s.label}>
            <article className="flex h-full flex-col gap-1 rounded-lg border border-border bg-card/50 p-3">
              <p className="font-mono text-[9px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                {s.label}
              </p>
              <p className="font-heading text-base font-semibold leading-tight tracking-tight text-foreground">
                {s.value}
              </p>
              <p className="font-mono text-[9px] tracking-[0.16em] uppercase text-muted-foreground/80">
                {s.tail}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EditorialNote() {
  return (
    <section
      aria-label="Editorial guarantee"
      className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-card/30 p-4"
    >
      <div className="flex items-center gap-2">
        <div aria-hidden className="h-1 w-10 rounded-full bg-foreground/70" />
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          No fabricated quotes
        </p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        The Portal only answers from transcripts it can cite. When the
        archive doesn&rsquo;t cover your question, it says so rather than
        guessing. Stewarded with WRFG and the Atlanta History Center.
      </p>
    </section>
  );
}

type ExploreLink = {
  href: string;
  label: string;
  tail: string;
  Icon: typeof LibraryIcon;
};

const EXPLORE: ExploreLink[] = [
  {
    href: "/browse",
    label: "Browse the collection",
    tail: "By person, neighborhood, theme, era",
    Icon: LibraryIcon,
  },
  {
    href: "/map",
    label: "Open the map",
    tail: "Atlanta, as its voices drew it",
    Icon: MapIcon,
  },
  {
    href: "/timeline",
    label: "Walk the timeline",
    tail: "A century of Atlanta, end to end",
    Icon: HistoryIcon,
  },
];

function KeepExploring() {
  return (
    <section aria-label="Keep exploring" className="flex flex-col gap-2">
      <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Keep exploring
      </p>
      <ul className="flex flex-col gap-2">
        {EXPLORE.map(({ href, label, tail, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5",
                "transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card/60 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-foreground"
              >
                <Icon className="size-3.5" strokeWidth={1.5} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-heading text-xs font-semibold leading-tight tracking-tight text-foreground">
                  {label}
                </span>
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                  {tail}
                </span>
              </span>
              <ArrowUpRightIcon
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
