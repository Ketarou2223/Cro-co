-- migration 059: profiles.real_name / student_number と ibh.student_number_hash / real_name_hash を DROP
--
-- 適用状況: 未適用（dev/prod とも）
-- 適用タイミング: Phase C-1 コードデプロイ（059 なしでも動作）が完了し、オーナーが GO を出した後。
--
-- 依存 DROP について:
--   048_input_constraints.sql で作成した profiles の student_number フォーマット CHECK 制約は
--   DROP COLUMN IF EXISTS で列ごと削除されるため連動削除される。
--   uq_ibh_student_number_hash（unique index on identity_block_hashes.student_number_hash）も同様。
--   明示 DROP IF EXISTS を併記して冪等性を担保する。

-- ① profiles テーブルから平文カラムを DROP
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS real_name,
  DROP COLUMN IF EXISTS student_number;

-- ② identity_block_hashes テーブルからハッシュカラムを DROP
--   uq_ibh_student_number_hash は DROP COLUMN で連動削除されるが、先に DROP INDEX して冪等化
DROP INDEX IF EXISTS uq_ibh_student_number_hash;
ALTER TABLE public.identity_block_hashes
  DROP COLUMN IF EXISTS student_number_hash,
  DROP COLUMN IF EXISTS real_name_hash;
