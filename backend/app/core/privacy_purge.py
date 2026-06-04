"""個人情報自動削除タスク

承認後3日経過したユーザーの本人確認情報を削除し、
再登録検出用のハッシュだけ残す。

Supabase pg_cron は SQL レベル更新には適しているが、
Storage の物理ファイル削除には HTTP 呼び出しが必要なため
APScheduler で統一的に管理する。
"""

import hashlib
import logging
from datetime import date, datetime, timedelta, timezone

from app.core.config import settings
from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)

APPROVED_RETENTION_DAYS = 3
REJECTED_RETENTION_DAYS = 30
HASH_RETENTION_DAYS = 365
DELETED_MESSAGE_RETENTION_DAYS = 30


def _hash(value: str | None) -> str | None:
    if not value:
        return None
    if not settings.privacy_hash_salt:
        logger.error("PRIVACY_HASH_SALT が設定されていません。ハッシュ化を中止します。")
        return None
    salted = f"{settings.privacy_hash_salt}:{value}"
    return hashlib.sha256(salted.encode("utf-8")).hexdigest()


def _calc_age(birth_date_str: str | None) -> int | None:
    if not birth_date_str:
        return None
    try:
        bd = date.fromisoformat(birth_date_str)
        today = date.today()
        return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    except Exception:
        return None


def purge_user_pii(user_id: str, profile: dict) -> bool:
    """単一ユーザーの本人確認情報を削除する。"""
    real_name_hash = _hash(profile.get("real_name"))
    student_number_hash = _hash(profile.get("student_number"))
    age = _calc_age(profile.get("birth_date"))

    student_id_path = profile.get("student_id_image_path")
    if student_id_path:
        try:
            supabase.storage.from_("student-ids").remove([student_id_path])
            logger.info("学生証画像を削除: user=%s path=%s", user_id, student_id_path)
        except Exception as e:
            # ファイル削除失敗してもDB更新は続行（手動削除で対応可能）
            logger.error("学生証画像の削除に失敗: user=%s err=%s", user_id, e)

    now = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("profiles").update({
            "real_name": None,
            "student_number": None,
            "birth_date": None,
            "student_id_image_path": None,
            "age": age,
            "real_name_hash": real_name_hash,
            "student_number_hash": student_number_hash,
            "privacy_purged_at": now,
        }).eq("id", user_id).execute()
        logger.info("個人情報削除完了: user=%s", user_id)
        return True
    except Exception as e:
        logger.error("個人情報削除に失敗: user=%s err=%s", user_id, e)
        return False


def purge_deleted_user_messages() -> dict:
    """退会後30日経過したユーザーのメッセージを物理削除する（※ auth.users CASCADE で即時削除されるため常に 0件・dead code）。"""
    now = datetime.now(timezone.utc)
    deleted_cutoff = (now - timedelta(days=DELETED_MESSAGE_RETENTION_DAYS)).isoformat()

    purged_users = 0
    failed = 0

    try:
        deleted_res = (
            supabase.table("profiles")
            .select("id")
            .eq("status", "deleted")
            .not_.is_("deleted_at", "null")
            .lte("deleted_at", deleted_cutoff)
            .execute()
        )
        for row in (deleted_res.data or []):
            user_id = row["id"]
            try:
                supabase.table("messages").delete().eq("sender_id", user_id).execute()
                purged_users += 1
                logger.info("退会ユーザーのメッセージ削除完了: user=%s", user_id)
            except Exception as e:
                logger.error("メッセージ削除失敗: user=%s err=%s", user_id, e)
                failed += 1
    except Exception as e:
        logger.error("退会ユーザーの抽出に失敗: %s", e)

    return {"purged_users": purged_users, "failed": failed}


def run_purge_batch() -> dict:
    """削除対象を抽出して順次処理するバッチ本体。"""
    logger.info("=== 個人情報削除バッチ開始 ===")
    now = datetime.now(timezone.utc)
    approved_cutoff = (now - timedelta(days=APPROVED_RETENTION_DAYS)).isoformat()
    rejected_cutoff = (now - timedelta(days=REJECTED_RETENTION_DAYS)).isoformat()

    purged_approved = 0
    purged_rejected = 0
    failed = 0

    try:
        approved_res = (
            supabase.table("profiles")
            .select("id, real_name, student_number, birth_date, student_id_image_path")
            .eq("status", "approved")
            .lte("reviewed_at", approved_cutoff)
            .is_("privacy_purged_at", "null")
            .execute()
        )
        for row in (approved_res.data or []):
            if purge_user_pii(row["id"], row):
                purged_approved += 1
            else:
                failed += 1
    except Exception as e:
        logger.error("承認済みユーザーの抽出に失敗: %s", e)

    # reviewed_at が NULL のユーザーは submitted_at を代替起点として使用
    # （管理画面外から直接 status=approved にした場合などに発生しうる）
    try:
        approved_null_res = (
            supabase.table("profiles")
            .select("id, real_name, student_number, birth_date, student_id_image_path")
            .eq("status", "approved")
            .is_("reviewed_at", "null")
            .not_.is_("student_id_image_path", "null")
            .lte("submitted_at", approved_cutoff)
            .is_("privacy_purged_at", "null")
            .execute()
        )
        for row in (approved_null_res.data or []):
            if purge_user_pii(row["id"], row):
                purged_approved += 1
            else:
                failed += 1
    except Exception as e:
        logger.error("承認済み(reviewed_at=NULL)ユーザーの抽出に失敗: %s", e)

    try:
        rejected_res = (
            supabase.table("profiles")
            .select("id, real_name, student_number, birth_date, student_id_image_path")
            .eq("status", "rejected")
            .lte("reviewed_at", rejected_cutoff)
            .is_("privacy_purged_at", "null")
            .execute()
        )
        for row in (rejected_res.data or []):
            if purge_user_pii(row["id"], row):
                purged_rejected += 1
            else:
                failed += 1
    except Exception as e:
        logger.error("却下済みユーザーの抽出に失敗: %s", e)

    # 1年経過後: ハッシュ値も削除
    hash_cutoff = (now - timedelta(days=HASH_RETENTION_DAYS)).isoformat()
    purged_hashes = 0
    try:
        hash_res = (
            supabase.table("profiles")
            .select("id")
            .not_.is_("privacy_purged_at", "null")
            .lte("privacy_purged_at", hash_cutoff)
            .not_.is_("real_name_hash", "null")
            .execute()
        )
        for row in (hash_res.data or []):
            try:
                supabase.table("profiles").update({
                    "real_name_hash": None,
                    "student_number_hash": None,
                }).eq("id", row["id"]).execute()
                purged_hashes += 1
                logger.info("ハッシュ値削除完了: user=%s", row["id"])
            except Exception as e:
                logger.error("ハッシュ値削除失敗: user=%s err=%s", row["id"], e)
                failed += 1
    except Exception as e:
        logger.error("ハッシュ値削除対象の抽出に失敗: %s", e)

    # 退会後30日経過したユーザーのメッセージを物理削除
    msg_result = purge_deleted_user_messages()
    failed += msg_result["failed"]

    result = {
        "purged_approved": purged_approved,
        "purged_rejected": purged_rejected,
        "purged_hashes": purged_hashes,
        "purged_deleted_messages_users": msg_result["purged_users"],
        "failed": failed,
        "ran_at": now.isoformat(),
    }
    logger.info("=== 個人情報削除バッチ完了: %s ===", result)
    return result
