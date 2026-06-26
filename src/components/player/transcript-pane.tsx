"use client";

import { useEffect, useMemo, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { formatSpeakerName } from "@/lib/format";
import { currentSegmentIndex, spansOverlappingSegment } from "@/lib/player";
import { cn } from "@/lib/utils";
import type {
  FlaggedSpan,
  PlayerSpeaker,
  TranscriptSegment,
} from "@/lib/queries/player";
import { usePlayer } from "./player-context";
import { TranscriptSegmentRow } from "./transcript-segment";

/**
 * Synchronized transcript (PRD §7.2).
 *
 * Renders segments grouped by contiguous speaker role with a single label
 * per run (mirrors the `[INTERVIEWER]` / `[INTERVIEWEE]` chunk-prefix
 * convention from ingest so the visual pattern matches what's embedded
 * for AI Portal retrieval — PRD §6.5 + Phase 2 Week 6 prompt eval).
 *
 * Auto-scrolls the active segment into view on timeupdate, but respects
 * user intent: if the user has manually scrolled recently, auto-scroll
 * pauses for ~5s so they can read without being yanked away.
 *
 * Low-confidence segments dim; click any segment to seek.
 */

const AUTO_SCROLL_SUSPEND_MS = 5000;

type RoleRun = {
  role: "interviewer" | "interviewee" | "other" | "unknown";
  segments: Array<{ segment: TranscriptSegment; index: number }>;
};

function groupByRole(segments: TranscriptSegment[]): RoleRun[] {
  const out: RoleRun[] = [];
  let current: RoleRun | null = null;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const role = (seg.speaker_role ??
      "unknown") as RoleRun["role"];
    if (!current || current.role !== role) {
      current = { role, segments: [] };
      out.push(current);
    }
    current.segments.push({ segment: seg, index: i });
  }
  return out;
}

function roleLabel(role: RoleRun["role"]): string {
  if (role === "interviewer") return "Interviewer";
  if (role === "interviewee") return "Interviewee";
  if (role === "other") return "Other speaker";
  return "Speaker";
}

function namesForRole(
  role: RoleRun["role"],
  speakers: PlayerSpeaker[],
): string | null {
  if (role === "unknown") return null;
  const matches = speakers.filter((s) => s.role === role);
  if (matches.length === 0) return null;
  // Interviewers: catalog fields often pack multiple askers into one
  // string. Surface only the primary one — co-interviewers are a research
  // concern, not a transcript-label concern. Interviewees keep the
  // multi-name join since who's speaking matters for husband/wife or
  // panel sessions.
  if (role === "interviewer") {
    return formatSpeakerName(matches[0].name);
  }
  const names = matches.map((s) => formatSpeakerName(s.name));
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} + ${names.length - 1} others`;
}

export function TranscriptPane({
  segments,
  speakers = [],
  flaggedSpans = [],
  searchQuery = "",
  focusedMatchSegmentIndex = -1,
}: {
  segments: TranscriptSegment[];
  speakers?: PlayerSpeaker[];
  flaggedSpans?: FlaggedSpan[];
  /** Case-insensitive substring — used to highlight matches in segment text. */
  searchQuery?: string;
  /** Segment index of the currently-focused search match, or -1 for none.
   *  When this changes, the pane scrolls that segment into view. */
  focusedMatchSegmentIndex?: number;
}) {
  const { currentTime, seekAndPlay } = usePlayer();
  const viewportRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  // `-Infinity` so `performance.now() - lastUserScrollAtRef` is always
  // `Infinity` until the user actually interacts — this prevents the
  // first-5-seconds-after-page-load false positive where `now - 0` stays
  // below the suspension window and auto-scroll silently suppresses
  // during the exact interval the listener presses play.
  const lastUserScrollAtRef = useRef<number>(Number.NEGATIVE_INFINITY);

  const activeIndex = useMemo(
    () => currentSegmentIndex(currentTime, segments),
    [currentTime, segments],
  );

  const groups = useMemo(() => groupByRole(segments), [segments]);

  // For each flagged span, find the first overlapping segment — that's the
  // single segment where the SensitivityMarker appears. Keeping one marker
  // per span avoids visual noise on spans that cover dozens of segments.
  const spanEntryBySegmentIndex = useMemo(() => {
    const out = new Map<number, FlaggedSpan[]>();
    for (const span of flaggedSpans) {
      for (let i = 0; i < segments.length; i++) {
        if (spansOverlappingSegment([span], segments[i]).length > 0) {
          const existing = out.get(i) ?? [];
          existing.push(span);
          out.set(i, existing);
          break;
        }
      }
    }
    return out;
  }, [segments, flaggedSpans]);

  // Detect real user intent to scroll the transcript so we can suspend
  // auto-scroll for a few seconds after they interact. We listen to
  // `wheel`, `pointerdown`, and `touchstart` — these only fire on actual
  // user input. Crucially we do NOT listen to `scroll`, which also fires
  // for programmatic scrolls (like the `scrollIntoView` below) and would
  // create a self-suppressing loop.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const markUserInteracted = () => {
      lastUserScrollAtRef.current = performance.now();
    };
    vp.addEventListener("wheel", markUserInteracted, { passive: true });
    vp.addEventListener("pointerdown", markUserInteracted, { passive: true });
    vp.addEventListener("touchstart", markUserInteracted, { passive: true });
    return () => {
      vp.removeEventListener("wheel", markUserInteracted);
      vp.removeEventListener("pointerdown", markUserInteracted);
      vp.removeEventListener("touchstart", markUserInteracted);
    };
  }, []);

  // Auto-scroll the active segment into view on every `activeIndex` change
  // (driven by wavesurfer `timeupdate`). Skipped for `AUTO_SCROLL_SUSPEND_MS`
  // after any real user interaction so the listener can read without being
  // yanked back to the current moment.
  //
  // Positioning rule: for the first three segments, keep the transcript
  // scrolled to the top (they're naturally visible). From segment 4
  // onward, anchor the segment at `activeIndex - 2` to the viewport top
  // so the active row lands in the third visible position — keeps two
  // lines of context above the playhead without burying upcoming lines.
  //
  // We manually compute the viewport's scrollTop instead of calling
  // `segment.scrollIntoView(...)` because the native API walks every
  // scrollable ancestor and will scroll the page body too — we only want
  // the transcript's own overflow container to move.
  useEffect(() => {
    const lastManual = lastUserScrollAtRef.current;
    const now = performance.now();
    if (now - lastManual < AUTO_SCROLL_SUSPEND_MS) return;
    if (activeIndex < 0) return;
    const container = viewportRef.current;
    if (!container) return;

    // Respect OS-level reduced-motion preference for auto-scroll. The JS
    // `behavior` option overrides the global CSS `scroll-behavior: auto`
    // rule set in globals.css, so we read matchMedia directly here.
    const behavior: ScrollBehavior =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";

    if (activeIndex < 3) {
      // First three active segments: leave the transcript at the top so
      // the opening of the recording reads naturally from the first line.
      container.scrollTo({ top: 0, behavior });
      return;
    }

    // Anchor row: show the segment two above the active one at the very
    // top of the viewport so the active row is the third visible segment.
    const anchor = segmentRefs.current.get(activeIndex - 2);
    if (!anchor) return;
    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const target =
      anchorRect.top - containerRect.top + container.scrollTop;
    container.scrollTo({ top: Math.max(0, target), behavior });
  }, [activeIndex]);

  // Scroll to the focused search match whenever it changes. Treating this
  // as a user-initiated scroll also suspends the playback auto-scroll for
  // `AUTO_SCROLL_SUSPEND_MS` so the listener can read the hit before the
  // playhead yanks the pane elsewhere.
  useEffect(() => {
    if (focusedMatchSegmentIndex < 0) return;
    const container = viewportRef.current;
    if (!container) return;
    const anchor = segmentRefs.current.get(focusedMatchSegmentIndex);
    if (!anchor) return;

    lastUserScrollAtRef.current = performance.now();

    const behavior: ScrollBehavior =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";

    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    // Center the focused match roughly a third of the way down the
    // viewport so there's breathing room above it to read surrounding
    // context.
    const target =
      anchorRect.top -
      containerRect.top +
      container.scrollTop -
      container.clientHeight / 3;
    container.scrollTo({ top: Math.max(0, target), behavior });
  }, [focusedMatchSegmentIndex]);

  return (
    <ScrollArea className="h-full">
      <div
        ref={(node) => {
          viewportRef.current = node;
        }}
        className="scrollbar-soft h-full max-h-[55vh] overflow-y-auto pr-3 md:max-h-[36vh]"
      >
        <ol className="flex flex-col gap-2">
          {groups.map((group, gi) => (
            <li
              key={gi}
              className={cn(
                "flex flex-col gap-0.5",
                // Hairline rule above every role change so conversational
                // turn-taking reads at a skim (Player UX Move 5). First
                // group has no rule — it opens the transcript.
                gi > 0 && "border-t border-border/40 pt-3 mt-2",
              )}
            >
              <p
                className={cn(
                  "font-mono text-[10px] font-semibold tracking-[0.18em] uppercase",
                  group.role === "interviewer" && "text-muted-foreground",
                  group.role === "interviewee" && "text-primary",
                  group.role === "other" && "text-muted-foreground/80",
                  group.role === "unknown" && "text-muted-foreground/70",
                )}
              >
                {namesForRole(group.role, speakers) ?? roleLabel(group.role)}
              </p>
              <div className="flex flex-col gap-1">
                {group.segments.map(({ segment, index }) => (
                  <TranscriptSegmentRow
                    key={index}
                    ref={(el) => {
                      if (el) segmentRefs.current.set(index, el);
                      else segmentRefs.current.delete(index);
                    }}
                    segment={segment}
                    index={index}
                    isActive={index === activeIndex}
                    isLowConfidence={
                      segment.speaker_confidence === "low"
                    }
                    spanEntries={spanEntryBySegmentIndex.get(index)}
                    onSeek={seekAndPlay}
                    searchQuery={searchQuery}
                    isSearchFocused={index === focusedMatchSegmentIndex}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </ScrollArea>
  );
}
