-- department カラム追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS clubs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admission_year integer,
  ADD COLUMN IF NOT EXISTS faculty_hide_level text
    NOT NULL DEFAULT 'none'
    CHECK (faculty_hide_level IN ('none', 'faculty', 'department')),
  ADD COLUMN IF NOT EXISTS hidden_clubs text[] DEFAULT '{}';

-- 既存の club（単一文字列）を clubs 配列に移行
UPDATE public.profiles
  SET clubs = ARRAY[club]
  WHERE club IS NOT NULL AND club != '' AND (clubs IS NULL OR clubs = '{}');

-- 承認後ロック用フラグ
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_faculty
  ON public.profiles(faculty);
CREATE INDEX IF NOT EXISTS idx_profiles_department
  ON public.profiles(department);
