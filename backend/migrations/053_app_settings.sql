-- migration 053: アプリ設定テーブル（メンテナンスフラグ等の key-value ストア）
-- 冪等: CREATE TABLE IF NOT EXISTS / INSERT ON CONFLICT DO NOTHING

CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text        PRIMARY KEY,
  value      text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- メンテナンスフラグの初期値（再実行しても上書きしない）
INSERT INTO public.app_settings(key, value, updated_at)
  VALUES ('maintenance_mode', 'false', now())
  ON CONFLICT (key) DO NOTHING;

-- RLS 有効化
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- GRANT（§4 Rule4）
GRANT ALL ON public.app_settings TO service_role;

-- service_role 全許可ポリシー（§4 Rule1・冪等）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_settings'
      AND policyname = 'service_role full access'
  ) THEN
    CREATE POLICY "service_role full access" ON public.app_settings
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
