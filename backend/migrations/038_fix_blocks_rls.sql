-- 038_fix_blocks_rls.sql
-- blocks テーブルの RLS ポリシー修正
--
-- 問題:
--   012_safety_features.sql の blocks_self ポリシーは
--   USING (auth.uid() = blocker_id OR auth.uid() = blocked_id) と定義されており、
--   FOR ALL の DELETE にも USING 句が適用されるため、
--   ブロックされた側 (blocked_id) がそのレコードを DELETE できてしまう。
--   ※ WITH CHECK は INSERT / UPDATE にのみ作用し DELETE には効かない。
--
-- 修正方針:
--   hides_self / reports_self と同じパターンに揃える。
--   blocker_id のみに全操作を許可し、blocked_id 側は一切操作不可とする。
--   service_role ポリシーは変更なし。

-- 既存の誤ったポリシーを削除
DROP POLICY IF EXISTS blocks_self ON public.blocks;

-- blocker_id のみに全操作を制限
CREATE POLICY blocks_self ON public.blocks
    FOR ALL TO authenticated
    USING  (auth.uid() = blocker_id)
    WITH CHECK (auth.uid() = blocker_id);
