import { AlertTriangleIcon } from "lucide-react";

import { humanCategory, humanSeverity, type ContentNote } from "@/lib/player";
import { cn } from "@/lib/utils";

/**
 * Content notice for a Portal citation whose excerpt overlaps a
 * steward-flagged passage (PRD §8.5, F-flagged). Same vocabulary and warning
 * colors as the Player's transcript `SensitivityMarker`. Framing, not
 * censorship: the excerpt and the link to the recording are unchanged.
 */
export function contentNoticeText(notes: ContentNote[]): string {
  return notes
    .map((n) => (n.severity ? `${humanCategory(n.category)} (${humanSeverity(n.severity).toLowerCase()})` : humanCategory(n.category)))
    .join(", ");
}

export function ContentNotice({ notes, className }: { notes: ContentNote[]; className?: string }) {
  if (notes.length === 0) return null;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-[11px] leading-snug text-[color:var(--color-warning-ink)]",
        className,
      )}
    >
      <AlertTriangleIcon aria-hidden className="mt-px size-3 shrink-0" />
      <span>
        <span className="font-semibold">Content note:</span> {contentNoticeText(notes)}
      </span>
    </p>
  );
}
