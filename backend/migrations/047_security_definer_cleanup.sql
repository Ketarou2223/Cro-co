-- 047_security_definer_cleanup.sql
-- 目的:
--   A: prod の幽霊関数 create_profile_for_user を DROP（dev は IF EXISTS で no-op）
--   B: detect_match の search_path を public に固定（SECURITY DEFINER best practice）
--   C: like_quota の service_role ポリシー重複を解消（prod のみ2本・dev は IF EXISTS で no-op）
-- 冪等: IF EXISTS / ALTER FUNCTION は再実行しても安全。
-- 適用先:
--   A: prod のみ実体（dev には関数が存在しないため no-op）
--   B: dev/prod 両方（detect_match は両環境に存在）
--   C: prod のみ2本（dev は既に1本のため DROP IF EXISTS は no-op）
--
-- 安全確認済み（2026-06-03）:
--   A: frontend/src・backend/app・migrations 全 grep で参照ゼロ件
--      トリガー登録なし・pg_depend 外部依存なし
--   C: 2本とも service_role ALL USING (true) WITH CHECK (true) で同一内容を prod で確認

-- A: 幽霊関数の除去
-- migration 管理外の手動 DDL 残骸。handle_new_user が on_auth_user_created の実体であり
-- create_profile_for_user はトリガー未登録・コード参照ゼロ。
DROP FUNCTION IF EXISTS public.create_profile_for_user();

-- B: detect_match の search_path を固定
-- SECURITY DEFINER 関数は search_path を明示固定するのが best practice。
-- search_path 未固定のまま SECURITY DEFINER にすると、呼び出し元セッションの
-- search_path に引きずられる形式的リスクがある。ALTER のみ（本体不変）。
ALTER FUNCTION public.detect_match() SET search_path = public;

-- C: like_quota の service_role ポリシー重複解消
-- "service_role full access on like_quota" を残し（dev と命名を揃える）、
-- "service_role full access"（短い名前・migration 028 の命名ゆれ）を除去。
DROP POLICY IF EXISTS "service_role full access" ON public.like_quota;
