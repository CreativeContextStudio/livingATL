import "server-only";

import QRCode from "qrcode";

import { formatSpeakerName } from "@/lib/format";
import { findPath, momentKey } from "@/lib/paths";
import { hasSlur } from "@/lib/off-site-text";
import { contentNotesFor, formatTimestamp, humanCategory } from "@/lib/player";
import { fetchPlayerData, type PlayerData } from "@/lib/queries/player";
import { fetchTimelineData } from "@/lib/queries/timeline";
import { siteUrl } from "@/lib/site-url";
import { momentRange, narratorQuote } from "@/lib/story-cards";

/**
 * Story cards for a listening path or one recording's highlights (F-story).
 * Each card: the narrator's words for the moment, who/where/when, and a QR
 * code (inline SVG, rendered here — no client JS) that opens that exact
 * clip in the Player. A card cut from the sheet has no pre-playback note in
 * front of it, so a flagged passage isn't quoted: the card carries the
 * recording's card line and a content note, and the QR leads to the audio.
 */

export type StoryCard = {
  key: string;
  title: string;
  /** The narrator's words; null when the passage is flagged. */
  quote: string | null;
  /** Shown instead of `quote` (the recording's card line). */
  line: string;
  speaker: string;
  place: string | null;
  era: string | null;
  recorded: string | null;
  catalogNumber: string;
  range: string;
  url: string;
  qrSvg: string;
  /** Flagged-passage categories this clip overlaps (F-flagged vocabulary). */
  notice: string | null;
};

export type StoryCardSet = { heading: string; backHref: string; cards: StoryCard[]; speakers: string[] };

const MAX_CARDS = 8;

type Pick = {
  catalogNumber: string;
  momentIndex: number;
  title: string;
  start: number;
  end: number;
  neighborhoods: string[];
  era: string | null;
};

function eraOf(label: string | null | undefined, from: number | null | undefined, to: number | null | undefined) {
  if (label) return label;
  if (from == null) return null;
  return to != null && to !== from ? `${from}–${to}` : String(from);
}

async function toCard(pick: Pick, data: PlayerData): Promise<StoryCard> {
  const interviewee = data.speakers.find((s) => s.role === "interviewee");
  const url = new URL(
    `/player/${encodeURIComponent(pick.catalogNumber)}?t=${formatTimestamp(pick.start)}&end=${formatTimestamp(pick.end)}`,
    siteUrl(),
  ).toString();
  const words = narratorQuote(data.transcriptSegments, pick.start, pick.end);
  const notes = contentNotesFor(data.flaggedSpans, pick.start, pick.end).map((n) => humanCategory(n.category));
  // Spans can miss a passage; a slur in the words themselves still counts.
  if (notes.length === 0 && hasSlur(words)) notes.push(humanCategory("period_racial_slurs"));
  return {
    key: momentKey(pick.catalogNumber, pick.momentIndex),
    title: pick.title,
    quote: notes.length > 0 ? null : words,
    line: data.cardLine,
    speaker: interviewee ? formatSpeakerName(interviewee.name) : data.title,
    place: pick.neighborhoods[0] ?? data.neighborhoods[0] ?? null,
    era: pick.era,
    recorded: data.recordingDate?.slice(0, 4) ?? null,
    catalogNumber: pick.catalogNumber,
    range: `${formatTimestamp(pick.start)}–${formatTimestamp(pick.end)}`,
    url,
    qrSvg: await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
    notice: notes.join(", ") || null,
  };
}

async function build(heading: string, backHref: string, picks: Pick[]): Promise<StoryCardSet> {
  const catalogs = [...new Set(picks.map((p) => p.catalogNumber))];
  const data = new Map(
    (await Promise.all(catalogs.map(async (c) => [c, await fetchPlayerData(c)] as const))).filter(
      (e): e is readonly [string, PlayerData] => e[1] !== null,
    ),
  );
  const cards = await Promise.all(
    picks.filter((p) => data.has(p.catalogNumber)).map((p) => toCard(p, data.get(p.catalogNumber)!)),
  );
  return { heading, backHref, cards, speakers: cards.map((c) => c.speaker) };
}

export async function storyCardsForPath(slug: string): Promise<StoryCardSet | null> {
  const path = findPath(slug);
  if (!path) return null;
  const { moments } = await fetchTimelineData();
  const byKey = new Map(moments.map((m) => [momentKey(m.catalogNumber, m.momentIndex), m]));
  const picks = path.steps.flatMap((s) => {
    const m = byKey.get(momentKey(s.catalogNumber, s.momentIndex));
    return m
      ? [{ catalogNumber: m.catalogNumber, momentIndex: m.momentIndex, title: m.title, start: m.startTime, end: m.endTime, neighborhoods: m.neighborhoods, era: eraOf(m.eraLabel, m.eraStartYear, m.eraEndYear) }]
      : [];
  });
  return build(path.title, `/paths/${path.slug}`, picks.slice(0, MAX_CARDS));
}

export async function storyCardsForRecording(catalogNumber: string): Promise<StoryCardSet | null> {
  const data = await fetchPlayerData(catalogNumber);
  if (!data) return null;
  const all = data.briefMoments.map((m, i) => ({ m, i }));
  const chosen = (all.some(({ m }) => m.highlight) ? all.filter(({ m }) => m.highlight) : all).slice(0, MAX_CARDS);
  const picks = chosen.flatMap(({ m, i }) => {
    const range = momentRange(data.transcriptSegments, m.segment_indices);
    return range && m.title
      ? [{ catalogNumber, momentIndex: i, title: m.title, ...range, neighborhoods: m.neighborhoods ?? [], era: eraOf(m.era_label, m.era_start_year, m.era_end_year) }]
      : [];
  });
  return build(data.title, `/player/${encodeURIComponent(catalogNumber)}`, picks);
}
