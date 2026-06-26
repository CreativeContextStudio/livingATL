"use client";

import { PauseIcon, PlayIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  PRIMARY_ACCENT,
  type ThemeAccent,
} from "@/components/shared/theme-accent";
import { formatTimestamp } from "@/lib/player";
import { cn } from "@/lib/utils";
import { usePlayer } from "./player-context";

/**
 * Mobile-only sticky compact audio bar. Below `lg` the main Transport scrolls
 * out of view as soon as the listener starts reading the transcript, so play /
 * pause and seek become unreachable. This bar pins those two controls (plus a
 * thin progress scrubber and the recording title) to the bottom of the
 * viewport. It is purely a second view onto the existing `usePlayer()` state —
 * no new playback state, no audio-source changes — and is `lg:hidden` so the
 * desktop layout is untouched.
 *
 * Visibility is driven by the parent (`PlayerClient`) via an IntersectionObserver
 * on the real Transport: the bar only appears once the primary controls have
 * scrolled off-screen, so it never covers content unnecessarily.
 */
export function MobileMiniPlayer({
  visible,
  title,
  accent = PRIMARY_ACCENT.tailwind,
  accentHex = PRIMARY_ACCENT.hex.progress,
}: {
  visible: boolean;
  title: string;
  accent?: ThemeAccent["tailwind"];
  accentHex?: string;
}) {
  const { currentTime, duration, isPlaying, isReady, togglePlay, seek } =
    usePlayer();

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)] transition-transform duration-300 lg:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      // Hide from the a11y tree + tab order while off-screen so the slid-down
      // bar isn't a focus target behind the footer.
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2">
        <Button
          size="icon-lg"
          onClick={togglePlay}
          disabled={!isReady}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={cn("rounded-full", accent.bgStrong, accent.textOn)}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground/90">
              {title}
            </span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
            </span>
          </div>
          <Slider
            value={[progress * 1000]}
            min={0}
            max={1000}
            step={1}
            onValueChange={(next) => {
              const raw = Array.isArray(next) ? next[0] : next;
              const ratio = (raw ?? 0) / 1000;
              if (duration > 0) seek(ratio * duration);
            }}
            disabled={!isReady}
            aria-label="Seek"
            style={
              { "--slider-range-color": accentHex } as React.CSSProperties
            }
            className={cn(
              "[&_[data-slot=slider-track]]:bg-foreground/15",
              "[&_[data-slot=slider-range]]:bg-[var(--slider-range-color)]",
            )}
          />
        </div>
      </div>
    </div>
  );
}
