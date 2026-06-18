# 解説: このファイルは「通知」機能の API エンドポイントを定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(notifications.router) として登録される
# 解説: エンドポイント一覧:
#   GET  /api/notifications/              → 通知一覧を取得する（最新50件）
#   POST /api/notifications/read-all      → 全通知を既読にする
#   POST /api/notifications/{id}/read     → 指定通知を既読にする
# 解説: 呼ぶ先:
#   Supabase: notifications / profiles テーブル
#   block_utils.py: ブロック相手からの通知を除外
#   image_utils.py: 送信者のプロフィール画像の署名付き URL 生成

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase_auth.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.block_utils import get_blocked_user_ids
from app.core.image_utils import get_signed_image_url
from app.core.supabase_client import supabase
from app.schemas.notifications import NotificationItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# 解説: GET /api/notifications/ = 自分宛の通知一覧を返す（最大50件・新しい順）
@router.get("/", response_model=list[NotificationItem])
async def get_notifications(
    current_user: User = Depends(get_active_user),
) -> list[NotificationItem]:
    my_id = str(current_user.id)
    try:
        # 解説: notifications テーブルから自分宛の通知を新しい順に50件取得する
        res = (
            supabase.table("notifications")
            .select("id, type, from_user_id, match_id, message_preview, read_at, created_at")
            .eq("user_id", my_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
    except APIError:
        # 解説: DB エラーの場合は空リストを返す（通知が見えなくなるだけでアプリは止まらない）
        return []

    rows = res.data or []
    if not rows:
        return []

    # ブロック相手（双方向）が送信元の通知を除外
    # 解説: from_user_id がブロック相手の通知を除く
    blocked_ids = set(get_blocked_user_ids(my_id))
    if blocked_ids:
        rows = [r for r in rows if r.get("from_user_id") not in blocked_ids]
    if not rows:
        return []

    # 解説: from_user_id の重複を set で除いてから一覧を作る（バッチ取得用）
    from_user_ids = list({r["from_user_id"] for r in rows if r.get("from_user_id")})
    # 解説: {user_id: profile行} の辞書（後で高速参照するため）
    profiles_map: dict[str, dict] = {}
    if from_user_ids:
        try:
            # 解説: 通知送信者のプロフィールを一括取得する（N+1 防止）
            p_res = (
                supabase.table("profiles")
                .select("id, name, profile_image_path")
                .in_("id", from_user_ids)
                .execute()
            )
            for p in (p_res.data or []):
                profiles_map[p["id"]] = p
        except Exception:
            pass

    # 解説: 各通知行を NotificationItem に変換してリストを作る
    result: list[NotificationItem] = []
    for r in rows:
        fuid = r.get("from_user_id")
        # 解説: from_user_id があれば profiles_map から取得する（なければ None）
        prof = profiles_map.get(fuid) if fuid else None
        path: str | None = prof.get("profile_image_path") if prof else None
        result.append(NotificationItem(
            id=r["id"],
            type=r["type"],
            from_user_id=fuid,
            from_user_name=prof.get("name") if prof else None,
            # 解説: path がある場合のみ署名付き URL を生成する
            from_user_avatar=get_signed_image_url(path) if path else None,
            match_id=r.get("match_id"),
            message_preview=r.get("message_preview"),
            read_at=r.get("read_at"),
            created_at=r["created_at"],
        ))
    return result


# 解説: POST /api/notifications/read-all = 未読の全通知を一括既読にする
@router.post("/read-all")
async def read_all_notifications(
    current_user: User = Depends(get_active_user),
) -> dict:
    my_id = str(current_user.id)
    # 解説: 現在の UTC 時刻を ISO 文字列として既読日時に使う
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        (
            supabase.table("notifications")
            .update({"read_at": now_iso})
            .eq("user_id", my_id)
            # 解説: .is_("read_at", "null") = まだ未読（read_at が NULL）の通知のみ対象
            .is_("read_at", "null")
            .execute()
        )
    except APIError as e:
        logger.error("全通知の既読更新に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既読の更新に失敗しました",
        )
    return {"ok": True}


# 解説: POST /api/notifications/{notification_id}/read = 指定通知を既読にする
@router.post("/{notification_id}/read")
async def read_notification(
    notification_id: UUID,
    current_user: User = Depends(get_active_user),
) -> dict:
    my_id = str(current_user.id)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        (
            supabase.table("notifications")
            .update({"read_at": now_iso})
            # 解説: id が指定 ID かつ user_id が自分のもの（他人の通知を既読にできない）
            .eq("id", str(notification_id))
            .eq("user_id", my_id)
            .execute()
        )
    except APIError as e:
        logger.error("通知の既読更新に失敗しました id=%s: %s", notification_id, e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既読の更新に失敗しました",
        )
    return {"ok": True}
