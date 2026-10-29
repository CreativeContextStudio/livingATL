"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

import type { ThemeAccent } from "@/components/shared/theme-accent";
import { useDocumentTheme } from "@/lib/theme-client";
import { usePlayerControls } from "./player-context";

/** Dark-theme foreground (globals.css `--foreground` under data-theme=dark). */
const DARK_CURSOR = "#fafafa";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Canvas colors for the current theme. The per-recording palette is tuned
 * for light surfaces (pale bars, near-black cursor); on the dark theme the
 * pale bars glare and the cursor disappears, so bars become a translucent
 * version of the accent and the cursor uses the dark foreground.
 */
function waveformColors(theme: string, accent: ThemeAccent["hex"]) {
  if (theme === "dark") {
    return {
      waveColor: hexToRgba(accent.progress, 0.32),
      progressColor: accent.progress,
      cursorColor: DARK_CURSOR,
    };
  }
  return {
    waveColor: accent.wave,
    progressColor: accent.progress,
    cursorColor: accent.cursor,
  };
}

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
  peaks,
  durationSeconds,
}: {
  audioUrl: string | null;
  accent: ThemeAccent["hex"];
  /** Precomputed peaks (`recordings.waveform_peaks`). With these and a
   *  duration, wavesurfer draws immediately and the audio element streams;
   *  without them it must download and decode the whole MP3 first. */
  peaks?: number[] | null;
  durationSeconds?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const { attachWaveSurfer } = usePlayerControls();
  const theme = useDocumentTheme();

  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    const regions = RegionsPlugin.create();
    const precomputed =
      peaks && peaks.length > 0 && durationSeconds
        ? { peaks: [peaks], duration: durationSeconds }
        : {};
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: audioUrl,
      ...precomputed,
      // Per-recording palette picked from `themes[0]` upstream (Atlanta
      // coral fallback), adjusted for the site theme at creation; theme
      // switches later are applied by the setOptions effect below.
      ...waveformColors(document.documentElement.dataset.theme ?? "light", accent),
      cursorWidth: 2,
      height: 48,
      barWidth: 1,
      barGap: 1,
      barRadius: 1,
      normalize: true,
      dragToSeek: true,
      plugins: [regions],
    });

    wsRef.current = ws;
    attachWaveSurfer(ws, regions);

    return () => {
      wsRef.current = null;
      ws.destroy();
    };
    // audioUrl drives a remount when the recording changes. attachWaveSurfer
    // is memoized by the parent and stable across renders. Colors are only
    // the initial values here; the effect below keeps them in sync with the
    // site theme and accent without recreating the instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Recolor in place on theme change — recreating wavesurfer would refetch
  // and re-decode the whole MP3.
  useEffect(() => {
    wsRef.current?.setOptions(waveformColors(theme, accent));
  }, [theme, accent]);

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
      // Mouse-only visual scrubber; keyboard and screen-reader users get the
      // equivalent, labelled Seek slider in the transport. (An aria-label on
      // a role-less div was never announced.)
      aria-hidden="true"
    />
  );
}
