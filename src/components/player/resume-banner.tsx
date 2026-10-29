"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon, RotateCcwIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/player";
import { readResume, writeResume } from "@/lib/resume";
import { usePlayer } from "./player-context";

const SAVE_EVERY_MS = 5000;

/**
 * Resume (F-resume). Remembers where this browser left off in each
 * recording and, on the next visit, offers "Continue from 23:14". Never
 * autoplays — the offer is a button. Deep links (`?t=`, shared clips) win:
 * no offer when the URL already says where to start.
 *
 * Saving starts only after playback has actually started, so landing on
 * the page (playhead at 0:00) never erases a saved position.
 */
export function ResumeBanner({ catalogNumber }: { catalogNumber: string }) {
  const searchParams = useSearchParams();
  const { isReady, isPlaying, duration, seekAndPlay, timeStore } = usePlayer();
  const [saved] = useState(() =>
    typeof window === "undefined" ? null : readResume(catalogNumber),
  );
  const [dismissed, setDismissed] = useState(false);
  // Once playback starts the offer is moot (the listener chose a spot).
  const [started, setStarted] = useState(false);
  if (isPlaying && !started) setStarted(true);

  // Persist progress while playing, on pause, and when the page is hidden.
  const playedRef = useRef(false);
  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    if (isPlaying) playedRef.current = true;
    const save = () => {
      if (playedRef.current) writeResume(catalogNumber, timeStore.get(), durationRef.current);
    };
    if (!isPlaying) {
      save();
      return;
    }
    const timer = window.setInterval(save, SAVE_EVERY_MS);
    window.addEventListener("pagehide", save);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [isPlaying, catalogNumber, timeStore]);

  const deepLinked = searchParams.has("t");
  if (!saved || deepLinked || dismissed || !isReady || started) {
    return null;
  }

  const at = formatTimestamp(saved);
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 bg-muted/60 px-4 py-2 text-sm"
    >
      <p>
        You were at <span className="font-mono tabular-nums">{at}</span> last time.
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
          <RotateCcwIcon aria-hidden className="size-3.5" />
          Start from the beginning
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setDismissed(true);
            seekAndPlay(saved);
          }}
        >
          <PlayIcon aria-hidden className="size-3.5" />
          Continue from {at}
        </Button>
      </div>
    </div>
  );
}
