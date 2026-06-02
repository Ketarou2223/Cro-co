-- 046_backfill_reviewed_at.sql
-- reviewed_at が NULL のまま承認された既存ユーザーに submitted_at を設定し
-- privacy_purge バッチが3日経過判定できるようにする
--
-- 対象: status='approved' AND reviewed_at IS NULL AND student_id_image_path IS NOT NULL AND privacy_purged_at IS NULL
-- 根拠: 管理画面外（Supabase Studio 直接操作など）で status='approved' にした場合は
--       admin.py の approve エンドポイントを通らないため reviewed_at が書き込まれない。
--       submitted_at（学生証アップロード日時）を代替起点とし、少なくとも3日以上前に
--       提出済みのユーザーが次回バッチで削除対象となる。
-- 冪等: 既に reviewed_at が設定済みのユーザーは WHERE 条件で除外される。

UPDATE public.profiles
SET reviewed_at = COALESCE(submitted_at, created_at)
WHERE status = 'approved'
  AND reviewed_at IS NULL
  AND student_id_image_path IS NOT NULL
  AND privacy_purged_at IS NULL;
