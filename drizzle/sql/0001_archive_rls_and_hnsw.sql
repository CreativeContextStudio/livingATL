-- Follow-up to drizzle/0001_old_garia.sql.
--
-- Applies PRD §2.4 RLS policies to the historical-archive tables and
-- creates the pgvector HNSW index on transcript_chunks.embedding for
-- cosine-similarity semantic search (PRD §6.6 / §7.4).
--
-- These statements live in raw SQL because drizzle-kit can't emit HNSW
-- operator classes or RLS policy DDL in CREATE INDEX / CREATE TABLE.
--
-- RLS shape for Phase 1:
--   - SELECT is open (anon + authenticated) because the PRD describes
--     the archive as public-facing content. Per-story visibility rules
--     (public / limited / private) live on the `stories` table which is
--     Phase 5, not here.
--   - INSERT / UPDATE / DELETE are restricted to the service role only.
--     The ingest pipeline connects as a service-role client; no browser
--     session can write to these tables.

-- ---------------------------------------------------------------------------
-- Enable RLS on all new archive tables.
-- ---------------------------------------------------------------------------

ALTER TABLE public.recordings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recording_speakers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metadata_extracted   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_chunks    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Public read policies — anon + authenticated can SELECT archive content.
-- ---------------------------------------------------------------------------

CREATE POLICY recordings_public_read ON public.recordings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY speakers_public_read ON public.speakers
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY recording_speakers_public_read ON public.recording_speakers
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY transcripts_public_read ON public.transcripts
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY metadata_extracted_public_read ON public.metadata_extracted
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY transcript_chunks_public_read ON public.transcript_chunks
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- HNSW index on transcript_chunks.embedding for vector similarity search.
--
-- vector_cosine_ops matches the similarity measure used by the AI Portal
-- RAG retrieval step. m = 16, ef_construction = 64 are pgvector defaults
-- and fine for a prototype corpus of 25 recordings / a few thousand chunks.
-- Re-tune only if recall falls off at scale.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS transcript_chunks_embedding_hnsw_cos_idx
  ON public.transcript_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
