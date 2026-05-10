ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_image_path text;
