-- migration 060: profiles.year の CHECK 制約を 1〜11 に拡張（院生サポート）
--
-- 変更前: year >= 1 AND year <= 6
-- 変更後: year >= 1 AND year <= 11
-- 値の意味: 1〜6 = 学部1〜6年, 7 = 修士1年, 8 = 修士2年, 9 = 博士1年, 10 = 博士2年, 11 = 博士3年
--
-- @ecs.osaka-u.ac.jp は院生も終生有効なため、学年の上限を 6 → 11 に拡張。
-- アプリ層（schemas/profile.py・routers/profile.py）も同様に le=11 に更新済み。
--
-- 既存データへの影響: year は 1〜6 の値しか存在しないため、制約緩和により既存行は全て通過する。
-- 冪等: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT により再実行してもエラーにならない。

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_year_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_year_check
    CHECK (year IS NULL OR (year >= 1 AND year <= 11));
