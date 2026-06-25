/**
 * Canonical advisory text — historical framing for the Living Atlanta
 * oral history recordings (1914–1977).
 *
 * Versioned so editorial revisions don't retroactively rewrite flagged
 * recordings in the DB. Each `public.recordings.content_advisory` row
 * stores `advisory_version: "livingatl-v1"` (or whatever version the
 * steward was reviewing under). When the wording is updated, add a new
 * entry here — do NOT modify existing entries in place.
 *
 * Usage (pending Phase 2 UI):
 *   - Collection Browser card: show a badge when `display_advisory: true`,
 *     linked to the current version's `short` text.
 *   - Audio Player pre-playback gate: show the current version's `full`
 *     text, require explicit "I understand, play recording" click before
 *     autoplay.
 *
 * Policy: livingATL preserves the historical record exactly as it was
 * spoken. The advisory is framing, not censorship. See PRD §8.5.
 */

export const LATEST_ADVISORY_VERSION = "livingatl-v2" as const;

export type AdvisoryVersion = "livingatl-v1" | "livingatl-v2";

export interface AdvisoryText {
  /** Short label for Browser cards and search results. */
  short: string;
  /** Header shown at the top of the pre-playback gate. */
  title: string;
  /** Full body text shown before playback. */
  full: string;
  /** Continue-action button label. */
  continueLabel: string;
}

/**
 * Wording for livingatl-v1.
 *
 * Review state (2026-04-17): **internally approved by project lead** — the
 * text below is the intended Phase 2 wording. Still pending external-
 * stakeholder sign-off (WRFG, Atlanta History Center, community reviewers,
 * and any other editorial partners your review chain includes). Until all
 * external reviews return, treat this as final-subject-to-revision: the
 * Phase 2 UI can build against it and the 48 DB rows referencing
 * `livingatl-v1` remain valid, but if external review returns substantive
 * changes, bump to `livingatl-v2` and UPDATE `public.recordings.content_advisory`
 * rather than rewriting this entry in place.
 *
 * Add review sign-offs as comments below this block as they come in, e.g.
 *   - 2026-MM-DD — WRFG editorial board (approved / revisions requested)
 *   - 2026-MM-DD — AHC Kenan Research Center (approved)
 *   - 2026-MM-DD — community reviewer cohort (approved)
 */
export const ADVISORY_VERSIONS: Record<AdvisoryVersion, AdvisoryText> = {
  "livingatl-v1": {
    short: "Historical recording — contains period-specific language and themes.",
    title: "A note before you listen",
    full:
      "livingATL presents oral history recordings from the Living Atlanta collection (1914–1977) exactly as they were spoken. " +
      "This recording contains period-specific language and descriptions of racial violence, hate groups, or other themes that may be distressing to contemporary listeners. " +
      "These are historical documents — not endorsements, not reflections of livingATL's viewpoints, and not curated for comfort. " +
      "We preserve them so that the voices of the people who lived through this era remain audible in their own words. " +
      "If you need to pause, close this tab and come back later.",
    continueLabel: "I understand, play recording",
  },
  /**
   * Wording for livingatl-v2 (2026-04-20).
   *
   * Voice pass: em dashes removed from prose for a more human cadence. No
   * change in editorial meaning or scope. Still pending the same external
   * sign-offs as v1 (WRFG, AHC, community reviewers); v1 rows in the DB
   * remain valid until migrated.
   */
  "livingatl-v2": {
    short: "Historical recording. Contains period-specific language and themes.",
    title: "A note before you listen",
    full:
      "livingATL presents oral history recordings from the Living Atlanta collection (1914–1977) exactly as they were spoken. " +
      "This recording contains period-specific language and descriptions of racial violence, hate groups, or other themes that may be distressing to contemporary listeners. " +
      "These are historical documents, not endorsements, not reflections of livingATL's viewpoints, and not curated for comfort. " +
      "We preserve them so that the voices of the people who lived through this era remain audible in their own words. " +
      "If you need to pause, close this tab and come back later.",
    continueLabel: "I understand, play recording",
  },
};

/**
 * Helper: return the advisory text for the version a recording was
 * flagged under. Falls back to `LATEST_ADVISORY_VERSION` if the row
 * references an unknown version (which should only happen if you
 * removed a version entry here without migrating rows).
 */
export function getAdvisoryText(version: AdvisoryVersion | string | null): AdvisoryText {
  if (version && version in ADVISORY_VERSIONS) {
    return ADVISORY_VERSIONS[version as AdvisoryVersion];
  }
  return ADVISORY_VERSIONS[LATEST_ADVISORY_VERSION];
}

// ---------------------------------------------------------------------------
// AI advisory — platform-level disclosure about AI's role in building
// livingATL. Separate from the per-recording content advisory above.
// Non-blocking: this text is exposed as an "AI advisory" link at the end of
// the Summary card on every Player page, opening a dismissible dialog.
// ---------------------------------------------------------------------------

export const LATEST_AI_ADVISORY_VERSION = "ai-v2" as const;

export type AIAdvisoryVersion = "ai-v1" | "ai-v2";

export interface AIAdvisoryText {
  title: string;
  body: string;
}

export const AI_ADVISORY_VERSIONS: Record<AIAdvisoryVersion, AIAdvisoryText> = {
  "ai-v1": {
    title: "How this platform was built",
    body:
      "livingATL was built with help from AI agentic tools. " +
      "No audio was altered, no transcript was rewritten, no spoken word was edited. " +
      "AI assisted with the interface you're using and with organizing the metadata around each recording — the themes, neighborhoods, chapters, and summaries. " +
      "Every curatorial decision was reviewed by a human before publishing, with the explicit goal of preserving authentic Atlanta voices and history as they were spoken. " +
      "If you notice anything that seems to undermine that goal, we want to hear from you.",
  },
  "ai-v2": {
    title: "How this platform was built",
    body:
      "livingATL was built with help from AI agentic tools. " +
      "No audio was altered, no transcript was rewritten, no spoken word was edited. " +
      "AI assisted with the interface you're using and with organizing the metadata around each recording: the themes, neighborhoods, chapters, and summaries. " +
      "Every curatorial decision was reviewed by a human before publishing, with the explicit goal of preserving authentic Atlanta voices and history as they were spoken. " +
      "If you notice anything that seems to undermine that goal, we want to hear from you.",
  },
};

export function getAIAdvisoryText(
  version: AIAdvisoryVersion | string | null = LATEST_AI_ADVISORY_VERSION,
): AIAdvisoryText {
  if (version && version in AI_ADVISORY_VERSIONS) {
    return AI_ADVISORY_VERSIONS[version as AIAdvisoryVersion];
  }
  return AI_ADVISORY_VERSIONS[LATEST_AI_ADVISORY_VERSION];
}
