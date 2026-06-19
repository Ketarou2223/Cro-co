-- migration 051: 再登録ブロック用ハッシュ永続保持テーブル
-- auth.users への CASCADE FK を張らない（退会で消えないようにするため）
-- student_number_hash を一意キーとして照合する

-- テーブル作成（冪等）
CREATE TABLE IF NOT EXISTS public.identity_block_hashes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number_hash text        NOT NULL,
  real_name_hash      text,
  retain_until        timestamptz,            -- NULL=在籍中(無期限保持) / 値=その日時で失効
  is_permanent        boolean     NOT NULL DEFAULT false,
  reason              text,
  source_user_id      uuid,                   -- 参照用のみ（FK なし・退会で消さない）
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 一意インデックス（照合キー）
CREATE UNIQUE INDEX IF NOT EXISTS uq_ibh_student_number_hash
  ON public.identity_block_hashes(student_number_hash);

-- source_user_id による検索用インデックス（ban/delete ハンドラから使用）
CREATE INDEX IF NOT EXISTS idx_ibh_source_user_id
  ON public.identity_block_hashes(source_user_id)
  WHERE source_user_id IS NOT NULL;

-- 失効 purge 用インデックス（定期バッチで retain_until < now() を削除）
CREATE INDEX IF NOT EXISTS idx_ibh_retain_until
  ON public.identity_block_hashes(retain_until)
  WHERE retain_until IS NOT NULL AND is_permanent = false;

-- RLS 有効化 + service_role 全許可（§4 Rule1/4 準拠）
ALTER TABLE public.identity_block_hashes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.identity_block_hashes TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'identity_block_hashes'
      AND policyname = 'service_role full access'
  ) THEN
    CREATE POLICY "service_role full access"
      ON public.identity_block_hashes
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- バックフィルは PRIVACY_HASH_SALT（.env）が必要なためアプリ層で実施する。
-- 実行方法: cd backend && .venv\Scripts\Activate.ps1 && python -m app.scripts.backfill_identity_blocks
-- 適用手順: prod へ本 migration 適用 → backend デプロイ → Python バックフィル実行（この順を1セットで）

COMMENT ON TABLE public.identity_block_hashes IS '再登録ブロック用ハッシュ永続保持テーブル。auth.users CASCADE の影響を受けないよう FK を張らない。';
COMMENT ON COLUMN public.identity_block_hashes.retain_until IS 'NULL=在籍中(無期限ブロック) / 値あり=期限切れで物理削除対象';
COMMENT ON COLUMN public.identity_block_hashes.is_permanent IS 'BAN/規約違反者=true: purge 対象外・永久保持';
COMMENT ON COLUMN public.identity_block_hashes.source_user_id IS '元ユーザーの profiles.id 参照用。FK なし（退会で消えないため）';
