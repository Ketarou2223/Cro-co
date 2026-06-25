-- migration 068: profiles.bio の CHECK 制約を ≤500 から ≤1000 に拡張
--
-- 変更前: bio IS NULL OR char_length(bio) <= 500  (migration 002 で追加)
-- 変更後: bio IS NULL OR char_length(bio) <= 1000
--
-- アプリ層（schemas/profile.py・ProfileEditPage・SetupOptionalPage）も同時に更新済み。
-- 既存データへの影響: bio が 500 字以内のみ存在するため、制約緩和により全行通過する。
-- 冪等: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT で再実行してもエラーにならない。

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_check
    CHECK (bio IS NULL OR char_length(bio) <= 1000);
