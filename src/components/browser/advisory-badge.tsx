import { Badge } from "@/components/ui/badge";
import type { ContentAdvisory } from "@/lib/queries/recordings";

/**
 * Pre-playback content-advisory indicator rendered on Browser cards.
 *
 * Editorial contract (PRD §7.1 + §8.5):
 * - Renders only when `content_advisory.display_advisory === true`.
 * - Short label is a fixed "Advisory" marker; the versioned long-form
 *   wording from `lib/content-advisory.ts` surfaces on the Player's
 *   pre-playback gate, not the card.
 * - Hover state shows the version identifier so reviewers can trace a badge
 *   back to a specific text.
 */
export function AdvisoryBadge({
  advisory,
}: {
  advisory: ContentAdvisory | null;
}) {
  if (!advisory?.display_advisory) return null;
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/10 px-2 text-[10px] font-semibold tracking-[0.14em] text-[color:var(--color-warning)] uppercase"
      title={`Advisory: ${advisory.advisory_version ?? "current"}`}
    >
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full bg-[color:var(--color-warning)]"
      />
      Advisory
    </Badge>
  );
}
