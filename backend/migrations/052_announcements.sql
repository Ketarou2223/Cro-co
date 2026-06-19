-- migration 052: 運営お知らせ機能（announcements・announcement_reads）
-- 冪等: CREATE TABLE IF NOT EXISTS / DO $$ ... $$ ポリシー作成

-- お知らせ本体テーブル
CREATE TABLE IF NOT EXISTS public.announcements (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  body             text        NOT NULL,
  target_all       boolean     NOT NULL DEFAULT false,
  target_faculties text[]      NOT NULL DEFAULT '{}',
  target_grades    int[]       NOT NULL DEFAULT '{}',
  target_genders   text[]      NOT NULL DEFAULT '{}',
  created_by       uuid,                        -- 参照のみ・FK なし（管理者退会で消えない）
  is_deleted       boolean     NOT NULL DEFAULT false,
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 既読管理テーブル
-- announcement_id: ON DELETE CASCADE（お知らせ物理削除時に読了レコードも消える）
-- user_id: FK なし（profiles はソフトデリートのため CASCADE 連鎖なし）
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  announcement_id  uuid        NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL,
  read_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

-- user_id でのフィルタ用インデックス
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id
  ON public.announcement_reads(user_id);

-- 未削除お知らせ一覧取得用インデックス
CREATE INDEX IF NOT EXISTS idx_announcements_is_deleted_created_at
  ON public.announcements(is_deleted, created_at DESC);

-- RLS 有効化
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- GRANT（§4 Rule4）
GRANT ALL ON public.announcements TO service_role;
GRANT ALL ON public.announcement_reads TO service_role;

-- service_role 全許可ポリシー（§4 Rule1・冪等）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'announcements'
      AND policyname = 'service_role full access'
  ) THEN
    CREATE POLICY "service_role full access" ON public.announcements
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'announcement_reads'
      AND policyname = 'service_role full access'
  ) THEN
    CREATE POLICY "service_role full access" ON public.announcement_reads
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.announcements IS '運営お知らせ。セグメント配信（target_all/faculties/grades/genders）。is_deleted=true で論理削除。';
COMMENT ON TABLE public.announcement_reads IS 'お知らせ既読管理。announcement_id ON DELETE CASCADE。user退会はFKなし（profiles ソフトデリートのため）。';
