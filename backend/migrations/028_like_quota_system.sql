-- ============================================
-- BeReal型いいね受信枠システム
-- 男女マッチ志向の女性のみが対象
-- ============================================

-- like_quota テーブル
CREATE TABLE IF NOT EXISTS like_quota (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  opens_at timestamptz NOT NULL,
  used_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_like_quota_user_date ON like_quota(user_id, date DESC);

-- likes テーブル拡張
ALTER TABLE likes
  ADD COLUMN IF NOT EXISTS via_footprint boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS counted_to_quota boolean NOT NULL DEFAULT false;

-- カウント対象判定関数
CREATE OR REPLACE FUNCTION should_count_quota(
  p_liker_id uuid,
  p_liked_id uuid,
  p_via_footprint boolean
) RETURNS boolean AS $$
DECLARE
  liker_gender text;
  liker_interest text;
  liked_gender text;
  liked_interest text;
  footprint_exists boolean;
BEGIN
  SELECT gender, interest_in INTO liker_gender, liker_interest
    FROM profiles WHERE id = p_liker_id;
  SELECT gender, interest_in INTO liked_gender, liked_interest
    FROM profiles WHERE id = p_liked_id;

  -- 男女マッチペアでない場合はカウント外
  IF NOT (liker_gender = 'male' AND liked_gender = 'female'
         AND liker_interest = 'female' AND liked_interest = 'male') THEN
    RETURN false;
  END IF;

  -- 足跡経由でカウント外
  IF p_via_footprint THEN
    SELECT EXISTS(
      SELECT 1 FROM profile_views
      WHERE viewer_id = p_liker_id AND viewed_id = p_liked_id
    ) INTO footprint_exists;
    IF footprint_exists THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- pg_cron 拡張機能を有効化（既に有効なら無視）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 毎日 JST 0:00（UTC 15:00）に翌日分の枠を生成
SELECT cron.schedule(
  'generate-like-quota',
  '0 15 * * *',
  $$
    INSERT INTO like_quota (user_id, date, opens_at, used_count)
    SELECT
      id,
      (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '9 hours')::date,
      ((CURRENT_DATE + INTERVAL '1 day')::timestamp
        + INTERVAL '8 hours'
        + (random() * INTERVAL '10 hours')) AT TIME ZONE 'Asia/Tokyo',
      0
    FROM profiles
    WHERE gender = 'female'
      AND interest_in = 'male'
      AND status = 'approved'
    ON CONFLICT (user_id, date) DO NOTHING;
  $$
);

-- 初回実行: 今日分の枠を生成（既存ユーザー向け）
INSERT INTO like_quota (user_id, date, opens_at, used_count)
SELECT
  id,
  CURRENT_DATE,
  (CURRENT_DATE::timestamp
    + INTERVAL '8 hours'
    + (random() * INTERVAL '10 hours')) AT TIME ZONE 'Asia/Tokyo',
  0
FROM profiles
WHERE gender = 'female'
  AND interest_in = 'male'
  AND status = 'approved'
ON CONFLICT (user_id, date) DO NOTHING;
