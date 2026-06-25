/**
 * Pure helpers shared by the Audio Player components. Import from either RSC
 * or client components — no DB or browser-only deps.
 */

import type {
  FlaggedSpan,
  TranscriptSegment,
} from "@/lib/queries/player";
import type { BriefMoment } from "@/lib/queries/recordings";

// ---------------------------------------------------------------------------
// Segment / moment / span resolvers
// ---------------------------------------------------------------------------

/**
 * Resolve a moment's canonical time range from its `segment_indices`. This is
 * the segment-indices-canonical binding described in PRD §7.3.1 — the cached
 * `start_time` / `end_time` on the moment are display convenience only;
 * seeking should always go through the current segment array so re-
 * transcription doesn't desynchronize chapters from audio.
 *
 * Returns `null` when the moment has no usable indices (e.g. corrupted brief).
 */
export function momentTimeRange(
  moment: BriefMoment,
  segments: TranscriptSegment[],
): { start: number; end: number } | null {
  const indices = moment.segment_indices ?? [];
  if (indices.length === 0 || segments.length === 0) return null;
  const first = indices[0];
  const last = indices[indices.length - 1];
  const startSeg = segments[first];
  const endSeg = segments[last];
  if (!startSeg || !endSeg) return null;
  return { start: startSeg.start, end: endSeg.end };
}

/**
 * Binary-search for the segment currently active at `time`. Returns the index
 * in `segments`, or -1 if none match (time before first segment, or after
 * last). Segments are assumed non-overlapping and sorted by `start`.
 */
export function currentSegmentIndex(
  time: number,
  segments: TranscriptSegment[],
): number {
  if (segments.length === 0) return -1;
  let lo = 0;
  let hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = segments[mid];
    if (time < seg.start) hi = mid - 1;
    else if (time > seg.end) lo = mid + 1;
    else return mid;
  }
  // Fallback to nearest: if past the end of `lo`, return the last segment
  // when we're past its end, otherwise -1.
  if (lo >= segments.length) {
    return segments.length - 1;
  }
  return -1;
}

/**
 * Filter flagged spans to those whose time range overlaps a given segment.
 * A span and segment overlap when `span.start < seg.end && span.end > seg.start`.
 */
export function spansOverlappingSegment(
  spans: FlaggedSpan[],
  segment: Pick<TranscriptSegment, "start" | "end">,
): FlaggedSpan[] {
  return spans.filter(
    (s) => s.start < segment.end && s.end > segment.start,
  );
}

// ---------------------------------------------------------------------------
// Transport-side formatting + parsing
// ---------------------------------------------------------------------------

/**
 * "MM:SS" when under an hour, "H:MM:SS" otherwise — matches podcast-app
 * convention and is what the share-URL `?t=` parameter encodes into.
 */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Decode a share-URL timestamp like "14:32" or "1:08:30" into seconds.
 * Returns `null` when the string is missing or malformed.
 */
export function parseShareTime(param: string | null | undefined): number | null {
  if (!param) return null;
  const parts = param.split(":").map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map((p) => Number.parseInt(p, 10));
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return null;
}

// ---------------------------------------------------------------------------
// Text cleanup
// ---------------------------------------------------------------------------

/**
 * Strip whisper.cpp special tokens (`[_BEG_]`, `[_TT_*]`) from segment text
 * before display. PRD §6.3.1 notes these are metadata, not speech content.
 */
export function cleanSegmentText(text: string): string {
  return text.replace(/\[_[A-Z0-9_]+_\]/g, "").trim();
}

// ---------------------------------------------------------------------------
// Humanization — category + severity labels used in sensitivity marker UI
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  period_racial_slurs: "Period racial language",
  racial_violence: "Racial violence",
  kkk_activity: "KKK activity",
  lynching_reference: "Lynching reference",
  sexual_content: "Sexual content",
  substance_use: "Substance use",
  draft_resistance_suicide: "Draft resistance (suicide)",
  domestic_violence: "Domestic violence",
  child_labor: "Child labor",
  forced_labor: "Forced labor",
};

const SEVERITY_LABELS: Record<string, string> = {
  historical_quotation: "Historical quotation",
  narrative: "Narrative mention",
  graphic: "Graphic description",
  gratuitous: "Gratuitous content",
};

export function humanCategory(raw: string | undefined | null): string {
  if (!raw) return "Content notice";
  return CATEGORY_LABELS[raw] ?? raw.replace(/_/g, " ");
}

export function humanSeverity(raw: string | undefined | null): string {
  if (!raw) return "";
  return SEVERITY_LABELS[raw] ?? raw.replace(/_/g, " ");
}
