-- migration 057: identity_block_hashes に email_hash 列追加
-- Phase A 以降の再登録ブロック照合キーは email_hash のみ（get_block_info の .eq("email_hash")）。
--
-- email_hash の付与タイミング（遅延付与・retroactive backfill は実施しない・設計上不要）:
--   BAN 時     : set_permanent_on_ban   が email_hash を付与
--   退会時     : set_retain_until_on_delete が email_hash を付与
--   承認時     : upsert_on_approve      が email_hash を付与
-- 既存 approved 行は email_hash=NULL のことがあるが、照合対象は block 行のみのため問題なし。
--
-- 不変条件（Phase A 以降・コードで担保）:
--   block 行（is_permanent=true もしくは retain_until IS NOT NULL）は必ず email_hash を持つ。
--   prod 実測 2026-06-22: IBH 8行すべて email_hash NULL・permanent=0・退会ブロック=0（現時点で穴ゼロ）。
--
-- 部分一意インデックス（WHERE email_hash IS NOT NULL）:
--   email_hash=NULL の既存行（承認済み）との混在を許容しつつ、
--   email_hash が設定された行の重複を防ぐ。
--
-- Phase B 以降で student_number_hash / real_name_hash を DROP する予定（Phase C）。
--
-- 適用状況:
--   dev  適用済み 2026-06-22
--   prod 適用済み 2026-06-22（schema inspection で ibh.email_hash 存在を確認）

ALTER TABLE public.identity_block_hashes
  ADD COLUMN IF NOT EXISTS email_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ibh_email_hash
  ON public.identity_block_hashes(email_hash)
  WHERE email_hash IS NOT NULL;

COMMENT ON COLUMN public.identity_block_hashes.email_hash IS
  'メールアドレスの PRIVACY_HASH_SALT 付き SHA-256。照合キー（Phase A 以降）。normalize_email(strip+lower) 後にハッシュ化。';
