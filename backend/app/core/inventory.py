"""消費型アイテム在庫の操作ヘルパ（user_inventory テーブル）

Regimes:
  female_unlimited : 女→男（または不明値フォールバック）: 在庫なし・送信無制限
  male_hetero      : 男→女: 初期5・充実度連動日次回復・初回ボーナス
  same_sex         : 同性志向: 初期5・回復なし・充実度70%以上で無制限解放

- アトミック UPDATE で同日多重付与・在庫マイナスを防ぐ
- INSERT 失敗時の補償は呼び出し側で refund_like_stock を使う
"""
# 解説: このファイルは「いいね在庫（like_stock）の管理」ユーティリティ。
# 解説: 「アトミック UPDATE」= DB の UPDATE 文1本で「取得と更新」を同時に行う。
#       これにより複数リクエストが同時に来ても在庫がマイナスにならない（競合状態を防ぐ）。
# 解説: 呼ばれる場所: like.py（いいね送信時に consume_like_stock を、キャンセル時に refund を呼ぶ）
# 解説: 呼ぶ先: Supabase の user_inventory テーブル

import logging
from datetime import datetime, timedelta, timezone

from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)

# 解説: user_inventory テーブルの item_type 列に入れる値（在庫の種別を識別する定数）
LIKE_STOCK = "like_stock"
# 解説: 在庫制 regime の初回付与数（旧10→5）
INITIAL_LIKE_STOCK = 5
# 解説: 在庫の上限（これを超えて増やさない安全弁）
STOCK_CAP = 10000

# --- regime 固有定数 ---
# 解説: same_sex がこのスコア以上で在庫消費なし・送り放題
SAME_SEX_UNLOCK = 70.0
# 解説: male_hetero の充実度80%以上での日次回復量
MALE_RECOVERY_AT_80 = 1
# 解説: male_hetero の充実度100%での日次回復量
MALE_RECOVERY_AT_100 = 2
# 解説: male_hetero の初回80%到達ボーナス
BONUS_AT_80 = 5
# 解説: male_hetero の初回100%到達ボーナス
BONUS_AT_100 = 10

# 旧定数。外部 import 互換のため残置（新コードでは MALE_RECOVERY_AT_* を使う）
DAILY_GRANT = 2


# 解説: 現在の日本時間（JST = UTC+9）の日付を "YYYY-MM-DD" 形式の文字列で返すヘルパ関数
def _today_jst_iso() -> str:
    return datetime.now(timezone(timedelta(hours=9))).date().isoformat()


def send_regime(gender: str | None, interest_in: str | None) -> str:
    """送る側の役割（性別でなく送る/待つで分岐）。
    不明値は送信を止めない側に倒す（interest_in は KYC で必ず設定済みのため通常到達しない）。
    """
    if gender == "female" and interest_in == "male":
        return "female_unlimited"   # 女→男: 在庫なし・完全無制限
    if gender == "male" and interest_in == "female":
        return "male_hetero"        # 男→女: 在庫制・充実度連動回復・一回性ボーナス
    if gender is not None and gender == interest_in:
        return "same_sex"           # 男→男 / 女→女: 初期5・回復なし・70%で無制限解放
    return "female_unlimited"


def ensure_like_stock(user_id: str, regime: str = "male_hetero", score: float = 0.0) -> int:
    """行が無ければ初期5で投入。前回付与日が今日より前なら回復を加算（regime・score で決まる）。
    female_unlimited は在庫対象外のため呼ばないこと（呼んでも 0 を返すだけ）。
    結果として現在の quantity を返す。
    """
    # 解説: female_unlimited は在庫行を作らない
    if regime == "female_unlimited":
        return 0

    today = _today_jst_iso()

    # lazy-init: ON CONFLICT DO NOTHING で行がなければ作成・既存行はそのまま（23505防止）
    # ignore_duplicates=True は既存行で空レスポンスを返すため、upsert戻り値は絶対に読まない。
    # 例外が出ても後続のSELECTで行を取るので握りつぶして続行する。
    try:
        supabase.table("user_inventory").upsert(
            {
                "user_id": user_id,
                "item_type": LIKE_STOCK,
                "quantity": INITIAL_LIKE_STOCK,
                "last_grant_date": today,
            },
            on_conflict="user_id,item_type",
            ignore_duplicates=True,
        ).execute()
    except Exception:
        pass  # 既存行のON CONFLICT DO NOTHINGでSDKが空レスポンスを例外扱いする場合がある

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
        # 解説: 最終付与日が今日なら追加付与不要。現在庫をそのまま返す
        if last == today:
            return qty

        # 日次回復量: regime と score で決定
        if regime == "male_hetero":
            if score >= 100.0:
                grant = MALE_RECOVERY_AT_100  # +2
            elif score >= 80.0:
                grant = MALE_RECOVERY_AT_80   # +1
            else:
                grant = 0
        else:
            # same_sex: 回復なし（70%解放で消費不要になるため回復不要）
            grant = 0

        new_qty = min(qty + grant, STOCK_CAP)
        # 解説: WHERE に last_grant_date を含めて同日多重付与を防ぐ
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


def get_like_stock(user_id: str, regime: str = "male_hetero", score: float = 0.0) -> int:
    """ensure 込みで現在庫を返す。"""
    return ensure_like_stock(user_id, regime, score)


def consume_like_stock(user_id: str) -> bool:
    """在庫を1消費。成功したら True、在庫切れ・失敗なら False。
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


def grant_pending_bonuses(user_id: str, score: float) -> None:
    """male_hetero 専用: 初回80%到達で+5、初回100%到達で+10（フラグで冪等）。
    score < 80 なら即返す。same_sex / female_unlimited では呼ばないこと。
    """
    if score < 80.0:
        return
    try:
        res = (
            supabase.table("user_inventory")
            .select("quantity, bonus_80_granted, bonus_100_granted")
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .maybe_single()  # 行なし時も例外にならず None を返す
            .execute()
        )
        if res is None or res.data is None:
            return  # 行がなければ ensure を先に呼ぶ必要がある
        row = res.data
        qty = int(row.get("quantity") or 0)
        b80 = bool(row.get("bonus_80_granted"))
        b100 = bool(row.get("bonus_100_granted"))

        bonus = 0
        update_fields: dict = {}

        if not b80:
            bonus += BONUS_AT_80
            update_fields["bonus_80_granted"] = True

        if score >= 100.0 and not b100:
            bonus += BONUS_AT_100
            update_fields["bonus_100_granted"] = True

        if not update_fields:
            return

        update_fields["quantity"] = min(qty + bonus, STOCK_CAP)
        supabase.table("user_inventory").update(update_fields).eq(
            "user_id", user_id
        ).eq("item_type", LIKE_STOCK).execute()
    except Exception:
        logger.warning("grant_pending_bonuses failed user=%s", user_id, exc_info=True)
