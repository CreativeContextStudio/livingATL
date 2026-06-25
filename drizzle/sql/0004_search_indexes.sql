-- Phase 2 Week 4 — server-side Browser filter/sort/search indexes.
--
-- Companions:
--   0004_groovy_luminals.sql adds the metadata_extracted.content_decades
--   column. This raw-SQL file adds the GIN + pg_trgm indexes Drizzle
--   can't emit.

-- pg_trgm powers fast `ILIKE '%q%'` across metadata text fields. Safe
-- to re-run: extension is idempotent.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on the new decades array so the Browser's decade filter uses
-- `content_decades @> ARRAY['1920s']` with an index hit.
CREATE INDEX IF NOT EXISTS metadata_extracted_content_decades_idx
  ON public.metadata_extracted
  USING GIN (content_decades);

-- GIN indexes on the existing text[] filter columns — same rationale.
-- (These didn't exist before; at 48 rows sequential scan was fine, at
-- 400+ they'll matter.)
CREATE INDEX IF NOT EXISTS metadata_extracted_themes_idx
  ON public.metadata_extracted
  USING GIN (themes);

CREATE INDEX IF NOT EXISTS metadata_extracted_neighborhoods_idx
  ON public.metadata_extracted
  USING GIN (neighborhoods);

CREATE INDEX IF NOT EXISTS metadata_extracted_organizations_idx
  ON public.metadata_extracted
  USING GIN (organizations);

-- Trigram GIN indexes for ILIKE search. gin_trgm_ops is provided by pg_trgm
-- and enables substring / case-insensitive pattern matching at index speed.
CREATE INDEX IF NOT EXISTS recordings_title_trgm_idx
  ON public.recordings
  USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS recordings_catalog_number_trgm_idx
  ON public.recordings
  USING GIN (catalog_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS speakers_name_trgm_idx
  ON public.speakers
  USING GIN (name gin_trgm_ops);

-- ai_summary can be null; GIN on gin_trgm_ops tolerates nulls. The
-- coalesce makes the index useful even for rows with null summaries.
CREATE INDEX IF NOT EXISTS metadata_extracted_ai_summary_trgm_idx
  ON public.metadata_extracted
  USING GIN ((coalesce(ai_summary, '')) gin_trgm_ops);
