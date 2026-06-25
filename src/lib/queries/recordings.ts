import "server-only";

import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import {
  recordings,
  recordingSpeakers,
  speakers,
} from "@/db/schema";
import {
  eraRangeFromMoments,
  formatSpeakerName,
} from "@/lib/format";

// ---------------------------------------------------------------------------
// Type re-exports. BriefMoment + ContentAdvisory + BrowserBrief stay because
// the Player (`fetchPlayerData`) and Map still consume them.
// ---------------------------------------------------------------------------

export type ContentAdvisory = {
  reviewed?: boolean;
  display_advisory?: boolean;
  sensitive_themes?: string[];
  advisory_version?: string;
};

export type BriefMoment = {
  segment_indices?: number[];
  title?: string;
  summary?: string;
  highlight?: boolean;
  highlight_reason?: string;
  themes?: string[];
  neighborhoods?: string[];
  era_start_year?: number | null;
  era_end_year?: number | null;
  era_label?: string;
};

export type BrowserBrief = {
  transcript_hash?: string;
  overview?: string;
  moments?: BriefMoment[];
};

export type BrowserInterviewee = {
  name: string;
  birthYear: number | null;
  deathYear: number | null;
};

/**
 * Trim row shape for Browser cards + Map aggregation. Dropped from the
 * pre-Week-4 shape: the full `briefMoments` array. We keep the summary
 * fields (`briefOverview`, `eraRange`) + `contentDecades` derived at
 * ingest, so the card has everything it needs and we don't ship ~4MB of
 * moment payload to the client at 400-recording scale.
 */
export type BrowserRecordingCard = {
  id: string;
  catalogNumber: string;
  title: string;
  durationSeconds: number | null;
  recordingDate: string | null;
  recordingDatePrecision: string | null;
  contentAdvisory: ContentAdvisory | null;
  createdAt: Date;
  aiSummary: string | null;
  briefOverview: string | null;
  eraRange: string | null;
  themes: string[];
  neighborhoods: string[];
  contentDecades: string[];
  interviewees: BrowserInterviewee[];
};

export type BrowserSort =
  | "alphabetical" // by surname (stored "Last, First" — archival order)
  | "alphabetical_first" // by given name ("First Last" display order)
  | "date_recorded_desc"
  | "duration_desc"
  | "date_added_desc"
  | "random"; // server-side shuffle — the default when no `?sort=` param
              //  is present so returning visitors get a fresh ordering
              //  each visit. Not advertised as a SortSelect option.

export type BrowserFilter = {
  theme?: string;
  neighborhood?: string;
  decade?: string; // "1920s"
  /** Organization category slug — matches one of
   *  scripts/config.py::ORGANIZATION_CATEGORIES. Filters to recordings
   *  that mention at least one organization in this bucket. */
  orgCategory?: string;
  /** Historical-event category slug — matches one of
   *  scripts/config.py::HISTORICAL_EVENT_CATEGORIES. */
  eventCategory?: string;
  /** Case-insensitive substring match across metadata + speaker names +
   *  brief overview + organizations. Backed by pg_trgm GIN indexes. */
  search?: string;
};

export type BrowserFacet = { value: string; count: number };
export type BrowserFacets = {
  themes: BrowserFacet[];
  neighborhoods: BrowserFacet[];
  decades: BrowserFacet[];
  orgCategories: BrowserFacet[];
  eventCategories: BrowserFacet[];
};

// ---------------------------------------------------------------------------
// Filter / sort / search — all in SQL
// ---------------------------------------------------------------------------

/**
 * Fetch Browser cards with filter + sort + search applied in SQL. Returns
 * only the matching rows (trimmed card shape), scaling cleanly from 48
 * to 400+ recordings without shipping unused brief payloads.
 *
 * Raw SQL rather than Drizzle-typed builder because the combination of
 * array containment, trigram ILIKE across joined tables, derived
 * speaker-name ordering, and jsonb traversal is cleaner as one
 * parameterized statement than as a stack of Drizzle fragments.
 */
export async function fetchBrowserRecordings(
  filter: BrowserFilter = {},
  sort: BrowserSort = "alphabetical",
): Promise<BrowserRecordingCard[]> {
  const whereClauses: SQL[] = [
    sql`r.transcription_status = 'completed'`,
  ];

  if (filter.theme) {
    whereClauses.push(sql`m.themes @> ARRAY[${filter.theme}]::text[]`);
  }
  if (filter.neighborhood) {
    whereClauses.push(
      sql`m.neighborhoods @> ARRAY[${filter.neighborhood}]::text[]`,
    );
  }
  if (filter.decade) {
    whereClauses.push(
      sql`m.content_decades @> ARRAY[${filter.decade}]::text[]`,
    );
  }
  if (filter.orgCategory) {
    // jsonb containment — matches when at least one entry in the
    // organizations array has the given category. Indexed via a GIN
    // jsonb_path_ops index when the corpus grows.
    whereClauses.push(
      sql`m.organizations @> jsonb_build_array(jsonb_build_object('category', ${filter.orgCategory}::text))`,
    );
  }
  if (filter.eventCategory) {
    whereClauses.push(
      sql`m.historical_events @> jsonb_build_array(jsonb_build_object('category', ${filter.eventCategory}::text))`,
    );
  }
  if (filter.search && filter.search.trim().length > 0) {
    const pattern = `%${filter.search.trim()}%`;
    whereClauses.push(sql`(
      r.title ILIKE ${pattern}
      OR r.catalog_number ILIKE ${pattern}
      OR coalesce(m.ai_summary, '') ILIKE ${pattern}
      OR coalesce(m.brief->>'overview', '') ILIKE ${pattern}
      OR EXISTS (
        SELECT 1 FROM public.recording_speakers rs2
        JOIN public.speakers s2 ON s2.id = rs2.speaker_id
        WHERE rs2.recording_id = r.id
          AND s2.name ILIKE ${pattern}
      )
      OR EXISTS (
        -- organizations moved from text[] to jsonb[{label, category}] in
        -- migration 0005; extract the label field when searching.
        SELECT 1 FROM jsonb_array_elements(m.organizations) AS org
        WHERE coalesce(org->>'label', '') ILIKE ${pattern}
      )
    )`);
  }

  // Primary interviewee used for alphabetical sort. min(name) keeps the
  // ORDER BY deterministic when a recording has multiple interviewees
  // (LDAndLauraKeith etc.); picking the lexicographically-first name is
  // stable and cheap. Aliased in a wrapper subquery so ORDER BY can see
  // it (Postgres won't resolve subquery-derived SELECT-list aliases in
  // ORDER BY of the same level).
  const orderBy = (() => {
    switch (sort) {
      case "alphabetical":
        // Surname-alphabetical. Stored names are "Last, First"; min(name)
        // sorts by the "Last" prefix as a side-effect.
        return sql`lower(sub.min_interviewee_name) ASC NULLS LAST`;
      case "alphabetical_first":
        // Given-name-alphabetical. split_part on ", " → ["Last", "First..."].
        return sql`lower(trim(split_part(sub.min_interviewee_name, ',', 2))) ASC NULLS LAST`;
      case "date_recorded_desc":
        return sql`sub.recording_date DESC NULLS LAST`;
      case "duration_desc":
        return sql`sub.duration_seconds DESC NULLS LAST`;
      case "date_added_desc":
        return sql`sub.created_at DESC NULLS LAST`;
      case "random":
        // Postgres `random()` is per-row and non-deterministic, so each
        // request to /browse without an explicit sort returns the cards
        // in a fresh order — the Collection's front door feels alive
        // for returning visitors.
        return sql`random()`;
      default:
        return sql`lower(sub.min_interviewee_name) ASC NULLS LAST`;
    }
  })();

  const whereSql = whereClauses.length
    ? sql`WHERE ${sql.join(whereClauses, sql` AND `)}`
    : sql``;

  const rows = await db.execute<{
    id: string;
    catalog_number: string;
    title: string;
    duration_seconds: number | null;
    recording_date: string | null;
    recording_date_precision: string | null;
    content_advisory: ContentAdvisory | null;
    created_at: Date;
    ai_summary: string | null;
    brief: BrowserBrief | null;
    themes: string[];
    neighborhoods: string[];
    content_decades: string[];
    min_interviewee_name: string | null;
  }>(sql`
    SELECT * FROM (
      SELECT
        r.id,
        r.catalog_number,
        r.title,
        r.duration_seconds,
        r.recording_date,
        r.recording_date_precision,
        r.content_advisory,
        r.created_at,
        m.ai_summary,
        m.brief,
        m.themes,
        m.neighborhoods,
        m.content_decades,
        (
          SELECT min(s.name) FROM public.recording_speakers rs
          JOIN public.speakers s ON s.id = rs.speaker_id
          WHERE rs.recording_id = r.id AND rs.role = 'interviewee'
        ) AS min_interviewee_name
      FROM public.recordings r
      LEFT JOIN public.metadata_extracted m ON m.recording_id = r.id
      ${whereSql}
    ) sub
    ORDER BY ${orderBy}
  `);

  if (rows.length === 0) return [];

  // Second round-trip for interviewees — keeps the primary query simple
  // and avoids jsonb_agg+filter ceremony. At 400 rows this is one fast
  // index scan on recording_speakers.
  const ids = rows.map((r) => r.id);
  const speakerRows = await db
    .select({
      recordingId: recordingSpeakers.recordingId,
      name: speakers.name,
      birthYear: speakers.birthYear,
      deathYear: speakers.deathYear,
    })
    .from(recordingSpeakers)
    .innerJoin(speakers, eq(speakers.id, recordingSpeakers.speakerId))
    .where(
      and(
        eq(recordingSpeakers.role, "interviewee"),
        inArray(recordingSpeakers.recordingId, ids),
      ),
    );

  const intervieweesByRecording = new Map<string, BrowserInterviewee[]>();
  for (const s of speakerRows) {
    const list = intervieweesByRecording.get(s.recordingId) ?? [];
    list.push({
      name: s.name,
      birthYear: s.birthYear,
      deathYear: s.deathYear,
    });
    intervieweesByRecording.set(s.recordingId, list);
  }

  return rows.map((row) => {
    const brief = row.brief ?? null;
    const moments = brief?.moments ?? [];
    return {
      id: row.id,
      catalogNumber: row.catalog_number,
      title: row.title,
      durationSeconds: row.duration_seconds,
      recordingDate: row.recording_date,
      recordingDatePrecision: row.recording_date_precision,
      contentAdvisory: (row.content_advisory ?? null) as ContentAdvisory | null,
      createdAt: row.created_at,
      aiSummary: row.ai_summary,
      briefOverview: brief?.overview ?? null,
      eraRange: eraRangeFromMoments(moments),
      themes: row.themes ?? [],
      neighborhoods: row.neighborhoods ?? [],
      contentDecades: row.content_decades ?? [],
      interviewees: intervieweesByRecording.get(row.id) ?? [],
    };
  });
}

/**
 * Aggregate facet counts across the full corpus — the filter bar's
 * expand-to-explore signal. Does NOT scope to the active filter set;
 * v1 design keeps counts global so a zero-count facet still shows how
 * many recordings would unlock if the user cleared another filter.
 *
 * Wrapped with `unstable_cache` because facet counts only change when the
 * pipeline ingests a new recording or re-ingests an existing one with
 * different tagging. `scripts/ingest.py` POSTs to `/api/revalidate?tag=facets`
 * after every successful ingest batch; the 1h TTL is the safety net when
 * the webhook's env vars are unset.
 */
async function _fetchBrowserFacetsInner(): Promise<BrowserFacets> {
  const aggregate = async (column: "themes" | "neighborhoods" | "content_decades"): Promise<BrowserFacet[]> => {
    const rows = await db.execute<{ value: string; count: number }>(sql.raw(`
      SELECT unnest(${column}) AS value, count(*)::int AS count
      FROM public.metadata_extracted
      GROUP BY 1
      ORDER BY count DESC, value ASC
    `));
    return rows.map((r) => ({ value: r.value, count: r.count }));
  };

  // jsonb-column facets: count DISTINCT recordings per category (not per
  // entry — a recording mentioning four business orgs still counts as 1).
  const aggregateJsonbCategory = async (
    column: "organizations" | "historical_events",
  ): Promise<BrowserFacet[]> => {
    const rows = await db.execute<{ value: string; count: number }>(sql.raw(`
      SELECT o.value->>'category' AS value,
             count(DISTINCT m.recording_id)::int AS count
      FROM public.metadata_extracted m,
           jsonb_array_elements(m.${column}) AS o(value)
      WHERE o.value ? 'category'
      GROUP BY 1
      ORDER BY count DESC, value ASC
    `));
    return rows.map((r) => ({ value: r.value, count: r.count }));
  };

  const [themes, neighborhoods, decades, orgCategories, eventCategories] =
    await Promise.all([
      aggregate("themes"),
      aggregate("neighborhoods"),
      aggregate("content_decades"),
      aggregateJsonbCategory("organizations"),
      aggregateJsonbCategory("historical_events"),
    ]);

  return {
    themes,
    neighborhoods,
    decades,
    orgCategories,
    eventCategories,
  };
}

export const fetchBrowserFacets = unstable_cache(
  _fetchBrowserFacetsInner,
  ["browser-facets"],
  { tags: ["facets"], revalidate: 3600 },
);

/**
 * Archive-wide stats for the landing + about page: how many recordings
 * have cleared the pipeline, and across how many distinct interviewees.
 * "Processed" is keyed off `transcription_status = 'completed'` — the
 * same gate `fetchBrowserRecordings` uses for Browser visibility.
 *
 * Single round-trip: Postgres evaluates both counts in one query so we
 * don't pay two round-trips on every uncached visit.
 */
async function _fetchArchiveStatsInner(): Promise<{
  processedRecordings: number;
  distinctInterviewees: number;
}> {
  const rows = await db.execute<{
    processed_recordings: number;
    distinct_interviewees: number;
  }>(sql`
    SELECT
      (
        SELECT count(*)::int FROM public.recordings
        WHERE transcription_status = 'completed'
      ) AS processed_recordings,
      (
        SELECT count(DISTINCT rs.speaker_id)::int
        FROM public.recording_speakers rs
        JOIN public.recordings r ON r.id = rs.recording_id
        WHERE rs.role = 'interviewee'
          AND r.transcription_status = 'completed'
      ) AS distinct_interviewees
  `);
  const row = rows[0] ?? {
    processed_recordings: 0,
    distinct_interviewees: 0,
  };
  return {
    processedRecordings: row.processed_recordings,
    distinctInterviewees: row.distinct_interviewees,
  };
}

export const fetchArchiveStats = unstable_cache(
  _fetchArchiveStatsInner,
  ["archive-stats"],
  { tags: ["archive-stats"], revalidate: 3600 },
);

/**
 * Lightweight catalog → id resolver used by the stub Player / Map /
 * /player/[catalog] routes to 404 unknown catalog numbers.
 */
export async function recordingByCatalog(
  catalogNumber: string,
): Promise<{ id: string; title: string; catalogNumber: string } | null> {
  const rows = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      catalogNumber: recordings.catalogNumber,
    })
    .from(recordings)
    .where(eq(recordings.catalogNumber, catalogNumber))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Backwards-compat alias so the Map's `<MapClient>` prop type keeps working
// without a rename in the Week 4 diff. Map consumes the same trimmed card
// shape; `BrowserRecording` is the historical name.
// ---------------------------------------------------------------------------

export type BrowserRecording = BrowserRecordingCard;

// Silence unused-import warnings for `formatSpeakerName` — retained as a
// public re-export path; used by page components importing from this module.
void formatSpeakerName;
