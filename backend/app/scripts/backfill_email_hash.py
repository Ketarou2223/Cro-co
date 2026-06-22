"""ワンショット バックフィル: 既存 identity_block_hashes 行に email_hash を埋める

実行方法（backend/ ディレクトリで仮想環境を有効化してから実行）:
    cd backend
    .venv\\Scripts\\Activate.ps1
    python -m app.scripts.backfill_email_hash

冪等: email_hash が既に入っている行は UPDATE しても同値。再実行しても安全。

対象:
  - identity_block_hashes の全行
  - source_user_id → profiles.email を取得してハッシュ化
  - source_user_id が NULL の行はスキップ（存在しないはずだが念のため）

本番適用手順（1セットで連続実施すること）:
  1. backend を Render にデプロイ（identity_block.py の email_hash 対応込み）
  2. prod Supabase に migration 057 を適用
  3. 本スクリプトを prod の PRIVACY_HASH_SALT で実行

確認クエリ（Supabase SQL Editor で実行）:
  SELECT
    COUNT(*) total,
    COUNT(email_hash) with_email_hash,
    COUNT(*) - COUNT(email_hash) missing_email_hash
  FROM identity_block_hashes;
"""
import logging
import sys

from app.core.hash_utils import compute_hash, normalize_email
from app.core.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def run() -> None:
    logger.info("=== email_hash バックフィル開始 ===")

    try:
        ibh_res = (
            supabase.table("identity_block_hashes")
            .select("id, source_user_id, email_hash")
            .execute()
        )
    except Exception as e:
        logger.error("identity_block_hashes 取得失敗: %s", e)
        sys.exit(1)

    rows = ibh_res.data or []
    logger.info("identity_block_hashes 総数: %d件", len(rows))

    updated = 0
    skipped_no_uid = 0
    skipped_no_email = 0
    failed = 0

    for row in rows:
        ibh_id = row["id"]
        source_uid = row.get("source_user_id")

        if not source_uid:
            logger.warning("source_user_id が NULL のためスキップ id=%s", ibh_id)
            skipped_no_uid += 1
            continue

        try:
            profile_res = (
                supabase.table("profiles")
                .select("email")
                .eq("id", source_uid)
                .single()
                .execute()
            )
            email = (profile_res.data or {}).get("email")
        except Exception as e:
            logger.warning("profiles 取得失敗 source_user_id=%s: %s", source_uid, e)
            skipped_no_email += 1
            continue

        if not email:
            logger.warning("email が NULL のためスキップ source_user_id=%s", source_uid)
            skipped_no_email += 1
            continue

        email_hash = compute_hash(normalize_email(email))
        if not email_hash:
            logger.warning("email_hash 生成失敗（SALT未設定？）source_user_id=%s", source_uid)
            skipped_no_email += 1
            continue

        try:
            supabase.table("identity_block_hashes").update({
                "email_hash": email_hash,
            }).eq("id", ibh_id).execute()
            updated += 1
            logger.info("updated id=%s source_user_id=%s", ibh_id, source_uid)
        except Exception as e:
            logger.error("UPDATE 失敗 id=%s: %s", ibh_id, e)
            failed += 1

    logger.info(
        "=== バックフィル完了: updated=%d skipped_no_uid=%d skipped_no_email=%d failed=%d ===",
        updated, skipped_no_uid, skipped_no_email, failed,
    )

    print("\n--- 確認クエリ（Supabase SQL Editor で実行） ---")
    print("""SELECT
  COUNT(*) total,
  COUNT(email_hash) with_email_hash,
  COUNT(*) - COUNT(email_hash) missing_email_hash
FROM identity_block_hashes;""")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    run()
