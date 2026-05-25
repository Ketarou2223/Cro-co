-- 退会処理ソフトデリート対応
-- profiles テーブルに deleted_at カラムを追加

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- messages テーブルの RLS:
-- 送信者または受信者（match経由）のいずれかが status='deleted' の場合は SELECT 不可
-- ※ バックエンドは service_role でアクセスするため RLS はバイパスされる
--   これは anon/authenticated ロールによる直接アクセスへの防御層

-- 既存の RLS ポリシーと重複しないよう IF NOT EXISTS ではなく DROP してから作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'hide_messages_with_deleted_user'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "hide_messages_with_deleted_user" ON public.messages
        FOR SELECT
        USING (
          NOT EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.matches m ON m.id = messages.match_id
            WHERE p.status = 'deleted'
              AND (p.id = m.user_a_id OR p.id = m.user_b_id)
          )
        )
    $policy$;
  END IF;
END;
$$;
