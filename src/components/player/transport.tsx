"use client";

import { useEffect, useRef } from "react";
import {
  AlertTriangleIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PRIMARY_ACCENT,
  type ThemeAccent,
} from "@/components/shared/theme-accent";
import { formatSpokenTime, formatTimestamp } from "@/lib/player";
import { cn } from "@/lib/utils";
import { ShareButton } from "./share-button";
import { toQuarterSecond, usePlayer, usePlayerTime } from "./player-context";
import { VolumeControl } from "./volume-control";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/**
 * Transport controls — PRD §7.2. Play/pause, scrub, speed, volume, share.
 * Keyboard shortcuts: Space toggles play/pause, ← / → seek -5 / +5 seconds.
 * They only fire once audio is ready (which can't happen before the advisory
 * gate is accepted — the waveform isn't mounted until then), never with a
 * modifier held (Alt/Cmd+← is browser Back), and never while focus is on a
 * control that owns those keys itself (see `shouldIgnoreKey`).
 */
export function Transport({
  accent = PRIMARY_ACCENT.tailwind,
  accentHex = PRIMARY_ACCENT.hex.progress,
}: {
  /** Per-recording palette drives the play button fill. */
  accent?: ThemeAccent["tailwind"];
  /** Raw hex used for the seek slider's played-progress indicator —
   *  Tailwind JIT can't compose dynamic class strings, so the slider
   *  range uses an arbitrary-value utility pointing at a CSS var. */
  accentHex?: string;
}) {
  const {
    timeStore,
    duration,
    isPlaying,
    isReady,
    togglePlay,
    seek,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    showAlerts,
    setShowAlerts,
  } = usePlayer();

  const currentTime = usePlayerTime(toQuarterSecond);
  const progress = duration > 0 ? currentTime / duration : 0;

  // Mirror play-state scalars into refs so the keydown listener below can
  // mount once. The playhead is read straight from the store at keypress
  // time (exact, not the quarter-second display value).
  const durationRef = useRef(duration);
  const isReadyRef = useRef(isReady);
  useEffect(() => {
    durationRef.current = duration;
    isReadyRef.current = isReady;
  }, [duration, isReady]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isReadyRef.current || e.defaultPrevented) return;
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target && shouldIgnoreKey(target)) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(0, timeStore.get() - 5));
        return;
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(durationRef.current, timeStore.get() + 5));
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, seek, timeStore]);

  return (
    <TooltipProvider delay={250}>
      <div className="flex flex-col gap-3 bg-card/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-lg"
                  onClick={togglePlay}
                  disabled={!isReady}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className={cn(
                    "rounded-full",
                    accent.bgStrong,
                    accent.textOn,
                    // Slight darken on hover by dimming the bg opacity
                    "hover:brightness-110",
                  )}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </Button>
              }
            />
            <TooltipContent side="top">
              {isPlaying ? "Pause (Space)" : "Play (Space)"}
            </TooltipContent>
          </Tooltip>

          <div className="flex flex-1 items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatTimestamp(currentTime)}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
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
                    getAriaValueText={(_, v) =>
                      `${formatSpokenTime((v / 1000) * duration)} of ${formatSpokenTime(duration)}`
                    }
                    aria-label="Seek"
                    style={{ "--slider-range-color": accentHex } as React.CSSProperties}
                    className={cn(
                      // Scrubber track darker than the default bg-muted so it
                      // reads on the Transport's bg-card/60 surface. The
                      // played-progress indicator picks up the per-recording
                      // accent via a CSS var (runtime-composed Tailwind
                      // classes don't make it past JIT).
                      "flex-1 [&_[data-slot=slider-track]]:bg-foreground/15",
                      "[&_[data-slot=slider-range]]:bg-[var(--slider-range-color)]",
                    )}
                  />
                }
              />
              <TooltipContent side="top">
                Seek · ← / → for ±5s
              </TooltipContent>
            </Tooltip>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatTimestamp(duration)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <Select
                  value={String(playbackRate)}
                  onValueChange={(next) => {
                    if (next == null) return;
                    setPlaybackRate(Number.parseFloat(next));
                  }}
                >
                  <SelectTrigger
                    className="w-auto gap-1 pr-1.5"
                    aria-label="Playback speed"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYBACK_RATES.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}×
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <TooltipContent side="top">Playback speed</TooltipContent>
          </Tooltip>

          <VolumeControl
            volume={volume}
            setVolume={setVolume}
            accentHex={accentHex}
          />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={showAlerts ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-pressed={showAlerts}
                  aria-label="Show content notes on the timeline"
                  onClick={() => setShowAlerts(!showAlerts)}
                >
                  <AlertTriangleIcon className="size-4" aria-hidden />
                </Button>
              }
            />
            <TooltipContent side="top">
              {showAlerts
                ? "Hide content notes on the timeline"
                : "Show content notes on the timeline"}
            </TooltipContent>
          </Tooltip>

          <div className="ml-auto">
            <ShareButton />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Controls that already give Space or the arrow keys a meaning: Space
 * activates a focused button or link, arrows move a slider or tab list. When
 * focus is on one of these the key belongs to it, not to the global shortcut.
 */
const KEY_OWNING_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  '[role="button"]',
  '[role="link"]',
  '[role="slider"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="spinbutton"]',
].join(",");

function shouldIgnoreKey(target: HTMLElement): boolean {
  if (target.isContentEditable) return true;
  return typeof target.closest === "function" && target.closest(KEY_OWNING_SELECTOR) !== null;
}
