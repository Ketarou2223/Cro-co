-- migration 058: identity_block_hashes.student_number_hash を NULL 可に変更
-- 目的: 学生証未提出のまま退会したユーザー（未承認退会）でも email_hash だけで IBH に行を INSERT できるようにする
-- 背景: migration 051 の NOT NULL 制約により email_hash のみでの INSERT が DB 層で弾かれ、
--       未承認退会者の再登録ブロック記録がゼロになっていた（dev で4件の宙吊り状態が判明）。
-- Phase A 以降の照合キーは email_hash のみ（student_number_hash は参照しない）のため、
--       student_number_hash が NULL の行は照合上問題なし。
--
-- 適用状況:
--   dev  適用済み 2026-06-22
--   prod ⚠️ 未適用 — オーナーが手動適用

ALTER TABLE public.identity_block_hashes
  ALTER COLUMN student_number_hash DROP NOT NULL;

-- 既存の uq_ibh_student_number_hash は PostgreSQL の UNIQUE インデックスが NULL を別値として扱うため変更不要。
-- 複数の NULL 行が許容され、非 NULL の student_number_hash に対してのみ一意性が保証される。
-- email_hash の一意性は migration 057 の uq_ibh_email_hash（部分インデックス WHERE email_hash IS NOT NULL）が担保済み。
