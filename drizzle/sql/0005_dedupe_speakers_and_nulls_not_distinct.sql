-- Dedupe the `speakers` table and prevent recurrence.
--
-- Context: the UNIQUE (name, birth_year) index on public.speakers was created
-- with the Postgres default NULLS DISTINCT, so every ingest with
-- birth_year=NULL inserted a fresh row instead of matching an existing one.
-- That inflated `count(DISTINCT speaker_id)` on `recording_speakers` well
-- above the real human head-count (57 reported interviewees, 26 real
-- interviewees on 2026-04-19).
--
-- This migration runs in one transaction and refuses to commit unless the
-- post-condition `count(DISTINCT speaker_id) = count(DISTINCT name)` holds
-- on the interviewee population of completed recordings.
--
-- Phase 1: dedupe the six clean-case name groups (West / Alexander /
--   Cochrane / Adams / Price / Baynes). Canonical row per name = oldest
--   created_at; recording_speakers entries remap to it, colliding
--   junction rows are dropped via ON CONFLICT DO NOTHING; ON DELETE
--   CASCADE removes the remainder when the non-canonical speaker is
--   deleted.
--
-- Phase 2: split the malformed concatenated-name rows
--   ("Kuhn, Clifford M., 1952-2015, West, E. Bernard" with comma and
--   semicolon variants) into separate Kuhn + West interviewer rows on
--   every recording they touched. 10 of 13 affected recordings didn't
--   already have both clean rows, so this is a real repair, not a no-op.
--
-- Phase 3: recreate the unique index with NULLS NOT DISTINCT so a NULL
--   birth_year collides with another NULL birth_year under the same
--   name. Prevents recurrence on future ingest.py runs.
--
-- How to run this file: pipe it through `psql "$DATABASE_URL"` or wrap
-- the individual statements with `sql.begin()` in a postgres.js script.
-- Do NOT run it through `sql.unsafe()` on a Supabase pooled connection —
-- the pooler treats BEGIN/COMMIT as separate statements against different
-- sessions and each statement auto-commits. The DO-block post-condition
-- still runs, but an EXCEPTION inside it would not roll anything back.

BEGIN;

-- ---------------------------------------------------------------------------
-- Phase 1: dedupe clean name groups
-- ---------------------------------------------------------------------------

WITH dup_names AS (
  SELECT name
  FROM public.speakers
  GROUP BY name
  HAVING count(*) > 1
    AND name NOT LIKE '%Kuhn%West%'
    AND name NOT LIKE '%West%Kuhn%'
),
canonicals AS (
  SELECT DISTINCT ON (s.name) s.name, s.id AS canonical_id
  FROM public.speakers s
  JOIN dup_names USING (name)
  ORDER BY s.name, s.created_at ASC, s.id ASC
)
INSERT INTO public.recording_speakers (recording_id, speaker_id, role)
SELECT rs.recording_id, c.canonical_id, rs.role
FROM public.recording_speakers rs
JOIN public.speakers s ON s.id = rs.speaker_id
JOIN canonicals c ON c.name = s.name
WHERE s.id <> c.canonical_id
ON CONFLICT DO NOTHING;

WITH dup_names AS (
  SELECT name
  FROM public.speakers
  GROUP BY name
  HAVING count(*) > 1
    AND name NOT LIKE '%Kuhn%West%'
    AND name NOT LIKE '%West%Kuhn%'
),
canonicals AS (
  SELECT DISTINCT ON (s.name) s.name, s.id AS canonical_id
  FROM public.speakers s
  JOIN dup_names USING (name)
  ORDER BY s.name, s.created_at ASC, s.id ASC
)
DELETE FROM public.speakers s
USING canonicals c
WHERE s.name = c.name
  AND s.id <> c.canonical_id;

-- ---------------------------------------------------------------------------
-- Phase 2: split concatenated Kuhn+West rows
-- ---------------------------------------------------------------------------

-- Insert clean Kuhn + clean West interviewer rows for every recording that
-- currently has a concatenated-name row. Both canonical speakers already
-- exist — Kuhn, Clifford M. (birth_year=1952) as a singular row from ingest;
-- West, E. Bernard as the canonical survivor of phase 1.
--
-- The concatenated rows are all role=interviewer in the current data. The
-- INSERT is parameterized on the existing role anyway, so if a future row
-- lands with a different role the split still uses it correctly.
INSERT INTO public.recording_speakers (recording_id, speaker_id, role)
SELECT rs.recording_id, kuhn.id, rs.role
FROM public.recording_speakers rs
JOIN public.speakers bad ON bad.id = rs.speaker_id
CROSS JOIN LATERAL (
  SELECT id FROM public.speakers WHERE name = 'Kuhn, Clifford M.' LIMIT 1
) AS kuhn
WHERE bad.name LIKE '%Kuhn%West%' OR bad.name LIKE '%West%Kuhn%'
ON CONFLICT DO NOTHING;

INSERT INTO public.recording_speakers (recording_id, speaker_id, role)
SELECT rs.recording_id, west.id, rs.role
FROM public.recording_speakers rs
JOIN public.speakers bad ON bad.id = rs.speaker_id
CROSS JOIN LATERAL (
  SELECT id FROM public.speakers WHERE name = 'West, E. Bernard' LIMIT 1
) AS west
WHERE bad.name LIKE '%Kuhn%West%' OR bad.name LIKE '%West%Kuhn%'
ON CONFLICT DO NOTHING;

-- Delete the concatenated speaker rows. ON DELETE CASCADE on
-- recording_speakers.speaker_id drops the junction entries.
DELETE FROM public.speakers
WHERE name LIKE '%Kuhn%West%' OR name LIKE '%West%Kuhn%';

-- ---------------------------------------------------------------------------
-- Phase 3: recreate unique index with NULLS NOT DISTINCT
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS public.speakers_name_birth_year_key;
CREATE UNIQUE INDEX speakers_name_birth_year_key
  ON public.speakers (name, birth_year)
  NULLS NOT DISTINCT;

-- ---------------------------------------------------------------------------
-- Post-condition: real interviewee head-count must equal speaker_id count.
-- If this fails, the entire transaction rolls back.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  proc_count             int;
  interviewee_name_count int;
  interviewee_id_count   int;
  residual_dup_groups    int;
BEGIN
  SELECT count(*) INTO proc_count
  FROM public.recordings
  WHERE transcription_status = 'completed';

  SELECT count(DISTINCT s.name) INTO interviewee_name_count
  FROM public.speakers s
  JOIN public.recording_speakers rs ON rs.speaker_id = s.id
  JOIN public.recordings r ON r.id = rs.recording_id
  WHERE rs.role = 'interviewee'
    AND r.transcription_status = 'completed';

  SELECT count(DISTINCT rs.speaker_id) INTO interviewee_id_count
  FROM public.recording_speakers rs
  JOIN public.recordings r ON r.id = rs.recording_id
  WHERE rs.role = 'interviewee'
    AND r.transcription_status = 'completed';

  SELECT count(*) INTO residual_dup_groups
  FROM (
    SELECT name FROM public.speakers GROUP BY name HAVING count(*) > 1
  ) g;

  RAISE NOTICE
    'Post-dedupe: processed=%, interviewee_names=%, interviewee_ids=%, residual_dup_groups=%',
    proc_count, interviewee_name_count, interviewee_id_count, residual_dup_groups;

  IF interviewee_name_count <> interviewee_id_count THEN
    RAISE EXCEPTION
      'Dedup post-condition failed: interviewee_names=% <> interviewee_ids=%',
      interviewee_name_count, interviewee_id_count;
  END IF;

  IF residual_dup_groups > 0 THEN
    RAISE EXCEPTION 'Residual duplicate name groups after dedupe: %', residual_dup_groups;
  END IF;
END $$;

COMMIT;
