"use client";

import { cn } from "@/lib/utils";

/**
 * Interactive Timeline — detail tether.
 *
 * A thin vertical rule that rises from (or descends to) the selected
 * marker's x-coordinate inside the canvas. Gives the folio above a
 * spatial anchor so the user never loses track of which dot they're
 * reading.
 *
 * Positioning math mirrors `xPercent` from `timeline-client.tsx`.
 * Rendered inside the canvas card so it naturally clips at the edges,
 * and sits behind markers via z-index so hover detection stays intact.
 */

function xPercent(year: number, yearRange: [number, number]): number {
  const [min, max] = yearRange;
  if (max === min) return 50;
  return ((year - min) / (max - min)) * 100;
}

type Props = {
  /** Year anchor of the selected marker. Null hides the tether. */
  year: number | null;
  yearRange: [number, number];
  /** Pinned selections render at full strength; previews render dimmer. */
  isPinned: boolean;
};

export function TimelineDetailTether({ year, yearRange, isPinned }: Props) {
  if (year == null) return null;
  const left = xPercent(year, yearRange);
  if (left < 0 || left > 100) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 w-px transition-[left,opacity] duration-[220ms]",
        "bg-primary",
        isPinned ? "opacity-70" : "opacity-30",
      )}
      style={{
        left: `${left}%`,
        transitionTimingFunction: "var(--ease-atl)",
      }}
    />
  );
}
