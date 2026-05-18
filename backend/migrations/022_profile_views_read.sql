-- profile_views テーブルに confirmed_at カラムを追加（足跡の既読管理）
ALTER TABLE public.profile_views
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
