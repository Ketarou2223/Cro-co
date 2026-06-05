-- 044_fix_rls_policies.sql
-- 非 service_role ポリシー4本を DROP し、PostgREST 直叩き経由の攻撃面を削減する。
-- フロントは supabase.from を直接呼ばないため再作成なし（service_role 一本化）。
-- 冪等: DROP POLICY IF EXISTS で再実行可。dev に無いポリシーは no-op。

DROP POLICY IF EXISTS "hide_messages_with_deleted_user" ON public.messages;
DROP POLICY IF EXISTS "match participants can view messages" ON public.messages;
DROP POLICY IF EXISTS blocks_delete_own ON public.blocks;
DROP POLICY IF EXISTS reports_self ON public.reports;
