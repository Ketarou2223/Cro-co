-- 056_drop_hash_columns.sql
-- profiles テーブルの real_name_hash / student_number_hash カラム DROP。
-- SSoT は identity_block_hashes テーブルに移行済み（migration 051・backfill 完了）。
--
-- ✅ 適用前必須作業 完了（commit 6ee94d6・2026-06-22）:
--   1. profile.py       の SELECT から real_name_hash, student_number_hash を除去 → 完了
--   2. admin.py:682     の SELECT から real_name_hash, student_number_hash を除去 → 完了
--   3. identity_block.py の profiles.hash フォールバック経路を ibh lookup に置換  → 完了
--   4. backfill_identity_blocks.py の SELECT から profiles 側カラムを除去         → 完了
--   ⚠️ 上記コードを prod Render にデプロイしてから本マイグレーションを適用すること。
--
-- 事前チェック結果（2026-06-22 実測）:
--   dev: profiles.real_name_hash IS NOT NULL = 12件 / ibh_total=33 (profiles_approved_banned と一致)
--   prod: profiles.real_name_hash IS NOT NULL = 3件  / ibh_total=7  (profiles_approved_banned と一致)
--   → identity_block_hashes の SSoT カバレッジは dev/prod とも 100%
--   → profiles.real_name_hash が非ゼロのためコード参照除去後に再確認が必要

DROP INDEX IF EXISTS idx_profiles_real_name_hash;
DROP INDEX IF EXISTS idx_profiles_student_number_hash;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS real_name_hash;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS student_number_hash;
