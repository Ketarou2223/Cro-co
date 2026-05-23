-- like_quota テーブルに RLS を有効化
-- 028_like_quota_system.sql で RLS が未設定だった脆弱性を修正

ALTER TABLE public.like_quota ENABLE ROW LEVEL SECURITY;

-- service_role のみが全操作可能（バックエンドからのみアクセス）
GRANT ALL ON public.like_quota TO service_role;

CREATE POLICY "service_role full access on like_quota"
  ON public.like_quota
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 一般ユーザーは RLS で全てブロック（明示的に何もポリシーを作らない）
-- これにより anon キー経由ではどの操作も拒否される
