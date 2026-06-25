import "server-only";

import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import type { ContentAdvisory } from "@/lib/queries/recordings";

/**
 * Interactive Timeline data shape (PRD §7.3, §7.3.1).
 *
 * Returns the archive flattened into three layers the Timeline's static
 * SVG render consumes directly:
 *
 *  - `moments`         : every authored brief-moment across the corpus,
 *                        joined with its recording's catalog + primary
 *                        interviewee + content advisory so a single
 *                        round-trip powers the whole axis.
 *  - `historicalEvents`: the union of every `metadata_extracted.historical_events`
 *                        entry, deduped by (normalized label, year_anchor)
 *                        across recordings. `recordingCount` is the number
 *                        of source recordings that mentioned this event —
 *                        carries an implicit weight we'll surface later as
 *                        marker size or lane ordering.
 *  - `yearRange`       : [min era_start_year across moments and events,
 *                        max era_end_year|year_end|max(year)]. Gives the
 *                        axis a meaningful default scale without a manual
 *                        constant, and grows naturally as new recordings
 *                        ingest.
 *
 * Historical-event dating after the v4 schema pass:
 *  - Single-year events carry `{year, year_start: null, year_end: null}`.
 *  - Multi-year events carry `{year: null, year_start, year_end}`.
 *  - Undated events (legacy v3 rows that weren't enriched) land with all
 *    three null and are dropped before return — the Timeline has nothing
 *    to do with them.
 */

export type TimelineMoment = {
  recordingId: string;
  catalogNumber: string;
  recordingTitle: string;
  intervieweeName: string | null;
  contentAdvisory: ContentAdvisory | null;
  momentIndex: number;
  startTime: number;
  endTime: number;
  title: string;
  summary: string | null;
  highlight: boolean;
  highlightReason: string | null;
  themes: string[];
  neighborhoods: string[];
  eraStartYear: number | null;
  eraEndYear: number | null;
  eraLabel: string | null;
};

export type TimelineHistoricalEvent = {
  label: string;
  category: string;
  /** Single-year anchor. Null when this is a multi-year range. */
  year: number | null;
  /** Range-mode year bounds. Both null when this is a single-year event. */
  yearStart: number | null;
  yearEnd: number | null;
  /** How many recordings mention this event. For v1 we use it as a visual
   *  weight signal; v2 may expose it as a filter. */
  recordingCount: number;
  /** Recording catalog numbers that mention this event, for tooltip. */
  recordingCatalogs: string[];
};

export type TimelineData = {
  moments: TimelineMoment[];
  historicalEvents: TimelineHistoricalEvent[];
  yearRange: [number, number];
};

/** Default axis bounds if the archive is empty or year derivation fails.
 *  Matches the PRD's 1914–1977 collection span padded a decade either side. */
const FALLBACK_YEAR_RANGE: [number, number] = [1900, 1990];

/** Left-edge hard floor — axis never starts earlier than this, regardless
 *  of outlier moments. A handful of pre-1855 references exist in the
 *  corpus (the 1811 moment, etc.) but they stretch the axis so far left
 *  that the real signal density (1880-onwards) gets squeezed. Lift this
 *  manually when a pre-1855 cluster forms that warrants the expansion. */
const DISPLAY_AXIS_START_FLOOR = 1855;

/** Right-edge soft floor — axis always extends at least this far, and
 *  grows past when data warrants (current latest moment + 5y padding).
 *  Keeps the visual symmetric with the left floor when the corpus ends
 *  a little short of 1980. */
const DISPLAY_AXIS_END_FLOOR = 1985;

async function _fetchTimelineDataInner(): Promise<TimelineData> {
  // ---------------------------------------------------------------
  // Moments — flatten brief.moments[] with `ordinality` so we keep
  // the authored order as `momentIndex` (1-indexed; subtract 1 for
  // segment_indices parity).
  // ---------------------------------------------------------------
  const momentRows = await db.execute<{
    recording_id: string;
    catalog_number: string;
    title: string;
    content_advisory: ContentAdvisory | null;
    interviewee_name: string | null;
    moment_index: number;
    start_time: number;
    end_time: number;
    moment_title: string;
    moment_summary: string | null;
    highlight: boolean;
    highlight_reason: string | null;
    themes: string[];
    neighborhoods: string[];
    era_start_year: number | null;
    era_end_year: number | null;
    era_label: string | null;
  }>(sql`
    SELECT
      r.id              AS recording_id,
      r.catalog_number,
      r.title,
      r.content_advisory,
      (
        SELECT min(s.name) FROM public.recording_speakers rs
        JOIN public.speakers s ON s.id = rs.speaker_id
        WHERE rs.recording_id = r.id AND rs.role = 'interviewee'
      ) AS interviewee_name,
      (moment.ordinality - 1)::int                        AS moment_index,
      coalesce((moment.value->>'start_time')::float, 0)   AS start_time,
      coalesce((moment.value->>'end_time')::float, 0)     AS end_time,
      coalesce(moment.value->>'title', 'Moment')          AS moment_title,
      moment.value->>'summary'                            AS moment_summary,
      coalesce((moment.value->>'highlight')::boolean, false) AS highlight,
      moment.value->>'highlight_reason'                   AS highlight_reason,
      coalesce(
        ARRAY(SELECT jsonb_array_elements_text(moment.value->'themes')),
        ARRAY[]::text[]
      ) AS themes,
      coalesce(
        ARRAY(SELECT jsonb_array_elements_text(moment.value->'neighborhoods')),
        ARRAY[]::text[]
      ) AS neighborhoods,
      nullif(moment.value->>'era_start_year', '')::int   AS era_start_year,
      nullif(moment.value->>'era_end_year', '')::int     AS era_end_year,
      moment.value->>'era_label'                          AS era_label
    FROM public.recordings r
    JOIN public.metadata_extracted m ON m.recording_id = r.id
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(m.brief->'moments', '[]'::jsonb))
      WITH ORDINALITY AS moment(value, ordinality)
    WHERE r.transcription_status = 'completed'
    ORDER BY era_start_year NULLS LAST, r.catalog_number, moment_index
  `);

  const moments: TimelineMoment[] = momentRows.map((row) => ({
    recordingId: row.recording_id,
    catalogNumber: row.catalog_number,
    recordingTitle: row.title,
    intervieweeName: row.interviewee_name,
    contentAdvisory: (row.content_advisory ?? null) as ContentAdvisory | null,
    momentIndex: row.moment_index,
    startTime: row.start_time,
    endTime: row.end_time,
    title: row.moment_title,
    summary: row.moment_summary,
    highlight: row.highlight,
    highlightReason: row.highlight_reason,
    themes: row.themes ?? [],
    neighborhoods: row.neighborhoods ?? [],
    eraStartYear: row.era_start_year,
    eraEndYear: row.era_end_year,
    eraLabel: row.era_label,
  }));

  // ---------------------------------------------------------------
  // Historical events — flatten across the corpus and dedup by
  // (lowercased-trimmed label, year_anchor). year_anchor is `year`
  // for single-year events or `year_start` for ranges; same label
  // + same anchor collapses to one row.
  //
  // We aggregate `recording_count = count(DISTINCT recording_id)` and
  // `recording_catalogs` so the Timeline can surface which narrators
  // told this story. Null-year events are filtered out — nothing to
  // plot — but still contribute to category facets elsewhere.
  // ---------------------------------------------------------------
  const eventRows = await db.execute<{
    label: string;
    category: string;
    year: number | null;
    year_start: number | null;
    year_end: number | null;
    recording_count: number;
    recording_catalogs: string[];
  }>(sql`
    WITH flat AS (
      SELECT
        trim(e.value->>'label')                AS label,
        e.value->>'category'                   AS category,
        nullif(e.value->>'year', '')::int      AS year,
        nullif(e.value->>'year_start', '')::int AS year_start,
        nullif(e.value->>'year_end', '')::int   AS year_end,
        r.id                                    AS recording_id,
        r.catalog_number
      FROM public.recordings r
      JOIN public.metadata_extracted m ON m.recording_id = r.id
      CROSS JOIN LATERAL jsonb_array_elements(
        coalesce(m.historical_events, '[]'::jsonb)
      ) AS e(value)
      WHERE r.transcription_status = 'completed'
    ),
    grouped AS (
      SELECT
        label,
        category,
        year,
        year_start,
        year_end,
        count(DISTINCT recording_id)::int AS recording_count,
        array_agg(DISTINCT catalog_number ORDER BY catalog_number) AS recording_catalogs
      FROM flat
      WHERE label IS NOT NULL
        AND label <> ''
        AND (year IS NOT NULL OR year_start IS NOT NULL)
      GROUP BY
        lower(label),  -- dedup key: normalized label …
        coalesce(year_start, year),  -- … and the anchoring year
        label,
        category,
        year,
        year_start,
        year_end
    )
    SELECT
      label,
      category,
      year,
      year_start,
      year_end,
      recording_count,
      recording_catalogs
    FROM grouped
    ORDER BY coalesce(year_start, year) ASC, label ASC
  `);

  const historicalEvents: TimelineHistoricalEvent[] = eventRows.map((row) => ({
    label: row.label,
    category: row.category,
    year: row.year,
    yearStart: row.year_start,
    yearEnd: row.year_end,
    recordingCount: row.recording_count,
    recordingCatalogs: row.recording_catalogs ?? [],
  }));

  // ---------------------------------------------------------------
  // Year range — widest span of (moment era starts, event year anchors)
  // with a decade of padding either side to give the axis breathing
  // room. Falls back to a sensible default if the archive is empty.
  // ---------------------------------------------------------------
  const allStarts: number[] = [];
  const allEnds: number[] = [];
  for (const m of moments) {
    if (m.eraStartYear != null) allStarts.push(m.eraStartYear);
    if (m.eraEndYear != null) allEnds.push(m.eraEndYear);
    if (m.eraStartYear != null && m.eraEndYear == null) allEnds.push(m.eraStartYear);
  }
  for (const e of historicalEvents) {
    if (e.year != null) {
      allStarts.push(e.year);
      allEnds.push(e.year);
    }
    if (e.yearStart != null) allStarts.push(e.yearStart);
    if (e.yearEnd != null) allEnds.push(e.yearEnd);
  }

  // Five-year breathing room on each side — tight enough that moments and
  // events fill the canvas instead of floating in empty gutters, wide
  // enough that the earliest/latest markers aren't clipping the edge.
  // Left edge is hard-floored at DISPLAY_AXIS_START_FLOOR to keep outlier
  // pre-1855 references from stretching the axis; right edge takes the
  // max of the soft floor and (dataMax + 5) so the axis grows naturally
  // as new late-20th-century recordings land.
  const yearRange: [number, number] =
    allStarts.length === 0 || allEnds.length === 0
      ? FALLBACK_YEAR_RANGE
      : [
          Math.max(DISPLAY_AXIS_START_FLOOR, Math.min(...allStarts) - 5),
          Math.max(DISPLAY_AXIS_END_FLOOR, Math.max(...allEnds) + 5),
        ];

  return { moments, historicalEvents, yearRange };
}

/**
 * Cached Timeline data loader. Invalidates on the same `facets` /
 * `archive-stats` tag family the Browser uses — Timeline content changes
 * when the pipeline ingests or re-ingests a recording, which is already
 * wired through `/api/revalidate?tag=facets` from `scripts/ingest.py`.
 *
 * 1h TTL is the safety net when the webhook's env vars are unset.
 */
export const fetchTimelineData = unstable_cache(
  _fetchTimelineDataInner,
  ["timeline-data"],
  { tags: ["facets", "timeline"], revalidate: 3600 },
);
