-- 012_safety_features.sql
-- blocks / reports / hides テーブル（冪等）

DROP TABLE IF EXISTS public.hides CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.blocks CASCADE;

-- ブロックテーブル
CREATE TABLE public.blocks (
    blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT blocks_no_self CHECK (blocker_id != blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocks_self ON public.blocks
    FOR ALL TO authenticated
    USING (auth.uid() = blocker_id OR auth.uid() = blocked_id)
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY blocks_service_role ON public.blocks
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.blocks TO service_role;

-- 通報テーブル
CREATE TABLE public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason text NOT NULL CHECK (reason IN ('不適切な写真', 'ハラスメント', 'なりすまし', 'スパム', 'その他')),
    detail text CHECK (char_length(detail) <= 500),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reports_no_self CHECK (reporter_id != reported_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY reports_self ON public.reports
    FOR ALL TO authenticated
    USING (auth.uid() = reporter_id)
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY reports_service_role ON public.reports
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.reports TO service_role;

-- 非表示テーブル
CREATE TABLE public.hides (
    hider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hidden_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (hider_id, hidden_id),
    CONSTRAINT hides_no_self CHECK (hider_id != hidden_id)
);

ALTER TABLE public.hides ENABLE ROW LEVEL SECURITY;

CREATE POLICY hides_self ON public.hides
    FOR ALL TO authenticated
    USING (auth.uid() = hider_id)
    WITH CHECK (auth.uid() = hider_id);

CREATE POLICY hides_service_role ON public.hides
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.hides TO service_role;
