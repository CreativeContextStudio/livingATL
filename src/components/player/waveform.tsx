"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

import type { ThemeAccent } from "@/components/shared/theme-accent";
import { usePlayerControls } from "./player-context";

/**
 * Waveform canvas — wraps a wavesurfer.js v7 instance. Owns creation in a
 * `useEffect`, shares the instance with the rest of the Player tree via
 * `usePlayer().attachWaveSurfer()`, and tears down on unmount.
 *
 * Styling note: wavesurfer renders into a shadow root; Tailwind classes on
 * the container are fine for positioning/height, but wave colors must go
 * through the constructor options (not utility classes) — hence the
 * `accent.hex` palette threaded through as a prop.
 */
export function Waveform({
  audioUrl,
  accent,
}: {
  audioUrl: string | null;
  accent: ThemeAccent["hex"];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { attachWaveSurfer } = usePlayerControls();

  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    const regions = RegionsPlugin.create();
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: audioUrl,
      // Per-recording palette picked from `themes[0]` upstream. Default is
      // Atlanta coral (matches the non-themed fallback) when no theme or
      // an unknown theme is present.
      waveColor: accent.wave,
      progressColor: accent.progress,
      cursorColor: accent.cursor,
      cursorWidth: 2,
      height: 48,
      barWidth: 1,
      barGap: 1,
      barRadius: 1,
      normalize: true,
      dragToSeek: true,
      plugins: [regions],
    });

    attachWaveSurfer(ws, regions);

    return () => {
      ws.destroy();
    };
    // audioUrl drives a remount when the recording changes. attachWaveSurfer
    // is memoized by the parent and stable across renders. Accent colors
    // are captured at construction — a theme change would mean a different
    // recording, which remounts via the audioUrl dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  if (!audioUrl) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-sm text-muted-foreground">
        No streaming audio for this recording yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full bg-card/70 px-3 py-2"
      aria-label="Audio waveform"
    />
  );
}
