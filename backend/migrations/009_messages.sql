-- 冪等性: messages を先に削除（matches.id への外部キー参照があるため）
DROP TABLE IF EXISTS public.messages CASCADE;

-- matches テーブルの PK を複合キーから単一 uuid に変更（冪等）
-- 既存の UNIQUE 制約・PK・id 列をすべて安全に除去してから再作成する
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_user_pair_unique;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_pkey;
ALTER TABLE public.matches DROP COLUMN IF EXISTS id;

-- id 列を追加（既存行にも DEFAULT で自動発番される）
ALTER TABLE public.matches
    ADD COLUMN id uuid DEFAULT gen_random_uuid();

-- id を PRIMARY KEY に昇格
ALTER TABLE public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);

-- (user_a_id, user_b_id) は UNIQUE 制約として残す
-- detect_match 関数の ON CONFLICT (user_a_id, user_b_id) DO NOTHING はこれを使用する
ALTER TABLE public.matches
    ADD CONSTRAINT matches_user_pair_unique UNIQUE (user_a_id, user_b_id);

-- messages テーブル作成
CREATE TABLE public.messages (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id   uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id  uuid        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
    content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 時系列取得を高速化するインデックス
CREATE INDEX idx_messages_match_created ON public.messages(match_id, created_at);

-- RLS 有効化
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

-- service_role フルアクセス（既存テーブルと同じパターン）
GRANT ALL ON public.messages TO service_role;

CREATE POLICY "service_role full access on messages"
    ON public.messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
