/**
 * Steward context notes for neighborhood pages (F-places, PRD §7.7 wiki
 * seed). EDITORIAL SLOT — intentionally empty. A steward-written note
 * (2–4 short paragraphs: what the place was, what changed, what the
 * recordings add) goes here keyed by `placeSlug(name)`; pages without one
 * show a clearly marked "forthcoming" placeholder. Notes are framing, so
 * they carry an author and date and never paraphrase a narrator.
 *
 * Example:
 *   "sweet-auburn": {
 *     body: ["Paragraph one…", "Paragraph two…"],
 *     author: "Steward name, Atlanta History Center",
 *     updated: "2026-11-15",
 *   },
 */
export type PlaceNote = { body: string[]; author: string; updated: string };

export const PLACE_NOTES: Record<string, PlaceNote> = {};
