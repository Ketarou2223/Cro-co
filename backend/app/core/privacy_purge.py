"""個人情報自動削除タスク

承認後5日経過したユーザーの本人確認情報を削除し、
再登録検出用のハッシュだけ残す。

Supabase pg_cron は SQL レベル更新には適しているが、
Storage の物理ファイル削除には HTTP 呼び出しが必要なため
APScheduler で統一的に管理する。
"""
# 解説: このファイルは「個人情報の自動削除バッチ処理」を定義する。
# 解説: プライバシー保護のため、審査完了後に不要になった本人確認情報（氏名・学籍番号・生年月日・学生証画像）を
#       一定期間後に自動削除する。再登録防止のためのハッシュ値は1年間だけ残す。
# 解説: 呼ばれる場所: main.py の APScheduler（定期実行スケジューラー）が定期的に run_purge_batch を呼ぶ
# 解説: 呼ぶ先: Supabase の profiles テーブル（UPDATE）+ student-ids Storage（物理ファイル削除）
# 解説: データの流れ:
#   APScheduler → run_purge_batch → 削除対象ユーザーを取得 → purge_user_pii（1件ずつ処理）→ DB更新 + Storage削除
#
# 解説: 使用ライブラリ:
#   hashlib  = SHA-256 などのハッシュ関数ライブラリ（氏名・学籍番号をハッシュ化して再登録検出に使う）
#   timedelta = 日付の差分計算（「5日前」「31日前」などを計算するため）

# 解説: SHA-256 などのハッシュ関数ライブラリ（compute_hash 経由で使用）
import logging
# 解説: date = 日付のみの型 / datetime = 日時の型 / timedelta = 時間の差分 / timezone = タイムゾーン
from datetime import date, datetime, timedelta, timezone

from app.core.hash_utils import compute_hash
from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)

# 解説: 承認後、本人確認情報を削除するまでの保持期間（日数）。PP v2.1 第4条(2): 5日以内
APPROVED_RETENTION_DAYS = 5
# 解説: 却下後、本人確認情報を削除するまでの保持期間（日数）。PP v2.1 第4条(2): 31日以内
REJECTED_RETENTION_DAYS = 31


# 解説: 生年月日（文字列）から現在の年齢を計算するヘルパ関数
def _calc_age(birth_date_str: str | None) -> int | None:
    # 解説: 生年月日が未設定なら None を返す
    if not birth_date_str:
        return None
    try:
        # 解説: "YYYY-MM-DD" 形式の文字列を date オブジェクトに変換
        bd = date.fromisoformat(birth_date_str)
        # 解説: 今日の日付を取得
        today = date.today()
        # 解説: 年の差を計算し、誕生日がまだ来ていない場合は1引く（正確な年齢計算）
        return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    except Exception:
        return None


# 解説: 単一ユーザーの本人確認情報を削除する関数。成功すれば True、失敗すれば False を返す
def purge_user_pii(user_id: str, profile: dict) -> bool:
    """単一ユーザーの本人確認情報を削除する。"""
    # ハッシュは identity_block_hashes テーブルが SSoT。
    # 承認時に upsert_on_approve で書き込み済みが通常経路だが、
    # migration 051 より前に承認されたユーザーの移行補完としてここでも upsert する。
    from app.core.identity_block import upsert_on_approve as _ib_upsert
    _ib_upsert(user_id, email=profile.get("email"))

    # 解説: 生年月日から年齢を計算して保存する（生年月日は削除するが年齢だけ残す）
    age = _calc_age(profile.get("birth_date"))

    # 解説: Storage に保存されている学生証画像のパスを取得
    student_id_path = profile.get("student_id_image_path")
    # 解説: 画像パスが存在する場合のみ Storage から物理ファイルを削除する
    if student_id_path:
        try:
            # 解説: .remove([path]) = Storage からファイルを削除する。リストで複数指定可能
            supabase.storage.from_("student-ids").remove([student_id_path])
            logger.info("学生証画像を削除: user=%s path=%s", user_id, student_id_path)
        except Exception as e:
            # ファイル削除失敗してもDB更新は続行（手動削除で対応可能）
            logger.error("学生証画像の削除に失敗: user=%s err=%s", user_id, e)

    # 解説: 現在の UTC 時刻（ISO 形式）を "削除実行日時" として記録する
    now = datetime.now(timezone.utc).isoformat()
    try:
        # 解説: profiles テーブルの本人確認情報を None に更新し、年齢だけ保持する
        # real_name・student_number は migration 059 で DROP（Phase C-1 以降は更新対象外）
        supabase.table("profiles").update({
            # birth_date は保持（生年月日は審査完了後も保持方針 2026-06-22 確定）
            "student_id_image_path": None,
            # 解説: age は削除せず保持する（年齢だけは表示に使うため）
            "age": age,
            # 解説: privacy_purged_at = 削除実行日時（次回バッチで二重処理しないためのフラグ）
            "privacy_purged_at": now,
        }).eq("id", user_id).execute()
        logger.info("個人情報削除完了: user=%s", user_id)
        return True
    except Exception as e:
        logger.error("個人情報削除に失敗: user=%s err=%s", user_id, e)
        return False


# 解説: バッチ処理のメイン関数。APScheduler から定期的に呼ばれる
def run_purge_batch() -> dict:
    """削除対象を抽出して順次処理するバッチ本体。"""
    logger.info("=== 個人情報削除バッチ開始 ===")
    # 解説: 基準時刻を取得し、各種カットオフ（削除対象の期限）を計算する
    now = datetime.now(timezone.utc)
    approved_cutoff = (now - timedelta(days=APPROVED_RETENTION_DAYS)).isoformat()
    rejected_cutoff = (now - timedelta(days=REJECTED_RETENTION_DAYS)).isoformat()

    # 解説: 処理結果のカウンター初期化
    purged_approved = 0
    purged_rejected = 0
    failed = 0

    # 解説: 承認済み（reviewed_at あり）かつ5日以上経過した未削除ユーザーを処理する
    try:
        approved_res = (
            supabase.table("profiles")
            .select("id, email, birth_date, student_id_image_path")
            .eq("status", "approved")
            # 解説: .lte = less than or equal（以下）。approved_cutoff = 5日前の日時
            .lte("reviewed_at", approved_cutoff)
            # 解説: privacy_purged_at が NULL = まだ個人情報が削除されていない行のみ対象
            .is_("privacy_purged_at", "null")
            .execute()
        )
        # 解説: 対象ユーザー1件ずつ purge_user_pii を呼ぶ
        for row in (approved_res.data or []):
            if purge_user_pii(row["id"], row):
                purged_approved += 1
            else:
                failed += 1
    except Exception as e:
        logger.error("承認済みユーザーの抽出に失敗: %s", e)

    # reviewed_at が NULL のユーザーは submitted_at を代替起点として使用
    # （管理画面外から直接 status=approved にした場合などに発生しうる）
    # 解説: reviewed_at が NULL の場合は submitted_at（申請日時）で代替判定する
    try:
        approved_null_res = (
            supabase.table("profiles")
            .select("id, email, birth_date, student_id_image_path")
            .eq("status", "approved")
            .is_("reviewed_at", "null")
            # 解説: 学生証画像パスが NULL でない行（画像がある = 本人確認情報がある）のみ対象
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

    # 解説: 却下済みかつ31日以上経過した未削除ユーザーを処理する
    try:
        rejected_res = (
            supabase.table("profiles")
            .select("id, email, birth_date, student_id_image_path")
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

    # identity_block_hashes の失効行（is_permanent=false かつ retain_until < now）を物理削除
    # ハッシュの保持判定は identity_block_hashes.retain_until/is_permanent に一本化済み
    from app.core.identity_block import purge_expired_blocks as _purge_blocks
    block_result = _purge_blocks()
    purged_hashes = block_result["deleted"]
    failed += block_result["failed"]

    # 解説: バッチ処理の結果を辞書にまとめて返す（ログと API レスポンスに使う）
    result = {
        "purged_approved": purged_approved,
        "purged_rejected": purged_rejected,
        "purged_hashes": purged_hashes,
        "failed": failed,
        "ran_at": now.isoformat(),
    }
    logger.info("=== 個人情報削除バッチ完了: %s ===", result)
    return result
