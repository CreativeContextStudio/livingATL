-- F-report companion to drizzle/0008_*.sql (applied right after it).
--
-- reports_takedowns holds reporters' optional contact details and
-- moderation_log is the audit trail (PRD §8.5): neither is readable or
-- writable by Supabase client roles. The app inserts and the steward CLI
-- (livingatl-pipeline/scripts/reports.py) works the queue over the server
-- connection, which bypasses RLS.

ALTER TABLE public.reports_takedowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_takedowns_no_client_access ON public.reports_takedowns
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY moderation_log_no_client_access ON public.moderation_log
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- The audit log is append-only: corrections are new rows, never edits.
CREATE OR REPLACE FUNCTION public.moderation_log_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'moderation_log is append-only (% blocked)', TG_OP;
END;
$$;

CREATE TRIGGER moderation_log_append_only
  BEFORE UPDATE OR DELETE ON public.moderation_log
  FOR EACH ROW EXECUTE FUNCTION public.moderation_log_append_only();
