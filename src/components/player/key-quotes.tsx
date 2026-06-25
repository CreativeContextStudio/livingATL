"use client";

import { useState } from "react";
import { ChevronDownIcon, QuoteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/player";
import { cn } from "@/lib/utils";
import type { KeyQuote } from "@/lib/queries/player";
import { usePlayerControls } from "./player-context";

/**
 * Key quotes — PRD §7.2. Curated pull-quotes with jump-links to the
 * exact moment in audio. Each quote has `text`, optional `context`,
 * and `start_time` / `end_time`.
 *
 * Two layers of accordion:
 * - the whole section collapses via the header (closed by default)
 * - each quote's `context` paragraph collapses via a per-quote
 *   "Show details" toggle (closed by default). The quote text and
 *   the jump-to-timestamp button stay visible regardless.
 */
export function KeyQuotesList({ quotes }: { quotes: KeyQuote[] }) {
  const { seek } = usePlayerControls();
  const [sectionOpen, setSectionOpen] = useState(false);
  const [openDetails, setOpenDetails] = useState<Set<number>>(() => new Set());
  if (quotes.length === 0) return null;

  const toggleDetail = (i: number) => {
    setOpenDetails((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="flex shrink-0 flex-col gap-3 rounded-xl border border-border bg-card/40 p-5">
      <button
        type="button"
        onClick={() => setSectionOpen((v) => !v)}
        aria-expanded={sectionOpen}
        aria-controls="key-quotes-list"
        className="flex items-baseline justify-between gap-3 rounded-sm text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <span className="flex items-center gap-2">
          <ChevronDownIcon
            aria-hidden
            className={cn(
              "size-3.5 text-muted-foreground transition-transform duration-200",
              sectionOpen ? "rotate-0" : "-rotate-90",
            )}
          />
          <h3 className="font-heading text-xs font-semibold tracking-[0.14em] uppercase">
            Key quotes
          </h3>
        </span>
        <p className="font-mono text-[11px] text-muted-foreground">
          {quotes.length}
        </p>
      </button>
      {sectionOpen ? (
        <ol id="key-quotes-list" className="flex flex-col gap-4">
          {quotes.map((q, i) => {
            const detailOpen = openDetails.has(i);
            return (
              <li key={i} className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <QuoteIcon
                    aria-hidden
                    className="mt-1 size-3.5 shrink-0 text-primary/60"
                  />
                  <blockquote className="text-sm leading-relaxed italic text-foreground/90">
                    &ldquo;{q.text}&rdquo;
                  </blockquote>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => seek(q.start_time)}
                    className="gap-1.5 font-mono text-[10px] tabular-nums"
                    aria-label={`Jump to ${formatTimestamp(q.start_time)}`}
                  >
                    <span>▶</span>
                    <span>{formatTimestamp(q.start_time)}</span>
                  </Button>
                  {q.context ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => toggleDetail(i)}
                      aria-expanded={detailOpen}
                      aria-controls={`key-quote-${i}-detail`}
                      className="gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDownIcon
                        aria-hidden
                        className={cn(
                          "size-3 transition-transform duration-200",
                          detailOpen ? "rotate-0" : "-rotate-90",
                        )}
                      />
                      <span>{detailOpen ? "Hide details" : "Show details"}</span>
                    </Button>
                  ) : null}
                </div>
                {q.context && detailOpen ? (
                  <p
                    id={`key-quote-${i}-detail`}
                    className="pl-5 text-xs leading-relaxed text-muted-foreground"
                  >
                    {q.context}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
