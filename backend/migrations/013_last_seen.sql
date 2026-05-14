ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS show_online_status boolean NOT NULL DEFAULT true;
