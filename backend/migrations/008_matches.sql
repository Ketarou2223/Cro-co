-- 冪等性: 依存オブジェクトを安全な順序で削除
-- likes テーブルが存在する場合のみトリガーを削除（テーブルがないとDROP TRIGGERがエラーになるため）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'likes'
    ) THEN
        DROP TRIGGER IF EXISTS on_like_inserted_detect_match ON public.likes;
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.detect_match();
DROP TABLE IF EXISTS public.matches CASCADE;

-- matches テーブル
-- (user_a_id, user_b_id) で1ペアを表現。user_a_id < user_b_id に正規化して重複防止
CREATE TABLE public.matches (
    user_a_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_a_id, user_b_id),
    CHECK (user_a_id < user_b_id)
);

CREATE INDEX idx_matches_user_a ON public.matches(user_a_id);
CREATE INDEX idx_matches_user_b ON public.matches(user_b_id);

-- RLS 有効化
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches FORCE ROW LEVEL SECURITY;

-- service_role フルアクセス（既存テーブルと同じパターン）
GRANT ALL ON public.matches TO service_role;

CREATE POLICY "service_role full access on matches"
    ON public.matches
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- マッチ自動生成トリガー関数
-- likes INSERT 時に相互いいねを検知し、matches へ自動挿入する
CREATE OR REPLACE FUNCTION public.detect_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 相手(NEW.liked_id)から自分(NEW.liker_id)へのいいねが存在するか確認
    IF EXISTS (
        SELECT 1 FROM public.likes
        WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
    ) THEN
        -- user_a_id < user_b_id になるよう LEAST/GREATEST で正規化して INSERT
        INSERT INTO public.matches (user_a_id, user_b_id)
        VALUES (
            LEAST(NEW.liker_id, NEW.liked_id),
            GREATEST(NEW.liker_id, NEW.liked_id)
        )
        ON CONFLICT (user_a_id, user_b_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- likes テーブルへの INSERT 後に発火するトリガー
CREATE TRIGGER on_like_inserted_detect_match
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.detect_match();
