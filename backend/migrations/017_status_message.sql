-- 017: status_message (今日の一言)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_message text
    CHECK (char_length(status_message) <= 30),
  ADD COLUMN IF NOT EXISTS status_message_updated_at timestamptz;
