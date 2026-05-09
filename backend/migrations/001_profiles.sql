-- =============================================================
-- 001_profiles.sql
-- profiles テーブル・RLS・トリガーの作成
-- 冪等性あり: 何度実行しても安全
-- =============================================================

-- -------------------------------------------------------------
-- 1. 既存オブジェクトの DROP（冪等性）
-- -------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- -------------------------------------------------------------
-- 2. profiles テーブル作成
-- -------------------------------------------------------------
CREATE TABLE public.profiles (
    id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 3. RLS 有効化
-- -------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 4. ユーザー用ポリシー（自分の行のみ SELECT 可能）
-- -------------------------------------------------------------
CREATE POLICY "users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- -------------------------------------------------------------
-- 5. service_role 用ポリシー（バックエンドからフルアクセス）
-- -------------------------------------------------------------
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "service_role full access"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- -------------------------------------------------------------
-- 6. updated_at 自動更新トリガー
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------
-- 7. 新規ユーザー登録時に profiles へ自動 INSERT するトリガー
--    SECURITY DEFINER: auth.users への書き込み権限が必要なため
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
