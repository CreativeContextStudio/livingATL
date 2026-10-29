"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import type WaveSurfer from "wavesurfer.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

/**
 * Shared Player state + wavesurfer handle. Sub-components consume this via
 * `usePlayer()`. The provider lives in `PlayerClient` — it owns the
 * wavesurfer lifecycle (create on mount, destroy on unmount).
 *
 * Three hooks:
 *   - `usePlayer()` — play state + controls (isPlaying, duration, rate, …).
 *     Changes a handful of times per session, not per frame.
 *   - `usePlayerTime(select?)` — the playhead. wavesurfer fires `timeupdate`
 *     on every animation frame during playback, so time lives in an external
 *     store (`PlayerTimeStore`) instead of React state: only components that
 *     read it re-render, and only when their selected value changes. Pass a
 *     selector that returns a primitive (active index, quantized seconds) to
 *     re-render far less than 60×/s.
 *   - `usePlayerControls()` — imperative setters + refs only. The context
 *     value is memoized against the setters (which are themselves
 *     `useCallback`-stable in PlayerClient), so a consumer of this hook
 *     does not re-render on play-state changes. Use this in components that
 *     only need to call `seek`, `togglePlay`, `attachWaveSurfer`, etc.
 */

/**
 * Minimal external store for the playhead position. `set` is called from
 * wavesurfer event handlers; React reads it via `useSyncExternalStore`.
 */
export type PlayerTimeStore = {
  get: () => number;
  set: (seconds: number) => void;
  subscribe: (onChange: () => void) => () => void;
};

export function createPlayerTimeStore(): PlayerTimeStore {
  let current = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (seconds) => {
      if (seconds === current) return;
      current = seconds;
      listeners.forEach((l) => l());
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

export type PlayerState = {
  /** Ref to the wavesurfer instance. `null` until the Waveform component
   *  mounts and calls `attachWaveSurfer()`. */
  wavesurferRef: RefObject<WaveSurfer | null>;
  /** Ref to the regions plugin. `null` until Waveform attaches. Used by
   *  chapter / sensitivity overlay registration in PlayerClient. */
  regionsRef: RefObject<RegionsPlugin | null>;
  /** Playhead store, updated via wavesurfer `timeupdate` / `seeking`. Read
   *  it with `usePlayerTime()`; call `.get()` directly in event handlers. */
  timeStore: PlayerTimeStore;
  /** Updated when audio is decoded. */
  duration: number;
  isPlaying: boolean;
  isReady: boolean;
  playbackRate: number;
  volume: number;
  /** When true, the timeline overlays content-advisory spans on top of the
   *  theme-based moment regions. Off by default — themes are the primary
   *  navigational cue; advisories are opt-in. */
  showAlerts: boolean;

  /** Imperative controls. Safe to call even if `!isReady` — they no-op. */
  seek: (seconds: number) => void;
  /** Jump-to-here: seek and start playback from `seconds`. Use this for
   *  transcript-segment and chapter-bar clicks — any UI surface that reads
   *  as "play from this point." The progress scrubber, region clicks, and
   *  keyboard nudges stay on plain `seek` so they preserve pause state. */
  seekAndPlay: (seconds: number) => void;
  togglePlay: () => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setShowAlerts: (next: boolean) => void;

  /** Called by the Waveform component when its wavesurfer instance is ready
   *  to share. Provider reads events off it to update state. */
  attachWaveSurfer: (ws: WaveSurfer, regions: RegionsPlugin) => void;
};

/**
 * Subset of `PlayerState` that doesn't change on `timeupdate`. The refs and
 * setter functions are all stable per `PlayerClient` mount — consumers of
 * this context won't re-render as playback progresses.
 */
export type PlayerControls = Pick<
  PlayerState,
  | "wavesurferRef"
  | "regionsRef"
  | "seek"
  | "seekAndPlay"
  | "togglePlay"
  | "setPlaybackRate"
  | "setVolume"
  | "setShowAlerts"
  | "attachWaveSurfer"
>;

const PlayerStateContext = createContext<PlayerState | null>(null);
const PlayerControlsContext = createContext<PlayerControls | null>(null);

export function PlayerStateProvider({
  value,
  children,
}: {
  value: PlayerState;
  children: ReactNode;
}) {
  // Memoize the controls-only slice. Deps are all `useCallback`-stable in
  // PlayerClient, so this object is effectively allocated once per mount
  // — exactly what we want: consumers of `usePlayerControls()` will get
  // a stable context value and skip re-renders on timeupdate.
  const controls = useMemo<PlayerControls>(
    () => ({
      wavesurferRef: value.wavesurferRef,
      regionsRef: value.regionsRef,
      seek: value.seek,
      seekAndPlay: value.seekAndPlay,
      togglePlay: value.togglePlay,
      setPlaybackRate: value.setPlaybackRate,
      setVolume: value.setVolume,
      setShowAlerts: value.setShowAlerts,
      attachWaveSurfer: value.attachWaveSurfer,
    }),
    [
      value.wavesurferRef,
      value.regionsRef,
      value.seek,
      value.seekAndPlay,
      value.togglePlay,
      value.setPlaybackRate,
      value.setVolume,
      value.setShowAlerts,
      value.attachWaveSurfer,
    ],
  );

  return (
    <PlayerControlsContext.Provider value={controls}>
      <PlayerStateContext.Provider value={value}>
        {children}
      </PlayerStateContext.Provider>
    </PlayerControlsContext.Provider>
  );
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerStateContext);
  if (!ctx) {
    throw new Error("usePlayer must be called inside <PlayerStateProvider>");
  }
  return ctx;
}

const identity = (seconds: number) => seconds;

/** Selector for time readouts/progress bars: ~4 updates per second instead
 *  of one per animation frame. */
export const toQuarterSecond = (seconds: number) => Math.floor(seconds * 4) / 4;

/**
 * Subscribe to the playhead. `select` must return a primitive (or otherwise
 * stable) value — the component re-renders only when it changes, e.g.
 * `usePlayerTime((t) => Math.floor(t))` re-renders once per second.
 */
export function usePlayerTime(): number;
export function usePlayerTime<T>(select: (seconds: number) => T): T;
export function usePlayerTime<T>(select?: (seconds: number) => T): T | number {
  const { timeStore } = usePlayer();
  const pick = select ?? identity;
  return useSyncExternalStore(
    timeStore.subscribe,
    () => pick(timeStore.get()),
    () => pick(0),
  );
}

export function usePlayerControls(): PlayerControls {
  const ctx = useContext(PlayerControlsContext);
  if (!ctx) {
    throw new Error(
      "usePlayerControls must be called inside <PlayerStateProvider>",
    );
  }
  return ctx;
}
