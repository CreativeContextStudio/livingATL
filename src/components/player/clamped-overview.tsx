"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The recording overview on the Player page. On phones the full text is a
 * screen tall and pushed the transport far below the fold, so it's clamped
 * to three lines with a Read more toggle; from `sm` up it's always shown in
 * full and the toggle is hidden.
 */
export function ClampedOverview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-2 flex flex-col items-start gap-1">
      <p
        id="recording-overview"
        className={cn(
          "text-sm leading-relaxed text-foreground/85",
          !expanded && "line-clamp-3 sm:line-clamp-none",
        )}
      >
        {text}
      </p>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="recording-overview"
        onClick={() => setExpanded((v) => !v)}
        className="min-h-11 text-sm font-medium text-primary-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}
