"use client";

import { AIAdvisoryLink } from "./ai-advisory-link";
import { FoldPanel } from "./fold-panel";

/**
 * Summary card — PRD §7.2. Surfaces the AI-generated summary
 * (`metadata_extracted.ai_summary`) for quick orientation before
 * committing to a full listen.
 *
 * Closed by default: it runs long, and the storyteller's own words come
 * first. Listeners reach it by scrolling past transcript + key quotes.
 */
export function AISummaryCard({
  summary,
  catalogNumber,
}: {
  summary: string | null;
  catalogNumber: string;
}) {
  if (!summary) return null;

  return (
    <FoldPanel title="Summary" aside="AI-drafted · awaiting review">
      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
        {summary}
      </p>
      <div>
        <AIAdvisoryLink catalogNumber={catalogNumber} />
      </div>
    </FoldPanel>
  );
}
