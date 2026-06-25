"use client";

import { SparklesIcon } from "lucide-react";

import { AIAdvisoryLink } from "./ai-advisory-link";

/**
 * Summary card — PRD §7.2. Surfaces the AI-generated summary
 * (`metadata_extracted.ai_summary`) for quick orientation before
 * committing to a full listen.
 *
 * Rendered inline in the right column. The column flows naturally and
 * the page is the scroll surface, so Summary just renders at content
 * height — no internal scroll, no flex absorption. Listeners reach it
 * by scrolling the page past transcript + key quotes.
 */
export function AISummaryCard({ summary }: { summary: string | null }) {
  if (!summary) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-3.5 text-muted-foreground" />
        <h3 className="font-heading text-xs font-semibold tracking-[0.14em] uppercase">
          Summary
        </h3>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
        {summary}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
          AI-generated · source transcript
        </p>
        <span
          aria-hidden
          className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground/70"
        >
          ·
        </span>
        <AIAdvisoryLink />
      </div>
    </div>
  );
}
