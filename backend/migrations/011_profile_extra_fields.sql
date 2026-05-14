-- 011: profiles テーブルに追加項目を付与

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS club      text,
  ADD COLUMN IF NOT EXISTS hometown  text,
  ADD COLUMN IF NOT EXISTS looking_for text
    CHECK (looking_for IN ('恋愛', '友達', 'なんでも'));
