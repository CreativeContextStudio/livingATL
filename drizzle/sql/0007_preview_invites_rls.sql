-- RLS companion for 0007 (preview_invites).
--
-- Invite tokens (hashed) are secrets: no anon or authenticated access at all.
-- The web app and `livingatl-pipeline/scripts/invites.py` connect with the
-- privileged database role, which bypasses RLS.

ALTER TABLE public.preview_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preview_invites_no_client_access"
  ON public.preview_invites
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
