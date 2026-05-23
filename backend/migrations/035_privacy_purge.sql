-- 個人情報削除のためのカラム追加
-- 承認後3日で本人確認情報を削除し、再BAN逃れ検出用にハッシュだけ残す

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS real_name_hash text,
  ADD COLUMN IF NOT EXISTS student_number_hash text,
  ADD COLUMN IF NOT EXISTS privacy_purged_at timestamptz;

-- ハッシュは再登録検出用のインデックス
CREATE INDEX IF NOT EXISTS idx_profiles_real_name_hash
  ON public.profiles(real_name_hash)
  WHERE real_name_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_student_number_hash
  ON public.profiles(student_number_hash)
  WHERE student_number_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_purged_at
  ON public.profiles(privacy_purged_at);

COMMENT ON COLUMN public.profiles.age IS '誕生日から計算した年齢（birth_date削除後の代替）';
COMMENT ON COLUMN public.profiles.real_name_hash IS 'real_nameのSHA-256ハッシュ。再登録検出用';
COMMENT ON COLUMN public.profiles.student_number_hash IS 'student_numberのSHA-256ハッシュ。再登録検出用';
COMMENT ON COLUMN public.profiles.privacy_purged_at IS '個人情報削除実行日時';
