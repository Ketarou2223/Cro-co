-- 015: profile_views (足跡)

CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (viewer_id, viewed_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id ON public.profile_views(viewed_id, viewed_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.profile_views TO service_role;

CREATE POLICY "service_role full access" ON public.profile_views
  FOR ALL TO service_role USING (true) WITH CHECK (true);
