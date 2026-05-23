-- Auth hook: メールドメインを強制的に @ecs.osaka-u.ac.jp に制限
-- Supabase Auth の Hook 機能を使ってサインアップ時に DB レベルで検証

CREATE OR REPLACE FUNCTION public.enforce_university_email_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@ecs.osaka-u.ac.jp') THEN
    RAISE EXCEPTION '大阪大学のメールアドレス（@ecs.osaka-u.ac.jp）でのみ登録できます'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_email_domain_on_signup ON auth.users;
CREATE TRIGGER enforce_email_domain_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_university_email_domain();
