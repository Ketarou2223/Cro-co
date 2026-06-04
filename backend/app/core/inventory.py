"""消費型アイテム在庫の操作ヘルパ（user_inventory テーブル）

- like_stock: 男性のいいね送信在庫。初期10・ログイン報酬+2・安全弁10000
- アトミック UPDATE で同日多重付与・在庫マイナスを防ぐ
- INSERT 失敗時の補償は呼び出し側で refund_like_stock を使う
"""
import logging
from datetime import datetime, timedelta, timezone

from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)

LIKE_STOCK = "like_stock"
INITIAL_LIKE_STOCK = 10
DAILY_GRANT = 2
STOCK_CAP = 10000


def _today_jst_iso() -> str:
    return datetime.now(timezone(timedelta(hours=9))).date().isoformat()


def ensure_like_stock(user_id: str) -> int:
    """行が無ければ初期10で投入。前回付与日が今日より前なら +2（10000 で頭打ち）。
    結果として現在の quantity を返す。
    """
    today = _today_jst_iso()

    # lazy-init: 行が無いユーザーに 10 を付与
    try:
        supabase.table("user_inventory").insert({
            "user_id": user_id,
            "item_type": LIKE_STOCK,
            "quantity": INITIAL_LIKE_STOCK,
            "last_grant_date": today,
        }).execute()
    except Exception:
        # 既存行があれば PK 衝突で失敗する。これは正常系。
        pass

    try:
        res = (
            supabase.table("user_inventory")
            .select("quantity, last_grant_date")
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .single()
            .execute()
        )
        row = res.data or {}
        last = row.get("last_grant_date")
        qty = int(row.get("quantity") or 0)
        if last == today:
            return qty

        # lazy +2: 同日多重を防ぐため WHERE に last_grant_date を含める
        new_qty = min(qty + DAILY_GRANT, STOCK_CAP)
        upd_q = (
            supabase.table("user_inventory")
            .update({"quantity": new_qty, "last_grant_date": today})
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
        )
        if last is None:
            upd_q = upd_q.is_("last_grant_date", "null")
        else:
            upd_q = upd_q.eq("last_grant_date", last)
        upd_res = upd_q.execute()
        return new_qty if upd_res.data else qty
    except Exception:
        return 0


def get_like_stock(user_id: str) -> int:
    """ensure 込みで現在庫を返す。"""
    return ensure_like_stock(user_id)


def consume_like_stock(user_id: str) -> bool:
    """在庫を1消費。成功した（行が更新された）ら True。
    quantity を WHERE に含めるアトミック減算で在庫切れと競合を防ぐ。
    """
    try:
        res = (
            supabase.table("user_inventory")
            .select("quantity")
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .single()
            .execute()
        )
        current = int((res.data or {}).get("quantity") or 0)
        if current <= 0:
            return False
        upd = (
            supabase.table("user_inventory")
            .update({"quantity": current - 1})
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .eq("quantity", current)
            .execute()
        )
        return bool(upd.data)
    except Exception:
        return False


def refund_like_stock(user_id: str) -> None:
    """補償用: 消費後の処理が失敗した時に1戻す。10000 を超えない。"""
    try:
        res = (
            supabase.table("user_inventory")
            .select("quantity")
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .single()
            .execute()
        )
        current = int((res.data or {}).get("quantity") or 0)
        new_qty = min(current + 1, STOCK_CAP)
        supabase.table("user_inventory").update({"quantity": new_qty}).eq(
            "user_id", user_id
        ).eq("item_type", LIKE_STOCK).execute()
    except Exception:
        logger.warning("like stock refund failed user=%s", user_id, exc_info=True)
