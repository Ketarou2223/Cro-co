"""【廃止済み】ワンショット バックフィル: 既存 approved/banned プロフィールを identity_block_hashes に退避する

Phase C-1（2026-06-22）で廃止。
理由: profiles.student_number および profiles.real_name を migration 059 で DROP するため、
      このスクリプトはそれらのカラムを参照しており、migration 059 適用後は実行不可になる。
      バックフィル自体は 2026-06-19 に dev/prod 両方で完了済み（再実行不要）。

再実行が必要な場合: identity_block_hashes の状態を Supabase SQL Editor で確認すること。
  SELECT source_user_id, email_hash, is_permanent FROM identity_block_hashes;
"""
import logging

logger = logging.getLogger(__name__)


def run() -> None:
    logger.warning("backfill_identity_blocks は廃止済みです（Phase C-1 2026-06-22）。実行を中断します。")


if __name__ == "__main__":
    run()
