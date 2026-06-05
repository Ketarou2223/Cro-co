-- 048_input_constraints.sql
-- student_number に長さ・英数字形式の CHECK 制約を追加する。
-- NULL は許容（privacy_purge バッチが承認後 3 日で NULL 化するため）。
-- アプリ層（Pydantic / Form）と二層で担保する「保険」として位置付ける。
--
-- ⚠️ 適用前に既存データの確認を推奨:
--   SELECT COUNT(*) FROM public.profiles
--   WHERE student_number IS NOT NULL
--     AND NOT (char_length(student_number) BETWEEN 1 AND 20
--              AND student_number ~ '^[A-Za-z0-9]+$');
--   → 0 件なら安全に適用可。1 件以上あれば先に対象行を修正またはクリーンアップする。

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND constraint_name = 'profiles_student_number_format'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_student_number_format
      CHECK (
        student_number IS NULL
        OR (
          char_length(student_number) BETWEEN 1 AND 20
          AND student_number ~ '^[A-Za-z0-9]+$'
        )
      );
  END IF;
END;
$$;
