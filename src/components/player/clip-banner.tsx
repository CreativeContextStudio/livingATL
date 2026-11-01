"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon, RotateCcwIcon, ScissorsIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { captureEvent } from "@/lib/analytics/posthog";
import { isSharedClipArrival, parseClipRange } from "@/lib/clips";
import { formatTimestamp } from "@/lib/player";
import { usePlayer, usePlayerControls, usePlayerTime } from "./player-context";
import { usePlayerCatalog } from "./use-player-catalog";

type Phase = "before" | "inside" | "past" | "away";

/**
 * Shared-clip playback (`?t=12:04&end=13:34`). ShareButton already seeks to
 * `t` when audio is ready; this banner names the clip, pauses at `end`, and
 * offers Keep listening / Replay. Seeking outside the clip (or Keep
 * listening) drops the clip constraint for the rest of the visit.
 */
export function ClipBanner() {
  const searchParams = useSearchParams();
  const clip = parseClipRange(searchParams.get("t"), searchParams.get("end"));
  const { isReady, isPlaying, seekAndPlay, timeStore } = usePlayer();
  const { wavesurferRef } = usePlayerControls();
  const catalog = usePlayerCatalog();
  const clipStart = clip?.start;
  const clipStop = clip?.end;

  // A visitor arrived on a shared clip link from outside the site.
  useEffect(() => {
    if (clipStart === undefined || clipStop === undefined) return;
    const arrived = isSharedClipArrival({
      loadedUrl: performance.getEntriesByType("navigation")[0]?.name,
      currentUrl: window.location.href,
      referrer: document.referrer,
    });
    if (!arrived) return;
    captureEvent("shared_clip_landing", {
      catalog,
      start: clipStart,
      seconds: clipStop - clipStart,
      referrer_host: document.referrer ? new URL(document.referrer).host : null,
    });
  }, [catalog, clipStart, clipStop]);

  // Coarse position relative to the clip — re-renders only on transitions.
  const phase = usePlayerTime<Phase>((t) => {
    if (!clip) return "away";
    if (t < clip.start - 2) return "before";
    if (t <= clip.end) return "inside";
    if (t <= clip.end + 2) return "past";
    return "away";
  });

  // Armed once playback has reached the clip, so the pre-seek playhead
  // (still at 0:00) isn't mistaken for "the listener left the clip".
  const [armed, setArmed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [released, setReleased] = useState(false);
  if (clip && !armed && !released && phase === "inside") setArmed(true);
  // Seeking forward past the clip releases it at once.
  if (armed && !released && !ended && phase === "away") setReleased(true);

  // Moving back before the clip releases it only if it sticks: when audio
  // metadata arrives the playhead blips to 0:00 before the deep-link seek is
  // re-applied, which must not count as the listener leaving the clip.
  useEffect(() => {
    if (!armed || released || ended || phase !== "before") return;
    const timer = window.setTimeout(() => setReleased(true), 1500);
    return () => window.clearTimeout(timer);
  }, [armed, released, ended, phase]);

  // End = playback *crossing* the clip end (previous sample just under it,
  // next at or past it, < 1.5 s apart). Seeks and the stale time updates
  // wavesurfer emits right after a seek jump instead, so they never end it.
  const clipEnd = clip?.end ?? 0;
  const watching = useRef({ armed, ended, released, end: clipEnd });
  useEffect(() => {
    watching.current = { armed, ended, released, end: clipEnd };
  }, [armed, ended, released, clipEnd]);
  useEffect(() => {
    let last = timeStore.get();
    return timeStore.subscribe(() => {
      const now = timeStore.get();
      const prev = last;
      last = now;
      const w = watching.current;
      if (!w.armed || w.ended || w.released) return;
      if (prev < w.end && now >= w.end && now - prev < 1.5) {
        wavesurferRef.current?.pause();
        setEnded(true);
      }
    });
  }, [timeStore, wavesurferRef]);

  if (!clip || !isReady || released) return null;

  const range = `${formatTimestamp(clip.start)}–${formatTimestamp(clip.end)}`;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 bg-muted/60 px-4 py-2 text-sm"
    >
      <p className="flex items-center gap-2">
        <ScissorsIcon aria-hidden className="size-3.5 text-muted-foreground" />
        <span>
          {ended ? "End of shared clip" : "Shared clip"}{" "}
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{range}</span>
        </span>
      </p>
      {ended && !isPlaying ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Disarm until playback is back inside the clip; the playhead
              // still reads "past the end" until the seek lands.
              setArmed(false);
              setEnded(false);
              seekAndPlay(clip.start);
            }}
          >
            <RotateCcwIcon aria-hidden className="size-3.5" />
            Replay clip
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setReleased(true);
              captureEvent("clip_continue", { catalog, end: clip.end });
              seekAndPlay(clip.end);
            }}
          >
            <PlayIcon aria-hidden className="size-3.5" />
            Keep listening
          </Button>
        </div>
      ) : null}
    </div>
  );
}
