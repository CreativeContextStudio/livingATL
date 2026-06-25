"use client";

import {
  createContext,
  useContext,
  useMemo,
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
 * Two hooks:
 *   - `usePlayer()` — full state. Subscribes to every re-render, including
 *     the `timeupdate`-driven `currentTime` changes that fire ~60fps during
 *     playback. Use this when the component genuinely renders off time.
 *   - `usePlayerControls()` — imperative setters + refs only. The context
 *     value is memoized against the setters (which are themselves
 *     `useCallback`-stable in PlayerClient), so a consumer of this hook
 *     does not re-render on `timeupdate`. Use this in components that only
 *     need to call `seek`, `togglePlay`, `attachWaveSurfer`, etc.
 */

export type PlayerState = {
  /** Ref to the wavesurfer instance. `null` until the Waveform component
   *  mounts and calls `attachWaveSurfer()`. */
  wavesurferRef: RefObject<WaveSurfer | null>;
  /** Ref to the regions plugin. `null` until Waveform attaches. Used by
   *  chapter / sensitivity overlay registration in PlayerClient. */
  regionsRef: RefObject<RegionsPlugin | null>;
  /** Updated via `timeupdate` events on the wavesurfer. */
  currentTime: number;
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

export function usePlayerControls(): PlayerControls {
  const ctx = useContext(PlayerControlsContext);
  if (!ctx) {
    throw new Error(
      "usePlayerControls must be called inside <PlayerStateProvider>",
    );
  }
  return ctx;
}
