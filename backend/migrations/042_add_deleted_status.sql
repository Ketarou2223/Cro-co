-- 042_add_deleted_status.sql
-- 目的: profiles.status の CHECK に 'deleted' を追加。
--   DELETE /api/profile/me（profile.py:772-786）のソフトデリート UPDATE が
--   CHECK 違反で 500 になっていた本番退会バグを解消し、
--   seed v2 No.10 の deleted 投入 400 も解消する。
-- 影響: dev/prod とも既存 'deleted' 行ゼロ確認済み（introspection・2026-05-28）。
-- 冪等性: DROP + ADD（023/036 と同形）。再実行可。

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'banned', 'deleted'));
