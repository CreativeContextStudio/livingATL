import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/cards/print-button";
import { requireArchiveAccess } from "@/lib/access-request";
import { safeDecodeCatalog } from "@/lib/player";
import {
  storyCardsForPath,
  storyCardsForRecording,
  type StoryCard,
} from "@/lib/queries/story-cards";
import { siteUrl } from "@/lib/site-url";
import { attributionLine } from "@/lib/story-cards";

/**
 * Printable story cards — PRD §7.6 template mode, first cut (F-story).
 * `/cards?path=<slug>` or `/cards?recording=<catalog>`. Four cards per US
 * Letter page; each carries the narrator's own (machine-transcribed) words,
 * who/where/when, a QR code to that exact clip, and the required
 * "generated from stories by …" attribution plus the collection credit, so
 * a card cut from the sheet still stands on its own.
 */
export const metadata: Metadata = {
  title: "Story cards · livingATL",
  robots: { index: false, follow: false },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireArchiveAccess();
  const params = await searchParams;
  const pathSlug = first(params.path);
  const recording = first(params.recording);
  const catalog = recording ? safeDecodeCatalog(recording) : null;
  const set = pathSlug
    ? await storyCardsForPath(pathSlug)
    : catalog
      ? await storyCardsForRecording(catalog)
      : null;
  if (!set || set.cards.length === 0) notFound();
  const host = siteUrl().host;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 print:max-w-none print:p-0">
      <header className="flex flex-col gap-3 print:hidden">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          Story cards
        </p>
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">{set.heading}</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {set.cards.length} cards, four to a letter-size page. Print, then cut along the dashed
          lines. Each card&apos;s QR code opens that moment in the recording.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <PrintButton />
          <Link href={set.backHref} className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
            Back
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">{attributionLine(set.speakers)}.</p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
        {set.cards.map((card) => (
          <li key={card.key} className="flex break-inside-avoid">
            <Card card={card} host={host} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function Card({ card, host }: { card: StoryCard; host: string }) {
  const meta = [card.place, card.era].filter(Boolean).join(" · ");
  return (
    <article className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-5 text-foreground print:h-[4.85in] print:rounded-none print:border-dashed print:border-neutral-400 print:bg-white print:p-[0.3in] print:text-black">
      <p className="flex items-baseline justify-between gap-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground print:text-neutral-600">
        <span className="font-heading text-sm font-bold normal-case tracking-tight text-foreground print:text-black">
          living<span className="text-primary-ink print:text-black">ATL</span>
        </span>
        <span>Living Atlanta oral histories</span>
      </p>
      <h2 className="font-heading text-sm font-semibold leading-snug">{card.title}</h2>
      <blockquote className="font-heading text-[15px] leading-relaxed print:text-[12pt]">
        <p className="line-clamp-6">&ldquo;{card.quote}&rdquo;</p>
        <footer className="mt-2 text-sm font-semibold not-italic">
          — {card.speaker}
          {card.recorded ? <span className="font-normal text-muted-foreground print:text-neutral-700">, recorded {card.recorded}</span> : null}
        </footer>
      </blockquote>
      {meta ? <p className="text-xs text-muted-foreground print:text-neutral-700">{meta}</p> : null}
      {card.notice ? (
        <p className="text-[11px] font-medium text-[color:var(--color-warning-ink)] print:text-black">
          Content notice: {card.notice}. Presented as spoken.
        </p>
      ) : null}
      <div className="mt-auto flex items-end gap-3">
        <div
          role="img"
          aria-label={`QR code linking to ${card.speaker}, ${card.range}`}
          className="size-24 shrink-0 bg-white p-1 print:size-[1.05in] [&_svg]:size-full"
          // SVG produced server-side by `qrcode` from our own URL.
          dangerouslySetInnerHTML={{ __html: card.qrSvg }}
        />
        <div className="flex min-w-0 flex-col gap-1 text-[10px] leading-snug text-muted-foreground print:text-neutral-700">
          <p className="font-medium text-foreground print:text-black">Scan to hear it in their voice</p>
          <p className="break-all font-mono">
            {host} · {card.catalogNumber} · {card.range}
          </p>
          <p>Machine transcript; may contain errors.</p>
          <p>
            {attributionLine([card.speaker])}. Living Atlanta collection, WRFG / Atlanta History
            Center, CC BY-NC-ND 4.0.
          </p>
        </div>
      </div>
    </article>
  );
}
