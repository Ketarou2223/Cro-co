-- 016: message_reactions (メッセージリアクション)

CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'heart'
    CHECK (reaction IN ('heart')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.message_reactions TO service_role;

CREATE POLICY "service_role full access" ON public.message_reactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "match members can select reactions" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.matches mt ON mt.id = m.match_id
      WHERE m.id = message_id
        AND (mt.user_a_id = auth.uid() OR mt.user_b_id = auth.uid())
    )
  );
