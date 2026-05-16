import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.supabase_client import supabase
from app.schemas.notifications import NotificationItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _public_image_url(path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/profile-images/{path}"


@router.get("/", response_model=list[NotificationItem])
async def get_notifications(
    current_user: User = Depends(get_current_user),
) -> list[NotificationItem]:
    my_id = str(current_user.id)
    try:
        res = (
            supabase.table("notifications")
            .select("id, type, from_user_id, match_id, message_preview, read_at, created_at")
            .eq("user_id", my_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
    except APIError:
        return []

    rows = res.data or []
    if not rows:
        return []

    from_user_ids = list({r["from_user_id"] for r in rows if r.get("from_user_id")})
    profiles_map: dict[str, dict] = {}
    if from_user_ids:
        try:
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

    result: list[NotificationItem] = []
    for r in rows:
        fuid = r.get("from_user_id")
        prof = profiles_map.get(fuid) if fuid else None
        path: str | None = prof.get("profile_image_path") if prof else None
        result.append(NotificationItem(
            id=r["id"],
            type=r["type"],
            from_user_id=fuid,
            from_user_name=prof.get("name") if prof else None,
            from_user_avatar=_public_image_url(path) if path else None,
            match_id=r.get("match_id"),
            message_preview=r.get("message_preview"),
            read_at=r.get("read_at"),
            created_at=r["created_at"],
        ))
    return result


@router.post("/read-all")
async def read_all_notifications(
    current_user: User = Depends(get_current_user),
) -> dict:
    my_id = str(current_user.id)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        (
            supabase.table("notifications")
            .update({"read_at": now_iso})
            .eq("user_id", my_id)
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


@router.post("/{notification_id}/read")
async def read_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
) -> dict:
    my_id = str(current_user.id)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        (
            supabase.table("notifications")
            .update({"read_at": now_iso})
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
