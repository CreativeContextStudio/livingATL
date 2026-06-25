import "server-only";

import { eq, and, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  recordings,
  recordingSpeakers,
  speakers,
  metadataExtracted,
  transcripts,
} from "@/db/schema";
import type {
  BriefMoment,
  BrowserBrief,
  ContentAdvisory,
} from "@/lib/queries/recordings";
import type {
  HistoricalEventCategory,
  OrganizationCategory,
} from "@/components/shared/category-colors";

// ---------------------------------------------------------------------------
// Types surfaced by fetchPlayerData — richer than the Browser's row shape
// because the Player renders virtually every column on the recording.
// ---------------------------------------------------------------------------

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  speaker_id?: string | null;
  speaker_name?: string | null;
  speaker_role?: "interviewer" | "interviewee" | "other" | null;
  speaker_confidence?: string | null;
};

export type FlaggedSpan = {
  start: number;
  end: number;
  category: string;
  severity: string;
};

export type SensitivityReview = {
  reviewer_notes?: string;
  flagged_spans?: FlaggedSpan[];
  review_date?: string;
  reviewer?: string;
};

export type KeyQuote = {
  text: string;
  context?: string;
  start_time: number;
  end_time?: number;
};

/**
 * Tagged organization — the pipeline now emits jsonb objects carrying a
 * controlled-vocab `category` alongside the display label so the Player can
 * color-code chips by role (education vs religious vs civil_rights etc.).
 * Replaces the earlier `string[]` shape.
 */
export type TaggedOrganization = {
  label: string;
  category: OrganizationCategory;
};

/**
 * Tagged historical event — same pattern as `TaggedOrganization`, plus an
 * optional `year` the UI surfaces as "Atlanta Race Massacre (1906)".
 */
export type TaggedHistoricalEvent = {
  label: string;
  category: HistoricalEventCategory;
  year?: number;
};

export type PlayerSpeaker = {
  id: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  bioSummary: string | null;
  role: "interviewer" | "interviewee" | "other";
};

export type RelatedRecording = {
  id: string;
  catalogNumber: string;
  title: string;
  durationSeconds: number | null;
  recordingDate: string | null;
  recordingDatePrecision: string | null;
  interviewees: Array<{
    name: string;
    birthYear: number | null;
    deathYear: number | null;
  }>;
  neighborhoods: string[];
  themes: string[];
  contentAdvisory: ContentAdvisory | null;
  briefOverview: string | null;
  score: number;
};

export type PlayerData = {
  id: string;
  catalogNumber: string;
  title: string;
  audioUrl: string | null;
  durationSeconds: number | null;
  recordingDate: string | null;
  recordingDatePrecision: string | null;
  contentAdvisory: ContentAdvisory | null;
  catalogDescription: string | null;
  collection: string | null;
  publisher: string | null;
  rightsHolder: string | null;
  license: string | null;

  speakers: PlayerSpeaker[];

  transcriptSegments: TranscriptSegment[];
  transcriptLowConfidenceCount: number;

  // Metadata
  aiSummary: string | null;
  modernContextNotes: string | null;
  themes: string[];
  neighborhoods: string[];
  organizations: TaggedOrganization[];
  historicalEvents: TaggedHistoricalEvent[];

  // JSONB payloads
  briefOverview: string | null;
  briefMoments: BriefMoment[];
  flaggedSpans: FlaggedSpan[];
  keyQuotes: KeyQuote[];
};

// ---------------------------------------------------------------------------
// Tagged-facet normalizers — tolerate both the pipeline's new jsonb object
// shape and any lingering legacy `text[]` rows (during the short window
// between the web-app deploy and the pipeline backfill). Unknown categories
// fall through to a muted "other"-style chip via `organizationStyle` /
// `historicalEventStyle` downstream — the normalizer itself doesn't guess.
// ---------------------------------------------------------------------------

function normalizeOrganizations(value: unknown): TaggedOrganization[] {
  if (!Array.isArray(value)) return [];
  const out: TaggedOrganization[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      // Legacy row: emit as the vocabulary's catch-all "community" so the
      // chip still renders during the transition.
      if (entry.trim()) {
        out.push({ label: entry, category: "community" });
      }
      continue;
    }
    if (entry && typeof entry === "object") {
      const e = entry as { label?: unknown; category?: unknown };
      if (typeof e.label === "string" && typeof e.category === "string") {
        out.push({
          label: e.label,
          category: e.category as OrganizationCategory,
        });
      }
    }
  }
  return out;
}

function normalizeHistoricalEvents(value: unknown): TaggedHistoricalEvent[] {
  if (!Array.isArray(value)) return [];
  const out: TaggedHistoricalEvent[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      if (entry.trim()) {
        out.push({ label: entry, category: "other" });
      }
      continue;
    }
    if (entry && typeof entry === "object") {
      const e = entry as {
        label?: unknown;
        category?: unknown;
        year?: unknown;
      };
      if (typeof e.label === "string" && typeof e.category === "string") {
        out.push({
          label: e.label,
          category: e.category as HistoricalEventCategory,
          year: typeof e.year === "number" ? e.year : undefined,
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main query — single-catalog fetch covering everything the Player renders.
// ---------------------------------------------------------------------------

export async function fetchPlayerData(
  catalogNumber: string,
): Promise<PlayerData | null> {
  const baseRows = await db
    .select({
      id: recordings.id,
      catalogNumber: recordings.catalogNumber,
      title: recordings.title,
      audioUrl: recordings.audioUrl,
      durationSeconds: recordings.durationSeconds,
      recordingDate: recordings.recordingDate,
      recordingDatePrecision: recordings.recordingDatePrecision,
      contentAdvisory: recordings.contentAdvisory,
      catalogDescription: recordings.catalogDescription,
      collection: recordings.collection,
      publisher: recordings.publisher,
      rightsHolder: recordings.rightsHolder,
      license: recordings.license,
      aiSummary: metadataExtracted.aiSummary,
      modernContextNotes: metadataExtracted.modernContextNotes,
      themes: metadataExtracted.themes,
      neighborhoods: metadataExtracted.neighborhoods,
      organizations: metadataExtracted.organizations,
      historicalEvents: metadataExtracted.historicalEvents,
      brief: metadataExtracted.brief,
      sensitivityReview: metadataExtracted.sensitivityReview,
      keyQuotes: metadataExtracted.keyQuotes,
    })
    .from(recordings)
    .leftJoin(
      metadataExtracted,
      eq(metadataExtracted.recordingId, recordings.id),
    )
    .where(eq(recordings.catalogNumber, catalogNumber))
    .limit(1);

  const row = baseRows[0];
  if (!row) return null;

  const [transcriptRow] = await db
    .select({
      segments: transcripts.segments,
      lowConfidenceSegments: transcripts.lowConfidenceSegments,
    })
    .from(transcripts)
    .where(eq(transcripts.recordingId, row.id))
    .limit(1);

  const speakerRows = await db
    .select({
      id: speakers.id,
      name: speakers.name,
      birthYear: speakers.birthYear,
      deathYear: speakers.deathYear,
      bioSummary: speakers.bioSummary,
      role: recordingSpeakers.role,
    })
    .from(recordingSpeakers)
    .innerJoin(speakers, eq(speakers.id, recordingSpeakers.speakerId))
    .where(eq(recordingSpeakers.recordingId, row.id));

  const brief = (row.brief ?? null) as BrowserBrief | null;
  const sensitivity = (row.sensitivityReview ?? null) as
    | SensitivityReview
    | null;

  return {
    id: row.id,
    catalogNumber: row.catalogNumber,
    title: row.title,
    audioUrl: row.audioUrl,
    durationSeconds: row.durationSeconds,
    recordingDate: row.recordingDate,
    recordingDatePrecision: row.recordingDatePrecision,
    contentAdvisory: (row.contentAdvisory ?? null) as ContentAdvisory | null,
    catalogDescription: row.catalogDescription,
    collection: row.collection,
    publisher: row.publisher,
    rightsHolder: row.rightsHolder,
    license: row.license,
    speakers: speakerRows.map((s) => ({
      id: s.id,
      name: s.name,
      birthYear: s.birthYear,
      deathYear: s.deathYear,
      bioSummary: s.bioSummary,
      role: s.role as PlayerSpeaker["role"],
    })),
    transcriptSegments: (transcriptRow?.segments ?? []) as TranscriptSegment[],
    transcriptLowConfidenceCount:
      transcriptRow?.lowConfidenceSegments ?? 0,
    aiSummary: row.aiSummary,
    modernContextNotes: row.modernContextNotes,
    themes: row.themes ?? [],
    neighborhoods: row.neighborhoods ?? [],
    // organizations / historical_events are jsonb arrays of tagged objects
    // in the pipeline's new shape. The drizzle schema still types these as
    // `text[]` during the transition, so we cast via `unknown` and lean on
    // the runtime normalizers to coerce any lingering legacy-string rows.
    organizations: normalizeOrganizations(
      (row.organizations ?? []) as unknown,
    ),
    historicalEvents: normalizeHistoricalEvents(
      (row.historicalEvents ?? []) as unknown,
    ),
    briefOverview: brief?.overview ?? null,
    briefMoments: brief?.moments ?? [],
    flaggedSpans: sensitivity?.flagged_spans ?? [],
    keyQuotes: (row.keyQuotes ?? []) as KeyQuote[],
  };
}

// ---------------------------------------------------------------------------
// Related recordings — simple facet-overlap ranking, scored in SQL.
// ---------------------------------------------------------------------------

/**
 * Raw row shape returned by the scoring query. Typed loosely because the
 * `db.execute<T>()` path (raw SQL) doesn't benefit from drizzle's inference
 * — we shape the row explicitly here and map into `RelatedRecording` below.
 */
type RelatedScoreRow = {
  id: string;
  catalog_number: string;
  title: string;
  duration_seconds: number | null;
  recording_date: string | null;
  recording_date_precision: string | null;
  content_advisory: ContentAdvisory | null;
  themes: string[] | null;
  neighborhoods: string[] | null;
  brief: BrowserBrief | null;
  score: number;
};

/**
 * Return up to `limit` other recordings ranked by shared theme + neighborhood
 * count with the current recording. Theme × 1, neighborhood × 2 (themes are
 * coarser — 21-value taxonomy vs. 30+ canonical neighborhoods).
 *
 * Scoring runs SQL-side via a scalar subquery over the intersection of each
 * row's theme/neighborhood arrays with the current recording's. The `&&`
 * pre-filter on the WHERE clause skips non-overlapping rows before any
 * count work — keeping this efficient as the corpus grows past 48 rows
 * without requiring a GIN index today (add one if the Player page ever
 * shows up slow in APM).
 *
 * Interviewees for the matched rows are fetched in a second, narrower
 * round-trip scoped to the returned ids — avoids loading the entire
 * interviewee table for every Player render.
 */
export async function fetchRelatedRecordings(
  currentRecordingId: string,
  currentThemes: string[],
  currentNeighborhoods: string[],
  limit = 4,
): Promise<RelatedRecording[]> {
  if (currentThemes.length === 0 && currentNeighborhoods.length === 0) {
    return [];
  }

  // Drizzle's `sql\`${jsArray}\`` spreads arrays as a comma-separated tuple
  // of bound parameters (`$1, $2, $3`), not as a single `text[]` value.
  // Build the array literal explicitly so Postgres sees a real text[] that
  // can be used with `ANY(...)` and `&&`. Empty JS array → `ARRAY[]::text[]`,
  // which is a valid (always-false-for-overlap) literal.
  const textArray = (values: string[]) =>
    sql`ARRAY[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]::text[]`;

  const themesArr = textArray(currentThemes);
  const nbhdsArr = textArray(currentNeighborhoods);

  const scoredRows = await db.execute<RelatedScoreRow>(sql`
    SELECT
      r.id,
      r.catalog_number,
      r.title,
      r.duration_seconds,
      r.recording_date,
      r.recording_date_precision,
      r.content_advisory,
      m.themes,
      m.neighborhoods,
      m.brief,
      (
        COALESCE(
          (SELECT count(*)::int FROM unnest(COALESCE(m.themes, ARRAY[]::text[])) t
           WHERE t = ANY(${themesArr})),
          0
        ) * 1
        + COALESCE(
          (SELECT count(*)::int FROM unnest(COALESCE(m.neighborhoods, ARRAY[]::text[])) n
           WHERE n = ANY(${nbhdsArr})),
          0
        ) * 2
      )::int AS score
    FROM public.recordings r
    LEFT JOIN public.metadata_extracted m ON m.recording_id = r.id
    WHERE r.transcription_status = 'completed'
      AND r.id <> ${currentRecordingId}
      AND (
        m.themes && ${themesArr}
        OR m.neighborhoods && ${nbhdsArr}
      )
    ORDER BY score DESC, r.title ASC
    LIMIT ${limit}
  `);

  if (scoredRows.length === 0) return [];

  const topIds = scoredRows.map((r) => r.id);
  const interviewees = await db
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
        inArray(recordingSpeakers.recordingId, topIds),
        eq(recordingSpeakers.role, "interviewee"),
      ),
    );

  const intervieweesByRecording = new Map<
    string,
    Array<{ name: string; birthYear: number | null; deathYear: number | null }>
  >();
  for (const iv of interviewees) {
    const list = intervieweesByRecording.get(iv.recordingId) ?? [];
    list.push({
      name: iv.name,
      birthYear: iv.birthYear,
      deathYear: iv.deathYear,
    });
    intervieweesByRecording.set(iv.recordingId, list);
  }

  return scoredRows.map((row) => {
    const brief = (row.brief ?? null) as BrowserBrief | null;
    return {
      id: row.id,
      catalogNumber: row.catalog_number,
      title: row.title,
      durationSeconds: row.duration_seconds,
      recordingDate: row.recording_date,
      recordingDatePrecision: row.recording_date_precision,
      interviewees: intervieweesByRecording.get(row.id) ?? [],
      neighborhoods: row.neighborhoods ?? [],
      themes: row.themes ?? [],
      contentAdvisory: (row.content_advisory ?? null) as ContentAdvisory | null,
      briefOverview: brief?.overview ?? null,
      score: row.score,
    };
  });
}
