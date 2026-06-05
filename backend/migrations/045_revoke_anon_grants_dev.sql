-- 045_revoke_anon_grants_dev.sql
-- ⚠️ DEV 環境専用。prod には適用しない。
--    prod は anon/authenticated に DML GRANT なし（既にこの状態）のため prod 適用は不要かつ no-op。
--    3.3 調査で dev が Supabase デフォルト GRANT により anon/authenticated に全 DML を持っていたことが判明。
--    REVOKE で prod と同じ「service_role のみ DML 可能」の二層防衛構造に揃える。
-- service_role は対象外（REVOKE 対象に含まない）。FastAPI への影響なし。

-- 既存テーブルの anon/authenticated DML GRANT を revoke
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- 将来の新規テーブルへの自動付与を停止（postgres grantor 分）
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

-- 将来の新規テーブルへの自動付与を停止（supabase_admin grantor 分）
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
