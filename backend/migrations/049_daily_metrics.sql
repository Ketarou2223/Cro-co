-- ============================================================
-- 049_daily_metrics: 日次メトリクス・スナップショット
-- 目的: 登録数・アクティブ数の推移を貯める（成長分析の土台）
-- 設計: key-value 方式（後から metric_key を足すのに migration 不要）
-- 冪等: UNIQUE(snapshot_date, metric_key) で再実行しても重複しない
-- ============================================================

-- 1. テーブル
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  snapshot_date date        NOT NULL,
  metric_key    text        NOT NULL,
  value         bigint      NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, metric_key)
);

-- 2. RLS（service_role 専用・§4 Rule1 準拠）
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.daily_metrics TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'daily_metrics'
      AND policyname = 'service_role full access on daily_metrics'
  ) THEN
    CREATE POLICY "service_role full access on daily_metrics"
      ON public.daily_metrics
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END;
$$;

-- 3. スナップショット関数
--    target: 記録対象の JST 日付（cron は前日を渡す）
--    ON CONFLICT DO UPDATE で冪等（手動再実行・バックフィル可能）
CREATE OR REPLACE FUNCTION public.snapshot_daily_metrics(target date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
BEGIN
  INSERT INTO public.daily_metrics (snapshot_date, metric_key, value)
  VALUES
    -- ── 累計（スナップ時点 as-of） ────────────────────────────────────
    -- users_total: 削除済みを除く全ユーザー数
    (target, 'users_total',
      (SELECT COUNT(*) FROM profiles
       WHERE status NOT IN ('deleted'))),
    (target, 'users_approved',
      (SELECT COUNT(*) FROM profiles WHERE status = 'approved')),
    (target, 'users_pending',
      (SELECT COUNT(*) FROM profiles WHERE status = 'pending_review')),
    -- users_rejected: 審査で不合格（identity_verified=false のまま rejected）
    (target, 'users_rejected',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'rejected' AND identity_verified IS NOT TRUE)),
    -- users_suspended: 承認後に管理者が suspend（identity_verified=true で rejected）
    (target, 'users_suspended',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'rejected' AND identity_verified IS TRUE)),
    (target, 'users_banned',
      (SELECT COUNT(*) FROM profiles WHERE status = 'banned')),
    (target, 'users_approved_male',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved' AND gender = 'male')),
    (target, 'users_approved_female',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved' AND gender = 'female')),
    (target, 'matches_total',
      (SELECT COUNT(*) FROM matches)),
    (target, 'messages_total',
      (SELECT COUNT(*) FROM messages)),
    (target, 'likes_total',
      (SELECT COUNT(*) FROM likes)),
    (target, 'reports_pending',
      (SELECT COUNT(*) FROM reports WHERE status = 'pending')),
    (target, 'inquiries_unread',
      (SELECT COUNT(*) FROM inquiries WHERE status = 'unread')),
    (target, 'photos_pending',
      (SELECT COUNT(*) FROM profile_images WHERE status = 'pending')),
    -- ── その日の増分（JST 暦日・created_at / reviewed_at 基準） ─────────
    (target, 'signups_new',
      (SELECT COUNT(*) FROM profiles
       WHERE (created_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    -- approvals_new: identity_verified=true が確定した日の件数
    (target, 'approvals_new',
      (SELECT COUNT(*) FROM profiles
       WHERE identity_verified IS TRUE
         AND (reviewed_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    (target, 'matches_new',
      (SELECT COUNT(*) FROM matches
       WHERE (created_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    (target, 'messages_new',
      (SELECT COUNT(*) FROM messages
       WHERE (created_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    (target, 'likes_new',
      (SELECT COUNT(*) FROM likes
       WHERE (created_at AT TIME ZONE 'Asia/Tokyo')::date = target)),
    -- ── アクティブ（スナップ時点 rolling・last_seen_at 由来・approved のみ） ──
    (target, 'active_24h',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved'
         AND last_seen_at >= _now - INTERVAL '24 hours')),
    (target, 'active_7d',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved'
         AND last_seen_at >= _now - INTERVAL '7 days')),
    (target, 'active_30d',
      (SELECT COUNT(*) FROM profiles
       WHERE status = 'approved'
         AND last_seen_at >= _now - INTERVAL '30 days'))
  ON CONFLICT (snapshot_date, metric_key) DO UPDATE
    SET value = EXCLUDED.value;
END;
$$;

-- 4. pg_cron: 毎日 JST 0:05（UTC 15:05）に前日分を記録
--    既存の generate-like-quota（UTC 15:00）と同じ運用パターン
--    cron.schedule は job_name でupsert するため再実行でも重複しない
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'snapshot-daily-metrics',
  '5 15 * * *',
  $$SELECT public.snapshot_daily_metrics(
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date - 1
  );$$
);

-- 5. 初回シード（適用直後に手動実行してください）
-- 適用後に SQL Editor で下記を実行して今日分の初期値を投入します:
--   SELECT public.snapshot_daily_metrics(
--     (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
--   );
-- これにより day-1 のデータを空にせずに済みます。
