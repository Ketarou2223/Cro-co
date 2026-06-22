-- 055_drop_looking_for.sql
-- looking_for カラムはフロント/バック両方で未使用のため削除する。
-- コード参照を先に除去済み（schemas/browse.py・schemas/profile.py・
-- schemas/admin.py・routers/browse.py・hooks/useProfile.ts）。
ALTER TABLE public.profiles DROP COLUMN IF EXISTS looking_for;
