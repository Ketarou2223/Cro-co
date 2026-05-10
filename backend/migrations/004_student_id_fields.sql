-- profiles に学生証関連フィールドを追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_id_image_path text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

COMMENT ON COLUMN public.profiles.student_id_image_path IS 'Supabase Storage student-ids バケットのオブジェクトパス';
COMMENT ON COLUMN public.profiles.submitted_at IS '学生証提出日時';
