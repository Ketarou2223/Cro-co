-- 018_notifications.sql
-- 冪等: DROP IF EXISTS → CREATE

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('match', 'like', 'view', 'message')),
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  message_preview text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.notifications TO service_role;

CREATE POLICY "service_role full access" ON public.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated select own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "authenticated update own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
