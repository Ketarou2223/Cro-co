"""消費型アイテム在庫の操作ヘルパ（user_inventory テーブル）

- like_stock: 男性のいいね送信在庫。初期10・ログイン報酬+2・安全弁10000
- アトミック UPDATE で同日多重付与・在庫マイナスを防ぐ
- INSERT 失敗時の補償は呼び出し側で refund_like_stock を使う
"""
# 解説: このファイルは「いいね在庫（like_stock）の管理」ユーティリティ。
# 解説: 「アトミック UPDATE」= DB の UPDATE 文1本で「取得と更新」を同時に行う。
#       これにより複数リクエストが同時に来ても在庫がマイナスにならない（競合状態を防ぐ）。
# 解説: 呼ばれる場所: like.py（いいね送信時に consume_like_stock を、キャンセル時に refund を呼ぶ）
# 解説: 呼ぶ先: Supabase の user_inventory テーブル
# 解説: データの流れ:
#   like.py → ensure_like_stock（ログイン日次付与）→ consume_like_stock（1消費）
#   いいね送信失敗 → refund_like_stock（1戻す）

import logging
# 解説: datetime = 日時を扱うモジュール。timedelta = 時間差分。timezone = タイムゾーン設定
from datetime import datetime, timedelta, timezone

from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)

# 解説: user_inventory テーブルの item_type 列に入れる値（在庫の種別を識別する定数）
LIKE_STOCK = "like_stock"
# 解説: 初回作成時に付与する在庫数
INITIAL_LIKE_STOCK = 10
# 解説: 毎日ログイン時に付与する在庫数
DAILY_GRANT = 2
# 解説: 在庫の上限（これを超えて増やさない安全弁）
STOCK_CAP = 10000


# 解説: 現在の日本時間（JST = UTC+9）の日付を "YYYY-MM-DD" 形式の文字列で返すヘルパ関数
def _today_jst_iso() -> str:
    return datetime.now(timezone(timedelta(hours=9))).date().isoformat()


# 解説: 在庫行がなければ初期付与し、日付が変わっていれば+2する。最終的な現在庫を返す
def ensure_like_stock(user_id: str) -> int:
    """行が無ければ初期10で投入。前回付与日が今日より前なら +2（10000 で頭打ち）。
    結果として現在の quantity を返す。
    """
    # 解説: 今日の JST 日付文字列（last_grant_date の比較に使う）
    today = _today_jst_iso()

    # lazy-init: 行が無いユーザーに 10 を付与
    # 解説: まず新規行の INSERT を試みる（行がなければ作成・既存なら PK 衝突で失敗して pass）
    try:
        supabase.table("user_inventory").insert({
            "user_id": user_id,
            "item_type": LIKE_STOCK,
            "quantity": INITIAL_LIKE_STOCK,
            "last_grant_date": today,
        }).execute()
    except Exception:
        # 既存行があれば PK 衝突で失敗する。これは正常系。
        # 解説: pass = 何もしない。INSERT 失敗（既存行あり）は正常なので無視する
        pass

    # 解説: 現在の在庫と最終付与日を取得する
    try:
        res = (
            supabase.table("user_inventory")
            .select("quantity, last_grant_date")
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .single()
            .execute()
        )
        # 解説: res.data が None なら空辞書 {} に（None.get() でエラーにならないように）
        row = res.data or {}
        # 解説: 最終付与日を取得
        last = row.get("last_grant_date")
        # 解説: 在庫数を整数に変換（None や文字列でも安全に扱う）
        qty = int(row.get("quantity") or 0)
        # 解説: 最終付与日が今日なら追加付与不要。現在庫をそのまま返す
        if last == today:
            return qty

        # lazy +2: 同日多重を防ぐため WHERE に last_grant_date を含める
        # 解説: 今日より前に付与していたので +2 する（上限 STOCK_CAP を超えない）
        new_qty = min(qty + DAILY_GRANT, STOCK_CAP)
        # 解説: UPDATE クエリを組み立てる（まだ実行しない）
        upd_q = (
            supabase.table("user_inventory")
            .update({"quantity": new_qty, "last_grant_date": today})
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
        )
        # 解説: WHERE 条件に last_grant_date を含める（同日多重付与を防ぐ条件分岐）
        if last is None:
            # 解説: last が NULL の場合は .is_("last_grant_date", "null") で NULL 一致を指定
            upd_q = upd_q.is_("last_grant_date", "null")
        else:
            # 解説: last に値があれば等値比較で一致させる
            upd_q = upd_q.eq("last_grant_date", last)
        # 解説: UPDATE を実行する
        upd_res = upd_q.execute()
        # 解説: 更新行があれば（競合しなかった） new_qty を返す、なければ変更前の qty を返す
        return new_qty if upd_res.data else qty
    # 解説: DB エラー等の場合は安全に 0 を返す（在庫不明 = 使えない扱い）
    except Exception:
        return 0


# 解説: ensure_like_stock を呼んで現在庫を返す簡易ラッパー
def get_like_stock(user_id: str) -> int:
    """ensure 込みで現在庫を返す。"""
    return ensure_like_stock(user_id)


# 解説: いいね送信時に在庫を1消費する関数。成功したら True、在庫切れ・失敗なら False
def consume_like_stock(user_id: str) -> bool:
    """在庫を1消費。成功した（行が更新された）ら True。
    quantity を WHERE に含めるアトミック減算で在庫切れと競合を防ぐ。
    """
    # 解説: try ブロック = DB エラー時に False を返して処理を続行するために囲む
    try:
        # 解説: まず現在の在庫数を取得する
        res = (
            supabase.table("user_inventory")
            .select("quantity")
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .single()
            .execute()
        )
        # 解説: 現在庫を整数に変換
        current = int((res.data or {}).get("quantity") or 0)
        # 解説: 在庫が0以下なら消費できない → False を返す
        if current <= 0:
            return False
        # 解説: アトミック減算: quantity = current - 1 の UPDATE を実行する
        # 解説: WHERE に .eq("quantity", current) を含めることで「読み取った値と同じ場合のみ更新」を保証
        #       他のリクエストが先に減算した場合は WHERE が一致せず upd.data が空になる（競合を検出できる）
        upd = (
            supabase.table("user_inventory")
            .update({"quantity": current - 1})
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .eq("quantity", current)
            .execute()
        )
        # 解説: upd.data が空でなければ更新成功（True）、空なら競合で失敗（False）
        return bool(upd.data)
    except Exception:
        return False


# 解説: いいね送信後の処理（マッチ判定等）が失敗した場合に在庫を1戻す補償関数
def refund_like_stock(user_id: str) -> None:
    """補償用: 消費後の処理が失敗した時に1戻す。10000 を超えない。"""
    try:
        # 解説: 現在の在庫を取得する
        res = (
            supabase.table("user_inventory")
            .select("quantity")
            .eq("user_id", user_id)
            .eq("item_type", LIKE_STOCK)
            .single()
            .execute()
        )
        # 解説: 現在庫を整数に変換
        current = int((res.data or {}).get("quantity") or 0)
        # 解説: +1 して上限 STOCK_CAP を超えないように制限
        new_qty = min(current + 1, STOCK_CAP)
        # 解説: 在庫を更新して返金完了
        supabase.table("user_inventory").update({"quantity": new_qty}).eq(
            "user_id", user_id
        ).eq("item_type", LIKE_STOCK).execute()
    # 解説: 返金失敗はユーザーに見せるエラーではなく警告ログに残す（本処理は既に完了しているため）
    except Exception:
        logger.warning("like stock refund failed user=%s", user_id, exc_info=True)
