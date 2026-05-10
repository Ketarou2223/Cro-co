-- profiles.status 列追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_review'
  CHECK (status IN ('pending_review', 'approved', 'rejected'));

COMMENT ON COLUMN public.profiles.status IS 'pending_review: 審査待ち, approved: 承認済み, rejected: 却下';
