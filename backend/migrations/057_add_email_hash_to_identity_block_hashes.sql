-- migration 057: identity_block_hashes に email_hash 列追加
-- 再登録ブロックの照合キーを student_number_hash → email_hash に移管するための準備。
-- Phase A: is_blocked() が email_hash で照合する。学籍ハッシュは二重保持で残す。
-- Phase B 以降で student_number_hash / real_name_hash を DROP する予定（Phase C）。
--
-- 部分一意インデックス（WHERE email_hash IS NOT NULL）:
--   移行期に email_hash が NULL の旧行との混在を許容しつつ、
--   email_hash が設定された行の重複を防ぐ。
--
-- 適用状況:
--   dev  適用済み 2026-06-22
--   prod ⚠️ 未適用 — backend デプロイ後にオーナーが手動適用 → バックフィルスクリプト実行

ALTER TABLE public.identity_block_hashes
  ADD COLUMN IF NOT EXISTS email_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ibh_email_hash
  ON public.identity_block_hashes(email_hash)
  WHERE email_hash IS NOT NULL;

COMMENT ON COLUMN public.identity_block_hashes.email_hash IS
  'メールアドレスの PRIVACY_HASH_SALT 付き SHA-256。照合キー（Phase A 以降）。normalize_email(strip+lower) 後にハッシュ化。';
