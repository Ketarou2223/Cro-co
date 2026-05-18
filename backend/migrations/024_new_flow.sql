-- profile_setup_completed: プロフィール設定完了（ブラウズ解放条件）
-- student_id_submitted: 学生証提出済み（チャット審査中）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_setup_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS student_id_submitted boolean NOT NULL DEFAULT false;

-- approved ユーザーは全て完了済み
UPDATE public.profiles
  SET profile_setup_completed = true,
      student_id_submitted = true
  WHERE status = 'approved';

-- pending_review で submitted_at がある場合は提出済み
UPDATE public.profiles
  SET profile_setup_completed = true,
      student_id_submitted = true
  WHERE status = 'pending_review'
    AND submitted_at IS NOT NULL;
