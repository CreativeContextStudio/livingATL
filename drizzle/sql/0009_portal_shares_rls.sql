-- F-portal-share companion to drizzle/0009_*.sql (applied right after it).
-- Shared answers are written and read only through the server connection
-- (POST /api/portal/share, /portal/a/<id>); Supabase client roles get nothing.

ALTER TABLE public.portal_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_shares_no_client_access ON public.portal_shares
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
