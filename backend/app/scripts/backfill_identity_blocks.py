"""ワンショット バックフィル: 既存 approved/banned プロフィールを identity_block_hashes に退避する

実行方法（backend/ ディレクトリで仮想環境を有効化してから実行）:
    cd backend
    .venv\\Scripts\\Activate.ps1
    python -m app.scripts.backfill_identity_blocks

冪等: ON CONFLICT (student_number_hash) DO UPDATE のため再実行しても安全。

対象:
  - status IN ('approved', 'banned') の profiles 全件
  - 平文 student_number があれば compute_hash で計算
  - 平文が無ければスキップ（バックフィル完了後は ibh に全件存在するため問題なし）

本番適用手順（1セットで連続実施すること）:
  1. prod Supabase に migration 051 を適用
  2. backend を Render にデプロイ
  3. 本スクリプトを prod の PRIVACY_HASH_SALT を使って実行

確認クエリ（Supabase SQL Editor で実行）:
  SELECT p.status, count(*) profiles,
    count(*) FILTER (WHERE EXISTS(
      SELECT 1 FROM identity_block_hashes i WHERE i.source_user_id=p.id
    )) in_block,
    count(*) FILTER (WHERE EXISTS(
      SELECT 1 FROM identity_block_hashes i
      WHERE i.source_user_id=p.id AND i.is_permanent
    )) in_block_permanent
  FROM profiles p GROUP BY p.status ORDER BY p.status;

期待値（dev 実データ 2026-06-19 時点）:
  approved: in_block=29 / permanent=0
  banned:   in_block=4  / permanent=4
"""
import logging
import sys
from datetime import datetime, timezone

from app.core.hash_utils import compute_hash
from app.core.supabase_client import supabase

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def run() -> None:
    logger.info("=== identity_block_hashes バックフィル開始 ===")

    try:
        res = (
            supabase.table("profiles")
            .select("id, status, student_number, real_name, ban_reason")
            .in_("status", ["approved", "banned"])
            .execute()
        )
    except Exception as e:
        logger.error("profiles 取得失敗: %s", e)
        sys.exit(1)

    rows = res.data or []
    logger.info("対象プロフィール: %d件", len(rows))

    upserted = 0
    skipped = 0
    failed = 0
    now = datetime.now(timezone.utc).isoformat()

    for row in rows:
        uid = row["id"]
        status = row["status"]

        # sn_hash: 平文から計算（profiles.student_number_hash は migration 056 で DROP 済み）
        sn = row.get("student_number")
        rn = row.get("real_name")
        sn_hash = compute_hash(sn) if sn else None
        rn_hash = compute_hash(rn) if rn else None

        if not sn_hash:
            logger.warning("スキップ（ハッシュ生成不可）user=%s status=%s", uid, status)
            skipped += 1
            continue

        is_permanent = status == "banned"
        reason = row.get("ban_reason") if is_permanent else None

        try:
            supabase.table("identity_block_hashes").upsert({
                "student_number_hash": sn_hash,
                "real_name_hash": rn_hash,
                "retain_until": None,
                "is_permanent": is_permanent,
                "reason": reason,
                "source_user_id": uid,
                "updated_at": now,
            }, on_conflict="student_number_hash").execute()
            upserted += 1
            logger.info("upserted user=%s status=%s is_permanent=%s", uid, status, is_permanent)
        except Exception as e:
            logger.error("upsert 失敗 user=%s: %s", uid, e)
            failed += 1

    logger.info(
        "=== バックフィル完了: upserted=%d skipped=%d failed=%d ===",
        upserted, skipped, failed,
    )

    print("\n--- 確認クエリ（Supabase SQL Editor で実行） ---")
    print("""SELECT p.status, count(*) profiles,
  count(*) FILTER (WHERE EXISTS(SELECT 1 FROM identity_block_hashes i WHERE i.source_user_id=p.id)) in_block,
  count(*) FILTER (WHERE EXISTS(SELECT 1 FROM identity_block_hashes i WHERE i.source_user_id=p.id AND i.is_permanent)) in_block_permanent
FROM profiles p GROUP BY p.status ORDER BY p.status;""")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    run()
