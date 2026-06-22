-- 056_drop_hash_columns.sql
-- profiles テーブルの real_name_hash / student_number_hash カラム DROP。
-- SSoT は identity_block_hashes テーブルに移行済み（migration 051・backfill 完了）。
--
-- ⚠️ 適用前の必須作業（オーナー GO 待ち・2026-06-22 時点で未実施）:
--   1. profile.py:812 の SELECT から real_name_hash, student_number_hash を除去
--   2. admin.py:682 の SELECT から real_name_hash, student_number_hash を除去
--   3. identity_block.py:86-87 の profiles.hash フォールバック経路を除去
--   4. backfill_identity_blocks.py:53 の SELECT から両カラムを除去
--   上記コード変更をデプロイしてから本マイグレーションを適用すること。
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
