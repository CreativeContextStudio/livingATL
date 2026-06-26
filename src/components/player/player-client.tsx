"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PanelLeftOpenIcon } from "lucide-react";
import type WaveSurfer from "wavesurfer.js";
import type RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

import { AdvisoryGate } from "./advisory-gate";
import { AISummaryCard } from "./ai-summary";
import { ChapterScrubber, ChapterCountsLabel } from "./chapter-scrubber";
import { EndOfPlaybackCard } from "./end-of-playback-card";
import { KeyQuotesList } from "./key-quotes";
import { MetadataSidebar } from "./metadata-sidebar";
import { MobileMiniPlayer } from "./mobile-mini-player";
import { PlayerStateProvider, type PlayerState } from "./player-context";
import { RelatedRecordings } from "./related-recordings";
import { Transport } from "./transport";
import { TranscriptPane } from "./transcript-pane";
import { TranscriptSearch } from "./transcript-search";

// wavesurfer.js is ~200KB and only needed after the advisory gate clears.
// Dynamic-import with `ssr: false` keeps it out of the Player page's
// initial client chunk; the sized skeleton below matches the live
// waveform's h-48 container so there's no layout shift when it streams in.
const Waveform = dynamic(
  () => import("./waveform").then((m) => ({ default: m.Waveform })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Loading waveform"
        className="w-full animate-pulse bg-card/70 px-3 py-2"
        style={{ height: 48 }}
      />
    ),
  },
);
import { Button } from "@/components/ui/button";
import { getThemeAccent } from "@/components/shared/theme-accent";
import { captureEvent } from "@/lib/analytics/posthog";
import { cleanSegmentText, momentTimeRange, humanCategory } from "@/lib/player";
import { cn } from "@/lib/utils";
import type {
  PlayerData,
  RelatedRecording,
} from "@/lib/queries/player";

/**
 * Client-side Player shell. Owns the wavesurfer instance lifecycle via a ref
 * (the Waveform component creates it and shares it via `attachWaveSurfer`)
 * and provides playback state to every sub-component through
 * `PlayerStateProvider`. The RSC page passes `data` as props.
 *
 * Pass A ships the advisory gate + waveform + minimal transport. Chapters,
 * transcript, sidebar, quotes, sensitivity markers, share, and related
 * recordings land in subsequent passes.
 */
export function PlayerClient({
  data,
  related,
}: {
  data: PlayerData;
  related: RelatedRecording[];
}) {
  // Per-recording accent picked from `themes[0]`. Drives the waveform
  // hex colors, the chapter-scrubber active/highlight fills, the Transport
  // play button + progress scrubber, and (via the page RSC) the portrait
  // band above the storyteller name.
  const accent = getThemeAccent(data.themes);

  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(data.durationSeconds ?? 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [showAlerts, setShowAlerts] = useState(false);

  // PRD §8.5 "preserve, don't censor": show the advisory gate whenever
  // editorial hasn't explicitly cleared the recording. A row with
  // `reviewed: true, display_advisory: false` is a steward-verified clean
  // decision — that's the only case we skip the gate. Null content_advisory
  // (not yet reviewed) or `reviewed: false` both gate.
  const [gateCleared, setGateCleared] = useState(() => {
    const advisory = data.contentAdvisory;
    return advisory?.reviewed === true && advisory.display_advisory !== true;
  });
  // Mobile mini-player visibility — driven by an IntersectionObserver on the
  // real Transport (wrapped in `transportRef` below). The sticky bottom bar
  // only appears once the primary controls have scrolled off-screen, so it
  // never covers content unnecessarily. `lg:hidden` keeps it phone/tablet-only.
  const transportRef = useRef<HTMLDivElement | null>(null);
  const [transportVisible, setTransportVisible] = useState(true);
  useEffect(() => {
    const node = transportRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setTransportVisible(entry?.isIntersecting ?? true),
      { rootMargin: "0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Sidebar collapses to a narrow rail so the transcript (and, Phase 2 Week 6,
  // the AI Portal chat column) can claim the freed width. Default open on the
  // Player because the metadata + quotes + related rail is the Player's
  // companion — Portal will flip this default when it lands.
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Transcript search — case-insensitive substring match over segment text.
  // `focusedMatchPosition` is a 0-indexed position within `matchSegmentIndices`;
  // the segment itself is `matchSegmentIndices[focusedMatchPosition]`.
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [focusedMatchPosition, setFocusedMatchPosition] = useState(0);

  const matchSegmentIndices = useMemo(() => {
    const q = transcriptQuery.trim().toLowerCase();
    if (!q) return [] as number[];
    const out: number[] = [];
    for (let i = 0; i < data.transcriptSegments.length; i++) {
      const text = cleanSegmentText(data.transcriptSegments[i].text).toLowerCase();
      if (text.includes(q)) out.push(i);
    }
    return out;
  }, [transcriptQuery, data.transcriptSegments]);

  // Clamp the focused position against the (possibly shrunk) match array.
  // Deriving the effective position during render — rather than resetting
  // it via an effect — avoids the cascading-render penalty and stays
  // deterministic as the query is edited.
  const effectiveMatchPosition =
    matchSegmentIndices.length === 0
      ? 0
      : Math.min(focusedMatchPosition, matchSegmentIndices.length - 1);

  const focusedMatchSegmentIndex =
    matchSegmentIndices.length > 0
      ? (matchSegmentIndices[effectiveMatchPosition] ?? matchSegmentIndices[0])
      : -1;

  const onTranscriptQueryChange = useCallback((next: string) => {
    setTranscriptQuery(next);
    // Reset focus to the first match on every query edit so "1 of N" stays
    // deterministic as the listener types.
    setFocusedMatchPosition(0);
  }, []);

  const onSearchNext = useCallback(() => {
    setFocusedMatchPosition((p) => {
      const n = matchSegmentIndices.length;
      if (n === 0) return 0;
      return (p + 1) % n;
    });
  }, [matchSegmentIndices.length]);

  const onSearchPrev = useCallback(() => {
    setFocusedMatchPosition((p) => {
      const n = matchSegmentIndices.length;
      if (n === 0) return 0;
      return (p - 1 + n) % n;
    });
  }, [matchSegmentIndices.length]);

  // Right column grows naturally with content (transcript + key quotes +
  // summary). The page is the scroll surface — scrolling past the transcript
  // reveals key quotes and summary. Earlier versions pinned the right column
  // to the left column's measured height so Summary could `flex-1 overflow-y-auto`
  // inside a bounded box, but that broke when Key Quotes expanded past the
  // available slack: Summary rendered outside the pinned height and became
  // unreachable.

  // Stable catalog ref — referenced inside the wavesurfer-event closures
  // that are set up once in `attachWaveSurfer`. If we dereferenced
  // `data.catalogNumber` directly there, it would be captured at first
  // mount and survive React key-based remounts incorrectly. A ref keeps
  // the events accurate if the Player ever re-uses the wavesurfer handle
  // across catalogs (not today, but cheap future-proofing).
  const catalogRef = useRef(data.catalogNumber);
  catalogRef.current = data.catalogNumber;

  const attachWaveSurfer = useCallback(
    (ws: WaveSurfer, regions: RegionsPlugin) => {
      wavesurferRef.current = ws;
      regionsRef.current = regions;
      ws.on("ready", () => {
        setDuration(ws.getDuration());
        setIsReady(true);
      });
      ws.on("play", () => {
        setIsPlaying(true);
        captureEvent("player_play", {
          catalog: catalogRef.current,
          current_time: Math.round(ws.getCurrentTime()),
        });
      });
      ws.on("pause", () => {
        setIsPlaying(false);
        captureEvent("player_pause", {
          catalog: catalogRef.current,
          current_time: Math.round(ws.getCurrentTime()),
        });
      });
      ws.on("finish", () => {
        setIsPlaying(false);
        // Distinct from user-initiated pause — tracks whether listeners
        // reach the end of a recording. `reason: "finish"` lets the
        // dashboard filter completion rate vs voluntary pause.
        captureEvent("player_pause", {
          catalog: catalogRef.current,
          current_time: Math.round(ws.getCurrentTime()),
          reason: "finish",
        });
      });
      ws.on("timeupdate", (time) => setCurrentTime(time));
      ws.on("seeking", (time) => setCurrentTime(time));

      regions.on("region-clicked", (region, event) => {
        event.stopPropagation();
        ws.setTime(region.start);
        captureEvent("player_seek", {
          catalog: catalogRef.current,
          to_time: Math.round(region.start),
          trigger: "region",
        });
      });
    },
    [],
  );

  const seek = useCallback((seconds: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    // setTime is safe before ready — wavesurfer queues it internally.
    const target = Math.max(0, seconds);
    ws.setTime(target);
    captureEvent("player_seek", {
      catalog: catalogRef.current,
      to_time: Math.round(target),
      trigger: "seek",
    });
  }, []);

  const seekAndPlay = useCallback((seconds: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    const target = Math.max(0, seconds);
    ws.setTime(target);
    captureEvent("player_seek", {
      catalog: catalogRef.current,
      to_time: Math.round(target),
      trigger: "seek_and_play",
    });
    // Called from user-gesture click handlers, so autoplay policy won't
    // block. Catch silently in case wavesurfer rejects (e.g., audio
    // element not yet decoded) — the seek itself is already applied,
    // so the user just has to hit play once.
    void ws.play().catch(() => {});
  }, []);

  const togglePlay = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.playPause();
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.setPlaybackRate(rate);
    setPlaybackRateState(rate);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.setVolume(vol);
    setVolumeState(vol);
  }, []);

  const state: PlayerState = {
    wavesurferRef,
    regionsRef,
    currentTime,
    duration,
    isPlaying,
    isReady,
    playbackRate,
    volume,
    showAlerts,
    seek,
    seekAndPlay,
    togglePlay,
    setPlaybackRate,
    setVolume,
    setShowAlerts,
    attachWaveSurfer,
  };

  // Register wavesurfer regions for chapter moments + optional advisory
  // overlay. Moments carry their themes as the region label — themes are
  // the primary navigational cue. Advisory spans are opt-in via the
  // "Show alerts" transport toggle.
  useEffect(() => {
    const regions = regionsRef.current;
    if (!isReady || !regions) return;
    regions.clearRegions();

    // Moment regions overlay the waveform in the per-recording accent.
    // The hex → rgba conversion preserves alpha scaling (~0.18 for
    // highlight, ~0.08 for base) so the translucent overlays match
    // whichever theme drove the Waveform's wave/progress colors.
    const regionRgba = (hex: string, alpha: number) => {
      const clean = hex.replace("#", "");
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    for (const moment of data.briefMoments) {
      const range = momentTimeRange(moment, data.transcriptSegments);
      if (!range) continue;
      regions.addRegion({
        id: `moment-${range.start}-${range.end}`,
        start: range.start,
        end: range.end,
        color: regionRgba(
          accent.hex.progress,
          moment.highlight ? 0.18 : 0.08,
        ),
        drag: false,
        resize: false,
      });
    }

    if (showAlerts) {
      for (const span of data.flaggedSpans) {
        regions.addRegion({
          id: `span-${span.start}-${span.end}`,
          start: span.start,
          end: span.end,
          color: "rgba(255, 182, 39, 0.22)",
          content: humanCategory(span.category),
          drag: false,
          resize: false,
        });
      }
    }
  }, [
    isReady,
    showAlerts,
    data.briefMoments,
    data.flaggedSpans,
    data.transcriptSegments,
    accent.hex.progress,
  ]);

  return (
    <PlayerStateProvider value={state}>
      {!gateCleared ? (
        <AdvisoryGate
          advisory={data.contentAdvisory}
          onAccept={() => setGateCleared(true)}
        />
      ) : null}

      <div
        aria-hidden={!gateCleared}
        className={
          !gateCleared
            ? "pointer-events-none blur-sm select-none transition"
            : "transition"
        }
      >
        <div className="flex flex-col gap-2">
          <ChapterCountsLabel
            moments={data.briefMoments}
            segments={data.transcriptSegments}
            totalDurationSeconds={data.durationSeconds ?? 0}
          />
          {/* Merged shell: chapter bar → waveform → (end-of-playback
              card, conditional) → transport. One ring, one rounded
              corner, `divide-y` draws the seams. The decode-wait
              overlay below is scoped to the waveform's relative box
              so it only covers the waveform itself, not transport. */}
          <div className="flex flex-col divide-y divide-foreground/10 overflow-hidden rounded-xl ring-1 ring-foreground/5">
            <div className="relative flex flex-col divide-y divide-foreground/10">
              {/* Top row: thicker chapter bar with inline theme-chip text */}
              <ChapterScrubber
                moments={data.briefMoments}
                segments={data.transcriptSegments}
                totalDurationSeconds={data.durationSeconds ?? 0}
                accent={accent.tailwind}
              />
              {/* Bottom row: thin waveform band */}
              <Waveform audioUrl={data.audioUrl} accent={accent.hex} />
              {/* Decode-wait overlay — fills the 10–15s between advisory
                  accept and wavesurfer's `ready` event with the brief's
                  overview so the listener arrives oriented, not idle.
                  Fades out on `isReady`; `pointer-events-none` so hovering
                  chapters still works during the fade tail. */}
              {data.briefOverview ? (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 flex items-center justify-center bg-background/90 px-6 backdrop-blur-sm transition-opacity duration-500",
                    isReady ? "opacity-0" : "opacity-100",
                  )}
                  aria-hidden={isReady}
                >
                  <div className="flex max-w-xl flex-col items-center gap-2 text-center">
                    <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                      Preparing recording
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3">
                      {data.briefOverview}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            <EndOfPlaybackCard
              related={related[0] ?? null}
              recordingId={data.id}
            />
            {/* Wrapper is the IntersectionObserver target for the mobile
                mini-player. Stays a direct child of the `divide-y` flex so
                the seam still draws; invisible to layout otherwise. */}
            <div ref={transportRef}>
              <Transport
                accent={accent.tailwind}
                accentHex={accent.hex.progress}
              />
            </div>
          </div>
        </div>

        <div
          className={cn(
            // Mobile reserves space below the content so the sticky mini-player
            // never overlaps the footer; reverts at `lg` where the bar is hidden.
            "mt-6 grid grid-cols-1 gap-5 pb-20 lg:pb-0",
            sidebarOpen
              ? "lg:grid-cols-[18rem_1fr] xl:grid-cols-[22rem_1fr]"
              : "lg:grid-cols-[3rem_1fr]",
          )}
        >
          <div
            // `lg:self-start` keeps the left column at its natural content
            // height (grid items default to items-stretch, which would make
            // `offsetHeight` echo the grid row height — that's the height
            // the right column was trying to match, creating a feedback
            // loop where Summary's bloat fed back into left col's measured
            // height).
            className="order-2 flex flex-col gap-5 lg:order-1 lg:self-start"
          >
            {sidebarOpen ? (
              <>
                {/* Sidebar holds only Metadata + Related on the left column.
                    Key quotes and AI summary moved to the right column
                    under the transcript so reading rhythm is transcript →
                    voice highlights → machine summary. MetadataSidebar is
                    the top card and aligns with the Transcript card on the
                    right so both column tops start at the same y. */}
                <MetadataSidebar
                  data={data}
                  onCollapse={() => setSidebarOpen(false)}
                />
                <RelatedRecordings related={related} />
              </>
            ) : (
              <div className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Expand context sidebar"
                  aria-expanded={false}
                  title="Expand context"
                >
                  <PanelLeftOpenIcon />
                </Button>
              </div>
            )}
          </div>

          <div className="order-1 flex flex-col gap-5 lg:order-2">
            <section className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-5">
              {/* Header row: "Transcript" title on the left, search bar
                  right-aligned. Segment count lives directly beneath the
                  search so the hit counter reads as part of the same
                  column. On narrow screens this stacks vertically. The
                  transcript is always open — no accordion. */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <h2 className="font-heading text-xs font-semibold tracking-[0.14em] self-start uppercase">
                  Transcript
                </h2>
                <div className="flex flex-col gap-1 sm:w-72 sm:items-end md:w-80">
                  <TranscriptSearch
                    query={transcriptQuery}
                    onQueryChange={onTranscriptQueryChange}
                    matchCount={matchSegmentIndices.length}
                    currentPosition={
                      matchSegmentIndices.length > 0
                        ? effectiveMatchPosition + 1
                        : 0
                    }
                    onNext={onSearchNext}
                    onPrev={onSearchPrev}
                  />
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {data.transcriptSegments.length} segments
                  </p>
                </div>
              </div>
              <TranscriptPane
                segments={data.transcriptSegments}
                speakers={data.speakers}
                flaggedSpans={data.flaggedSpans}
                searchQuery={transcriptQuery}
                focusedMatchSegmentIndex={focusedMatchSegmentIndex}
              />
            </section>

            {/* Key quotes outrank AI summary per the Player UX pass — key
                quotes ARE the voice; AI summary is derivative. A listener
                skimming "will I commit 68 minutes" is better served by the
                storyteller's own words than by a machine summary of them. */}
            <KeyQuotesList quotes={data.keyQuotes} />
            <AISummaryCard summary={data.aiSummary} />
          </div>
        </div>

        {/* Sticky compact audio bar — mobile/tablet only (`lg:hidden`).
            Appears once the main Transport scrolls out of view. */}
        <MobileMiniPlayer
          visible={gateCleared && isReady && !transportVisible}
          title={data.title ?? data.catalogNumber}
          accent={accent.tailwind}
          accentHex={accent.hex.progress}
        />
      </div>
    </PlayerStateProvider>
  );
}
