"use client";

import Link from "next/link";
import { FlagIcon } from "lucide-react";

import { reportHref } from "@/lib/reports";
import { usePlayerTime } from "./player-context";

/**
 * "Report or request a correction" — opens the /contact report form
 * (F-report) prefilled with this recording and the current playhead, so a
 * correction arrives pinned to the moment it's about.
 */
export function ReportLink({ catalogNumber }: { catalogNumber: string }) {
  const seconds = usePlayerTime((t) => Math.floor(t));
  return (
    <Link
      href={reportHref({ catalogNumber, seconds })}
      className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <FlagIcon aria-hidden className="size-3.5" />
      Report or request a correction
    </Link>
  );
}
