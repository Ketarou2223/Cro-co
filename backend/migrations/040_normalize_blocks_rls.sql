-- 040_normalize_blocks_rls.sql
-- 目的: prod の blocks テーブルに手動追加された RLS ポリシー3本と
--       dev の状態（038 の blocks_self のみ）の差分を解消する。
-- 方針: 038 の blocks_self (FOR ALL) を DROP し、操作別の3ポリシーに置き換える。
--       blocks は INSERT/DELETE のみ想定のため UPDATE は暗黙禁止（最小権限）。
-- 冪等性: DROP POLICY IF EXISTS で再実行可能。

DROP POLICY IF EXISTS blocks_self ON public.blocks;
DROP POLICY IF EXISTS blocks_select_own ON public.blocks;
DROP POLICY IF EXISTS blocks_insert_own ON public.blocks;
DROP POLICY IF EXISTS blocks_delete_own ON public.blocks;

CREATE POLICY blocks_select_own ON public.blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY blocks_insert_own ON public.blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY blocks_delete_own ON public.blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

-- service_role は CLAUDE.md セクション4 のテンプレ通り別途確保されているので触らない
