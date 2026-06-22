"""再登録ブロック用ハッシュ退避テーブル操作ユーティリティ

identity_block_hashes テーブルへの読み書きを一本化する。
呼び出し元:
  admin.py   : approve_user（upsert_on_approve）/ ban_user（set_permanent_on_ban）
  profile.py : upload_student_id（get_block_info）/ delete_my_account（set_retain_until_on_delete）
  privacy_purge.py : purge_user_pii（upsert_on_approve）/ purge_expired_blocks（定期バッチ）
"""
import logging
from datetime import datetime, timedelta, timezone

from app.core.hash_utils import compute_hash, normalize_email
from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)

# 退会後の再登録ブロック期間（30日）
WITHDRAWAL_BLOCK_DAYS = 30


def upsert_on_approve(
    source_user_id: str,
    real_name: str | None,
    student_number: str | None,
    email: str | None = None,
) -> None:
    """承認時（または purge 時の移行補完）: ハッシュを退避テーブルへ upsert。

    retain_until=NULL（在籍中=無期限保持）で登録。
    既存行がある場合は is_permanent を上書きせず source_user_id/real_name_hash/email_hash のみ更新する。
    """
    sn_hash = compute_hash(student_number)
    rn_hash = compute_hash(real_name)
    email_hash = compute_hash(normalize_email(email))
    if not sn_hash:
        logger.warning("upsert_on_approve: student_number_hash 生成不可 user=%s", source_user_id)
        return

    now = datetime.now(timezone.utc).isoformat()
    try:
        existing_res = (
            supabase.table("identity_block_hashes")
            .select("id, is_permanent")
            .eq("student_number_hash", sn_hash)
            .execute()
        )
        existing = existing_res.data[0] if existing_res.data else None
    except Exception as e:
        logger.error("identity_block_hashes 取得失敗 user=%s: %s", source_user_id, e)
        return

    try:
        if existing:
            # is_permanent は上書きしない（BAN 済み行を誤って降格させない）
            supabase.table("identity_block_hashes").update({
                "source_user_id": source_user_id,
                "real_name_hash": rn_hash,
                "email_hash": email_hash,
                "retain_until": None,
                "updated_at": now,
            }).eq("student_number_hash", sn_hash).execute()
        else:
            supabase.table("identity_block_hashes").insert({
                "student_number_hash": sn_hash,
                "real_name_hash": rn_hash,
                "email_hash": email_hash,
                "retain_until": None,
                "is_permanent": False,
                "source_user_id": source_user_id,
                "updated_at": now,
            }).execute()
    except Exception as e:
        logger.error("identity_block_hashes upsert失敗 user=%s: %s", source_user_id, e)


def set_permanent_on_ban(
    source_user_id: str,
    reason: str | None = None,
    profile_data: dict | None = None,
) -> None:
    """BAN 時: student_number_hash で upsert し is_permanent=True をセット。

    ON CONFLICT (student_number_hash) DO UPDATE で既存行も新規行も一本化して処理する。
    unban 時にこの関数を呼ばないこと（is_permanent は一度 true にしたら落とさない）。
    """
    pd = profile_data or {}
    sn = pd.get("student_number")
    rn = pd.get("real_name")
    email = pd.get("email")
    sn_hash = compute_hash(sn) if sn else None
    rn_hash = compute_hash(rn) if rn else None
    email_hash = compute_hash(normalize_email(email)) if email else None

    # 平文がない場合（purge済み）: ibh の既存行から source_user_id でハッシュを流用する
    # profiles.student_number_hash は migration 056 で DROP 済みのため参照しない
    if not sn_hash:
        try:
            ibh_res = (
                supabase.table("identity_block_hashes")
                .select("student_number_hash, real_name_hash, email_hash")
                .eq("source_user_id", source_user_id)
                .execute()
            )
            ibh_row = ibh_res.data[0] if ibh_res.data else None
            if ibh_row:
                sn_hash = ibh_row.get("student_number_hash")
                if not rn_hash:
                    rn_hash = ibh_row.get("real_name_hash")
                if not email_hash:
                    email_hash = ibh_row.get("email_hash")
        except Exception as e:
            logger.warning("identity_block_hashes 既存ハッシュ取得失敗 user=%s: %s", source_user_id, e)

    if not sn_hash:
        logger.warning("identity_block_hashes: BAN 時ハッシュ生成不可 user=%s", source_user_id)
        return

    now = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("identity_block_hashes").upsert({
            "student_number_hash": sn_hash,
            "real_name_hash": rn_hash,
            "email_hash": email_hash,
            "retain_until": None,
            "is_permanent": True,
            "reason": reason,
            "source_user_id": source_user_id,
            "updated_at": now,
        }, on_conflict="student_number_hash").execute()
    except Exception as e:
        logger.error("identity_block_hashes BAN upsert 失敗 user=%s: %s", source_user_id, e)


def set_retain_until_on_delete(
    source_user_id: str,
    student_number_hash: str | None = None,
    real_name_hash: str | None = None,
    email_hash: str | None = None,
) -> None:
    """退会時: retain_until=now+30日 をセット。auth.users 削除より前に呼ぶこと。

    is_permanent=True の行は変更しない（永久保持を維持する）。
    行がない場合（未承認退会等）: email_hash があれば INSERT する（migration 058 で student_number_hash NULL 可）。
    失敗時は例外を投げる（呼び出し元が fail-close で 500 を返す）。
    """
    now = datetime.now(timezone.utc)
    retain_until = (now + timedelta(days=WITHDRAWAL_BLOCK_DAYS)).isoformat()

    # 1) source_user_id で既存行を探す
    try:
        existing_res = (
            supabase.table("identity_block_hashes")
            .select("id, is_permanent")
            .eq("source_user_id", source_user_id)
            .execute()
        )
        existing = existing_res.data[0] if existing_res.data else None
    except Exception as e:
        logger.error("identity_block_hashes 退会取得失敗 user=%s: %s", source_user_id, e)
        raise

    if existing:
        if existing.get("is_permanent"):
            return
        try:
            update_data: dict = {
                "retain_until": retain_until,
                "updated_at": now.isoformat(),
            }
            if email_hash:
                update_data["email_hash"] = email_hash
            supabase.table("identity_block_hashes").update(update_data).eq("id", existing["id"]).execute()
        except Exception as e:
            logger.error("identity_block_hashes retain_until 設定失敗 user=%s: %s", source_user_id, e)
            raise
        return

    # 2) email_hash で既存行を探す（別 source_user_id の旧行がある場合）
    if email_hash:
        try:
            email_res = (
                supabase.table("identity_block_hashes")
                .select("id, is_permanent")
                .eq("email_hash", email_hash)
                .execute()
            )
            email_existing = email_res.data[0] if email_res.data else None
        except Exception as e:
            logger.error("identity_block_hashes email_hash 検索失敗 user=%s: %s", source_user_id, e)
            raise

        if email_existing:
            if email_existing.get("is_permanent"):
                return
            try:
                supabase.table("identity_block_hashes").update({
                    "retain_until": retain_until,
                    "source_user_id": source_user_id,
                    "updated_at": now.isoformat(),
                }).eq("id", email_existing["id"]).execute()
            except Exception as e:
                logger.error("identity_block_hashes email_hash 更新失敗 user=%s: %s", source_user_id, e)
                raise
            return

    # 3) 行がない: email_hash または student_number_hash があれば INSERT
    # migration 058 で student_number_hash は NULL 可になったため email_hash のみでも INSERT できる
    if not email_hash and not student_number_hash:
        logger.warning("identity_block_hashes: 退会時ハッシュ無し(記録スキップ) user=%s", source_user_id)
        return

    try:
        supabase.table("identity_block_hashes").insert({
            "student_number_hash": student_number_hash,
            "real_name_hash": real_name_hash,
            "email_hash": email_hash,
            "retain_until": retain_until,
            "is_permanent": False,
            "source_user_id": source_user_id,
        }).execute()
    except Exception as e:
        logger.error("identity_block_hashes 退会 INSERT 失敗 user=%s: %s", source_user_id, e)
        raise


def is_blocked(email_hash: str, exclude_user_id: str | None = None) -> bool:
    """再登録ブロック照合。ブロック対象なら True。

    照合キー: email_hash（Phase A 以降。学籍ハッシュ照合は廃止）。
    exclude_user_id を渡すと source_user_id が一致する行を照合対象から除外する（自己除外）。
    照合に失敗した場合は fail-close で True を返す（§4 チェックリスト B）。
    """
    try:
        q = (
            supabase.table("identity_block_hashes")
            .select("id, is_permanent, retain_until")
            .eq("email_hash", email_hash)
        )
        if exclude_user_id:
            # 自分の既存ブロック行で自分が弾かれないよう自己除外する
            q = q.neq("source_user_id", exclude_user_id)
        res = q.execute()
        rows = res.data or []
        if not rows:
            return False
        row = rows[0]
        if row["is_permanent"]:
            return True
        if row["retain_until"] is None:
            # retain_until=NULL = 在籍中 = ブロック
            return True
        # retain_until が未来ならブロック中
        retain = datetime.fromisoformat(row["retain_until"])
        if retain.tzinfo is None:
            retain = retain.replace(tzinfo=timezone.utc)
        return retain > datetime.now(timezone.utc)
    except Exception as e:
        # fail-close: 照合失敗は通さず拒否
        logger.error("identity_block_hashes 照合失敗（fail-close で拒否）: %s", e)
        return True


def get_block_info(email_hash: str, exclude_user_id: str | None = None) -> dict | None:
    """再登録ブロック詳細照合。ブロックなし=None、ブロックあり=種別付き dict。

    戻り値:
        None                                  : ブロックなし（登録可）
        {"type": "ban"}                       : BAN による永久ブロック（is_permanent=True）
        {"type": "active"}                    : 在籍中（retain_until=NULL・is_permanent=False）
        {"type": "withdrawal", "retain_until": "<ISO>"}
                                              : 退会ブロック（期限付き・期限内）

    BAN と in-active の出し分けにより、呼び出し元が文面を切り替えられる。
    照合例外は fail-close で {"type": "ban"} を返す（拒否側に倒す）。
    """
    try:
        q = (
            supabase.table("identity_block_hashes")
            .select("id, is_permanent, retain_until")
            .eq("email_hash", email_hash)
        )
        if exclude_user_id:
            q = q.neq("source_user_id", exclude_user_id)
        res = q.execute()
        rows = res.data or []
        if not rows:
            return None
        row = rows[0]
        if row["is_permanent"]:
            return {"type": "ban"}
        if row["retain_until"] is None:
            return {"type": "active"}
        retain = datetime.fromisoformat(row["retain_until"])
        if retain.tzinfo is None:
            retain = retain.replace(tzinfo=timezone.utc)
        if retain > datetime.now(timezone.utc):
            return {"type": "withdrawal", "retain_until": row["retain_until"]}
        return None  # 期限切れ（登録可）
    except Exception as e:
        logger.error("identity_block_hashes 照合失敗（fail-close で拒否）: %s", e)
        return {"type": "ban"}


def purge_expired_blocks() -> dict:
    """期限切れ行（is_permanent=false かつ retain_until < now）を物理削除する。

    APScheduler の privacy_purge ジョブから呼ばれる（毎日 03:00 JST）。
    """
    now = datetime.now(timezone.utc).isoformat()
    deleted = 0
    failed = 0
    try:
        res = (
            supabase.table("identity_block_hashes")
            .delete()
            .eq("is_permanent", False)
            .not_.is_("retain_until", "null")
            .lt("retain_until", now)
            .execute()
        )
        deleted = len(res.data or [])
        if deleted:
            logger.info("identity_block_hashes 期限切れ行削除: %d件", deleted)
    except Exception as e:
        logger.error("identity_block_hashes purge 失敗: %s", e)
        failed += 1
    return {"deleted": deleted, "failed": failed}
