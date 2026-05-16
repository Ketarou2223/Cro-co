-- リプライ機能: messages テーブルに reply_to_id カラムを追加
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id
  ON public.messages(reply_to_id);
