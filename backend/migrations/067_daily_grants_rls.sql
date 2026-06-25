-- migration 067: daily_questions / daily_answers の service_role GRANT・RLS ポリシー追加
-- 背景: 066 でテーブル作成・RLS 有効化したが GRANT と service_role ポリシーが抜けており
--        GET /api/daily/today が 500（permission denied 42501）になっていた。
-- 冪等: GRANT は冪等 / ポリシーは DROP IF EXISTS → CREATE パターン（053 準拠）。

-- ── daily_questions ──────────────────────────────────────────────────────────

-- GRANT（§4 Rule4: RLS と GRANT は両輪で確認する）
GRANT ALL ON public.daily_questions TO service_role;

-- service_role 全許可ポリシー（§4 Rule1: service_role 一本化が原則）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'daily_questions'
      AND policyname = 'service_role full access'
  ) THEN
    CREATE POLICY "service_role full access" ON public.daily_questions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── daily_answers ─────────────────────────────────────────────────────────────

GRANT ALL ON public.daily_answers TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'daily_answers'
      AND policyname = 'service_role full access'
  ) THEN
    CREATE POLICY "service_role full access" ON public.daily_answers
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
