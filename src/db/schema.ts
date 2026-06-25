import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/**
 * livingATL — Phase 1 schema (historical archive tables).
 *
 * Covers the PRD §4.1 archive data model plus the minimal `users` table
 * from §4.2 / §2.4. Community story tables (stories, story_media,
 * story_locations, wiki_entries, playlists_walks, generations,
 * reports_takedowns, tags, story_tags) are NOT in this migration — they
 * ship with Phase 5 when the community capture UI goes live.
 *
 * Conventions:
 * - All IDs are UUID v4 generated in Postgres.
 * - All timestamps are `timestamp with time zone` via `timestamp(..., { withTimezone: true })`.
 * - The FK from `public.users.id` → `auth.users.id` and RLS policies are
 *   applied in `drizzle/sql/0001_archive_schema_fk_and_rls.sql`. Drizzle
 *   cannot declare cross-schema FKs into Supabase-owned schemas without
 *   trying to recreate them, so those statements live in raw SQL alongside
 *   the generated migration.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const recordingDatePrecision = pgEnum("recording_date_precision", [
  "exact",
  "month",
  "year",
  "decade",
  "estimated",
]);

export const transcriptionStatus = pgEnum("transcription_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "manual_review",
]);

export const wcsLabel = pgEnum("wcs_label", ["high", "moderate", "low"]);

export const speakerRole = pgEnum("speaker_role", [
  "interviewee",
  "interviewer",
  "other",
]);

export const whisperRuntime = pgEnum("whisper_runtime", [
  "whisper.cpp",
  "openai-whisper",
]);

export const neighborhoodGeometryKind = pgEnum("neighborhood_geometry_kind", [
  "polygon",
  "multipolygon",
  "line",
  "buffered_line",
  "point",
]);

// ---------------------------------------------------------------------------
// Users (public.users — extends Supabase auth.users per PRD §2.4)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  role: text("role", { enum: ["contributor", "steward", "admin"] })
    .notNull()
    .default("contributor"),
  verifiedStoryteller: boolean("verified_storyteller")
    .notNull()
    .default(false),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Speakers
// ---------------------------------------------------------------------------

export const speakers = pgTable(
  "speakers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    birthYear: integer("birth_year"),
    deathYear: integer("death_year"),
    race: text("race"),
    gender: text("gender"),
    primaryOccupation: text("primary_occupation"),
    bioSummary: text("bio_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Uniqueness on (name, birth_year). The index is rebuilt with
    // `NULLS NOT DISTINCT` by `drizzle/sql/0005_dedupe_speakers_and_nulls_not_distinct.sql`
    // so two rows with the same name and both-NULL birth years collide
    // instead of coexisting — the earlier default-NULLS-DISTINCT form let
    // ingest.py insert duplicate rows for the same person silently (up to
    // 80 rows for "West, E. Bernard" before the 2026-04 cleanup).
    // drizzle-orm 0.45 only exposes `.nullsNotDistinct()` on
    // `UniqueConstraint`, not on `uniqueIndex`, so the flag lives in the
    // raw-SQL migration rather than here.
    uniqueIndex("speakers_name_birth_year_key").on(t.name, t.birthYear),
  ],
);

// ---------------------------------------------------------------------------
// Recordings
// ---------------------------------------------------------------------------

export const recordings = pgTable(
  "recordings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Display + access
    title: text("title").notNull(),
    audioUrl: text("audio_url"), // streaming (R2 CDN); null until R2 upload
    audioUrlArchival: text("audio_url_archival"), // lossless (archival copy)
    durationSeconds: integer("duration_seconds"),

    // Temporal
    recordingDate: date("recording_date"),
    recordingDatePrecision: recordingDatePrecision("recording_date_precision"),

    // Catalog (from Kenan Research Center)
    catalogNumber: text("catalog_number").notNull(),
    catalogDescription: text("catalog_description"),
    catalogNotes: text("catalog_notes"),
    collection: text("collection"),
    publisher: text("publisher"),

    // Source media
    analogFormat: text("analog_format"),
    dateDigitized: date("date_digitized"),
    digitized: boolean("digitized").notNull().default(false),

    // Transcription state + Whisper Comprehension Score (PRD §6.3.1)
    transcriptionStatus: transcriptionStatus("transcription_status")
      .notNull()
      .default("pending"),
    wcsScore: real("wcs_score"),
    wcsLabel: wcsLabel("wcs_label"),
    humanReviewRequired: boolean("human_review_required")
      .notNull()
      .default(false),
    humanReviewer: text("human_reviewer"),
    humanReviewDate: timestamp("human_review_date", { withTimezone: true }),
    humanReviewNotes: text("human_review_notes"),

    // Rights (PRD §8.7)
    rightsHolder: text("rights_holder"),
    license: text("license"),

    // Content advisory — editorial state queried by Browser and Player cards.
    // See PRD §8.5 and `livingatl/src/lib/content-advisory.ts` for the
    // versioned canonical advisory text. Shape documented in PHASE1_STATE.md.
    // Nullable: a NULL value means "not yet reviewed." A non-null row with
    // `reviewed: true, display_advisory: false` means "steward checked, clean."
    contentAdvisory: jsonb("content_advisory"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("recordings_catalog_number_key").on(t.catalogNumber),
    index("recordings_transcription_status_idx").on(t.transcriptionStatus),
    index("recordings_recording_date_idx").on(t.recordingDate),
  ],
);

// ---------------------------------------------------------------------------
// Recording ↔ Speaker junction
// ---------------------------------------------------------------------------

export const recordingSpeakers = pgTable(
  "recording_speakers",
  {
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    speakerId: uuid("speaker_id")
      .notNull()
      .references(() => speakers.id, { onDelete: "cascade" }),
    role: speakerRole("role").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.recordingId, t.speakerId, t.role] }),
    index("recording_speakers_speaker_idx").on(t.speakerId),
  ],
);

// ---------------------------------------------------------------------------
// Transcripts (PRD §4.1 + revised §6.3 for whisper.cpp per-token data)
// ---------------------------------------------------------------------------

export const transcripts = pgTable(
  "transcripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),

    fullText: text("full_text").notNull(),
    // Array of {start, end, text, tokens[]} — tokens[] populated on
    // whisper.cpp, null on openai-whisper.
    segments: jsonb("segments").notNull(),
    language: text("language").notNull().default("en"),

    confidenceScore: real("confidence_score"), // 0–1 mean_seg_mean_p
    whisperRuntime: whisperRuntime("whisper_runtime").notNull(),
    whisperModel: text("whisper_model").notNull(),

    // Quality signals (PRD §6.3.1)
    lowConfidenceSegments: integer("low_confidence_segments")
      .notNull()
      .default(0),
    lowConfidenceTokens: integer("low_confidence_tokens"),
    hallucinationFlags: integer("hallucination_flags").notNull().default(0),
    repetitionFlags: integer("repetition_flags").notNull().default(0),

    // Archival artifact — full unmodified whisper output
    rawWhisperOutput: jsonb("raw_whisper_output"),

    manuallyReviewed: boolean("manually_reviewed").notNull().default(false),
    reviewerNotes: text("reviewer_notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One transcript per recording in Phase 1. Multi-transcript support
    // (e.g., a corrected reviewer version alongside the raw whisper output)
    // arrives with the review UI in Phase 2.
    uniqueIndex("transcripts_recording_id_key").on(t.recordingId),
  ],
);

// ---------------------------------------------------------------------------
// Metadata extracted (Claude — manual in Phase 1, API-driven in Phase 2+)
// ---------------------------------------------------------------------------

export const metadataExtracted = pgTable(
  "metadata_extracted",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),

    neighborhoods: text("neighborhoods").array().notNull().default(sql`'{}'`),
    themes: text("themes").array().notNull().default(sql`'{}'`),
    // Derived at ingest time from brief.moments[].era_start_year / era_end_year
    // via `livingatl-pipeline/scripts/decade_helpers.py::decades_from_moments`.
    // Mirrors `src/lib/format.ts::decadesFromMoments()`; keep them in lockstep.
    // Indexed via GIN for Browser filter queries (`@> ARRAY[decade]`).
    contentDecades: text("content_decades").array().notNull().default(sql`'{}'`),
    dateReferences: jsonb("date_references"),
    locations: jsonb("locations"),
    // Organizations are stored as JSONB arrays of tagged objects
    // ({label, category}) so the Player can render them as category-colored
    // chips. Controlled vocabulary lives in scripts/config.py
    // (ORGANIZATION_CATEGORIES + ORGANIZATION_CANONICAL) and ingest.py
    // validates every entry before write.
    organizations: jsonb("organizations").notNull().default(sql`'[]'::jsonb`),
    keyQuotes: jsonb("key_quotes"),
    // Historical events: JSONB array of {label, category, year?} — same
    // treatment as organizations. Year is the earliest 4-digit year we
    // could extract from the authored label.
    historicalEvents: jsonb("historical_events").notNull().default(sql`'[]'::jsonb`),
    sentimentSummary: text("sentiment_summary"),
    aiSummary: text("ai_summary"),
    modernContextNotes: text("modern_context_notes"),

    // Interview brief — chronologically ordered "moments" that chapter the
    // recording for the interactive timeline (PRD §7.3) and the audio player
    // scrubber (PRD §7.2). Each moment binds to transcript segment indices
    // (stable across re-transcription) rather than raw timestamps (which
    // drift on retranscribe — see Ruby Owens re-transcription history in
    // PHASE1_STATE.md). Shape documented in the enhancement plan:
    //   { transcript_hash, overview, moments: [{ segment_indices, start_time,
    //     end_time, title, summary, highlight, highlight_reason, themes,
    //     neighborhoods, people_mentioned, era_start_year, era_end_year,
    //     era_label }] }
    // Nullable until brief is authored in the Claude Code manual pass.
    brief: jsonb("brief"),

    // Sensitivity review — audit trail of the content-advisory decision for
    // this recording. Paired with `recordings.content_advisory` (editorial
    // state) but separated by lifecycle: this row documents WHO flagged WHAT
    // and WHY, while the `content_advisory` row is the current display
    // decision. Shape: { reviewer_notes, flagged_spans: [{start, end,
    // category, severity}], review_date, reviewer }. Nullable until review.
    sensitivityReview: jsonb("sensitivity_review"),

    // Provenance of the extraction
    extractionSource: text("extraction_source", {
      enum: ["claude_code_manual", "anthropic_api", "openai_api", "other"],
    })
      .notNull()
      .default("claude_code_manual"),
    extractionModel: text("extraction_model"),
    extractionPromptVersion: text("extraction_prompt_version"),
    extractionDate: timestamp("extraction_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("metadata_extracted_recording_id_key").on(t.recordingId)],
);

// ---------------------------------------------------------------------------
// Transcript chunks for vector search (PRD §6.6 / §7.4 AI Portal RAG)
// ---------------------------------------------------------------------------

export const transcriptChunks = pgTable(
  "transcript_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),

    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    startTime: doublePrecision("start_time").notNull(),
    endTime: doublePrecision("end_time").notNull(),
    tokenCount: integer("token_count"),

    // 1536 dims for OpenAI text-embedding-3-small. If the embedding model
    // changes, drop and regenerate — pgvector columns are fixed-width.
    embedding: vector("embedding", { dimensions: 1536 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("transcript_chunks_recording_chunk_key").on(
      t.recordingId,
      t.chunkIndex,
    ),
    // HNSW index for cosine similarity — built in raw SQL alongside RLS
    // because drizzle-kit doesn't emit HNSW options in CREATE INDEX yet.
  ],
);

// ---------------------------------------------------------------------------
// Neighborhoods (PRD §7.5 Interactive Map — geometry lookup for the 30
// canonical names in `livingatl-pipeline/scripts/config.py::NEIGHBORHOOD_CANONICAL`).
//
// Phase 2 Week 3 addition per the Phase 1.5 scoping decision
// (`refDocs/livingATL_Map_Geometry_Scoping.md`): hybrid source — ARC
// Neighborhood GeoJSON for most canonicals, hand-authored overrides for
// corridors + ambiguous references (Auburn Avenue as buffered line,
// Sweet Auburn as NRHP 1976 polygon, Downtown as Five Points point).
//
// `name` is the primary key because it's the canonical vocabulary already
// validated at ingest in `scripts/ingest.py::_validate_brief`. Keeping
// names as the join key means the Map can lookup by `neighborhoods[]` from
// `metadata_extracted` without translating through a UUID.
// ---------------------------------------------------------------------------

export const neighborhoods = pgTable("neighborhoods", {
  name: text("name").primaryKey(),
  geometryKind: neighborhoodGeometryKind("geometry_kind").notNull(),
  // Full GeoJSON Feature (type, geometry, properties) — stored as jsonb so
  // the web app can ship it straight to Mapbox GL without reshaping.
  geometry: jsonb("geometry").notNull(),
  // Provenance: "arc:<dataset_id>" for ARC-sourced, "hand-authored:<note>"
  // for overrides. Used for attribution + diagnostics when geometries drift.
  source: text("source").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
