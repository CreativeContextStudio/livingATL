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
import { formatTimestamp } from "@/lib/player";
import { cn } from "@/lib/utils";
import { ShareButton } from "./share-button";
import { usePlayer } from "./player-context";
import { VolumeControl } from "./volume-control";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/**
 * Transport controls — PRD §7.2. Play/pause, scrub, speed, volume, share.
 * Keyboard shortcuts: Space toggles play/pause, ← / → seek -5 / +5 seconds.
 * Shortcuts are ignored when typing in an input, textarea, or contenteditable
 * element so forms elsewhere on the page don't break.
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
    currentTime,
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

  const progress = duration > 0 ? currentTime / duration : 0;

  // Mirror the fast-changing playback scalars into refs so the keydown
  // listener effect below can mount once and read the latest values from
  // the refs, instead of re-registering the window listener every time
  // wavesurfer fires `timeupdate` (~60fps during playback).
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  useEffect(() => {
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
  }, [currentTime, duration]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && shouldIgnoreKey(target)) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(0, currentTimeRef.current - 5));
        return;
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(durationRef.current, currentTimeRef.current + 5));
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, seek]);

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
                  aria-label="Show content advisories on timeline"
                  onClick={() => setShowAlerts(!showAlerts)}
                >
                  <AlertTriangleIcon className="size-4" aria-hidden />
                </Button>
              }
            />
            <TooltipContent side="top">
              {showAlerts
                ? "Hide content advisories on timeline"
                : "Show content advisories on timeline"}
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

function shouldIgnoreKey(target: HTMLElement): boolean {
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  // Don't eat Space on other focused buttons — only ignore when focus is
  // somewhere that actually cares about arrow/space keys.
  return false;
}
