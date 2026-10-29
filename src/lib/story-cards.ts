/**
 * Printable story cards (F-story, PRD §7.6 template mode). Pure helpers:
 * the quote on a card is the narrator's own words — the verbatim (machine)
 * transcript for the moment, interviewer turns removed — never an AI
 * summary, and every sheet carries the "generated from stories by …" line.
 */
import { clipQuote } from "@/lib/clips";

type Segment = {
  start: number;
  end: number;
  text: string;
  speaker_role?: "interviewer" | "interviewee" | "other" | null;
};

/** Narrator's words in [start, end); falls back to every speaker if the
 *  range has no interviewee turns (or no diarization). */
export function narratorQuote(segments: Segment[], start: number, end: number, maxChars = 260): string {
  const narrator = segments.filter((s) => s.speaker_role !== "interviewer");
  return clipQuote(narrator, { start, end }, maxChars) || clipQuote(segments, { start, end }, maxChars);
}

/** Time range covered by a brief moment's `segment_indices`. */
export function momentRange(
  segments: Pick<Segment, "start" | "end">[],
  indices: number[] | undefined,
): { start: number; end: number } | null {
  const valid = (indices ?? []).filter((i) => Number.isInteger(i) && segments[i]);
  if (valid.length === 0) return null;
  return {
    start: segments[Math.min(...valid)].start,
    end: segments[Math.max(...valid)].end,
  };
}

/** PRD §7.6: "generated from stories by [names]". */
export function attributionLine(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return "Generated from stories in the Living Atlanta collection";
  const list =
    unique.length === 1
      ? unique[0]
      : `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
  return `Generated from stories by ${list}`;
}
