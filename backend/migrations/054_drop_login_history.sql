-- 054_drop_login_history.sql
-- login_history テーブルは migration 019 で作成済みだが、
-- 書き込みコードが存在しないため削除する（grep 確認: Python/TS 参照ゼロ）。
-- migration 050 で authenticated select own ポリシーを DROP 済み（冪等）。
DROP TABLE IF EXISTS public.login_history CASCADE;
