-- 019_login_history.sql
-- 冪等: DROP IF EXISTS → CREATE

DROP TABLE IF EXISTS public.login_history CASCADE;

CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_history_user_id ON public.login_history(user_id, logged_in_at DESC);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.login_history TO service_role;

CREATE POLICY "service_role full access" ON public.login_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated select own" ON public.login_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
