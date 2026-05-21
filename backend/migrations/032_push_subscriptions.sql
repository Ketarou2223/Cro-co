-- 032: Web Push 購読テーブル
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.push_subscriptions TO service_role;
CREATE POLICY "service_role full access" ON public.push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);
