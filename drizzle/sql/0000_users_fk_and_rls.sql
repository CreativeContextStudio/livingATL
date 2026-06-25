-- Follow-up to drizzle/0000_sweet_scarecrow.sql.
--
-- Drizzle cannot declare an FK into Supabase's auth-owned schema without
-- trying to emit CREATE TABLE auth.users, so the FK and the initial RLS
-- setup are applied here as raw SQL. Run this immediately after the
-- Drizzle migration for the same version.
--
-- PRD §2.4 (RLS), §4.2 (users table), §8.1 (identity/attribution).

ALTER TABLE public.users
  ADD CONSTRAINT users_id_auth_users_fk
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Minimal self-read policy. Authenticated users can read their own row.
-- The full per-role policy set (contributor / steward / admin) ships with
-- the Week 1 schema migration.
CREATE POLICY users_self_read ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
