ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS year int CHECK (year IS NULL OR (year >= 1 AND year <= 6)),
  ADD COLUMN IF NOT EXISTS faculty text,
  ADD COLUMN IF NOT EXISTS bio text CHECK (bio IS NULL OR char_length(bio) <= 500);
