-- RLS companion for 0003_sour_yellowjacket.sql (neighborhoods table).
--
-- Phase 2 Week 3: geometry lookup for the Map (§7.5) is public-read-only;
-- writes come from the pipeline (`scripts/load_neighborhood_geometries.py`)
-- via the Supabase service role key, never from the web app.

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "neighborhoods_public_read"
  ON public.neighborhoods
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT / UPDATE / DELETE policy — service role bypasses RLS entirely,
-- and no logged-in role should be writing geometries from the app.
