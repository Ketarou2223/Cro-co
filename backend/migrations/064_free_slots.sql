ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_slots text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_free_slots_format'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_free_slots_format
      CHECK (free_slots IS NULL OR free_slots ~ '^[01]{25}$');
  END IF;
END $$;
