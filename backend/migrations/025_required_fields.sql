ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS real_name text,
  ADD COLUMN IF NOT EXISTS student_number text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 既存ユーザーの移行
UPDATE public.profiles
  SET onboarding_completed = true
  WHERE status IN ('approved', 'pending_review')
    AND profile_setup_completed = true;
