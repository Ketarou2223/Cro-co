-- migration 062: 身分（学部生/院生）カラム追加と既存データ後埋め
-- student_type: 'undergrad'（学部生）/ 'grad'（院生）。本人確認で確定・変更不可運用。
-- year は従来どおり「学年（可変）」。院生は 7-11（M1-D3）を取りうる。
-- admission_year（入学年度・不変）は既存カラム。本人確認で取得する設計に移行。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_type text;

-- 既存行の後埋め: 現状 year<=6 は学部生、7-11 は院生とみなす
-- （院生 year は migration 060 で許容済み。現状 prod に院生がいなければ全員 undergrad になる）
UPDATE public.profiles
SET student_type = CASE
    WHEN year IS NULL THEN NULL
    WHEN year <= 6 THEN 'undergrad'
    ELSE 'grad'
  END
WHERE student_type IS NULL;

-- CHECK 制約（NULL 許容＝オンボ未完ユーザーのため）
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_student_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_student_type_check
    CHECK (student_type IS NULL OR student_type IN ('undergrad','grad'));
