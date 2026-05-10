-- 冪等性: 既存テーブルを消してから再作成
DROP TABLE IF EXISTS public.likes CASCADE;

CREATE TABLE public.likes (
    liker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    liked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (liker_id, liked_id),
    CHECK (liker_id != liked_id)
);

-- 「誰から自分にいいねが来たか」を高速検索するインデックス
CREATE INDEX idx_likes_liked_id ON public.likes(liked_id);

-- RLS 有効化
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes FORCE ROW LEVEL SECURITY;

-- service_role フルアクセス
GRANT ALL ON public.likes TO service_role;

CREATE POLICY "service_role full access on likes"
    ON public.likes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
