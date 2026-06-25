"use client";

import { AlertTriangleIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { humanCategory, humanSeverity } from "@/lib/player";
import { cn } from "@/lib/utils";
import type { FlaggedSpan } from "@/lib/queries/player";

/**
 * Inline marker shown on the first transcript segment that overlaps a
 * flagged span (PRD §7.2 + §8.5). Does not block playback — it's a
 * heads-up so listeners can pause before the flagged passage.
 *
 * Visual weight scales with `severity` so `graphic` / `gratuitous` read
 * stronger than `historical_quotation`. The pipeline produces four-tier
 * severity; the UI should reflect it.
 *
 * Editorial contract (§8.5): preserve the recording as spoken. This
 * marker is framing, not censorship.
 */
function severityWeight(severity: string | undefined | null): {
  bg: string;
  hoverBg: string;
  border: string;
} {
  switch (severity) {
    case "gratuitous":
      return {
        bg: "bg-[color:var(--color-warning)]/35",
        hoverBg: "hover:bg-[color:var(--color-warning)]/50",
        border: "border border-[color:var(--color-warning)]/60",
      };
    case "graphic":
      return {
        bg: "bg-[color:var(--color-warning)]/25",
        hoverBg: "hover:bg-[color:var(--color-warning)]/40",
        border: "border border-[color:var(--color-warning)]/50",
      };
    case "narrative":
      return {
        bg: "bg-[color:var(--color-warning)]/15",
        hoverBg: "hover:bg-[color:var(--color-warning)]/25",
        border: "border border-transparent",
      };
    case "historical_quotation":
    default:
      return {
        bg: "bg-[color:var(--color-warning)]/10",
        hoverBg: "hover:bg-[color:var(--color-warning)]/20",
        border: "border border-transparent",
      };
  }
}

export function SensitivityMarker({ span }: { span: FlaggedSpan }) {
  const weight = severityWeight(span.severity);
  return (
    <TooltipProvider delay={120}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={`Content notice: ${humanCategory(span.category)}`}
              className={cn(
                "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[color:var(--color-warning)] transition-[background]",
                weight.bg,
                weight.hoverBg,
                weight.border,
              )}
            >
              <AlertTriangleIcon className="size-2.5" />
            </button>
          }
        />
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex flex-col gap-1 text-left">
            <span className="font-heading text-xs font-semibold">
              {humanCategory(span.category)}
            </span>
            {span.severity ? (
              <span className="text-[11px] text-background/70">
                {humanSeverity(span.severity)}
              </span>
            ) : null}
            <span className="text-[11px] text-background/60">
              Heads-up: playback continues as recorded.
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
