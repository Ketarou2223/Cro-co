-- 性別・恋愛対象・プロフィール完了フラグを profiles に追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS interest_in text
    CHECK (interest_in IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS profile_completed boolean
    NOT NULL DEFAULT false;

-- status の CHECK 制約を再定義（既存値を保護しつつ冪等に実行）
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
    CHECK (status IN (
      'pending_review',
      'approved',
      'rejected'
    ));
