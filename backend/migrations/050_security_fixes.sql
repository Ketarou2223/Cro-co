-- migration 050: セキュリティ修正 (2026-06-06)
-- B-1: plus-alias (@ecs.osaka-u.ac.jp+alias) でのアカウント作成防止
-- B-7: 死んでいる authenticated RLS ポリシーを DROP して service_role 一本化を完徹

-- ────────────────────────────────────────────────
-- B-1: plus-alias rejection
-- enforce_university_email_domain を OR REPLACE で更新。
-- 既存トリガー enforce_email_domain_on_signup（migration 034 作成）はそのまま有効。
-- ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_university_email_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1) ローカルパートに '+' を含むプラスエイリアスを拒否
  -- 2) ドメインが ecs.osaka-u.ac.jp と完全一致すること（後方一致 ILIKE から厳格化）
  IF NEW.email IS NULL
     OR lower(NEW.email) LIKE '%+%@%'
     OR split_part(lower(NEW.email), '@', 2) != 'ecs.osaka-u.ac.jp'
  THEN
    RAISE EXCEPTION '大阪大学のメールアドレス（@ecs.osaka-u.ac.jp）でのみ登録できます'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────
-- B-7: 死んでいる authenticated RLS ポリシーを DROP
-- GRANT は revoke 済みで pg_policies に残存するだけの死荷重。
-- GRANT が再付与されても開くべき穴がなくなる（service_role 一本化の完徹）。
-- 消して困るポリシーは無いことを確認済み:
--   • authenticated/anon への GRANT は migration 044/045 で全 revoke 済み
--   • アプリは全操作を FastAPI（service_role）経由で実行するため authenticated 行は機能しない
--   • blocks の「第2層防衛」も GRANT ゼロで機能しておらず service_role ガードで十分
-- ────────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "users can view own profile" ON public.profiles;

-- hides
DROP POLICY IF EXISTS "hides_self" ON public.hides;

-- blocks
DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;

-- message_reactions
DROP POLICY IF EXISTS "match members can select reactions" ON public.message_reactions;

-- notifications
DROP POLICY IF EXISTS "authenticated select own" ON public.notifications;
DROP POLICY IF EXISTS "authenticated update own" ON public.notifications;

-- login_history
DROP POLICY IF EXISTS "authenticated select own" ON public.login_history;

-- inquiries
DROP POLICY IF EXISTS "users read own inquiries" ON public.inquiries;
