import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.image_utils import get_signed_image_url
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.core.ws_manager import manager as ws_manager
from app.schemas.safety import (
    REPORT_REASONS,
    BlockRequest,
    BlockedUserItem,
    HiddenUserItem,
    HideRequest,
    ReportRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/safety", tags=["safety"])


def _require_approved(current_user: User) -> None:
    """自分のステータスが approved でなければ 403 を raise する。"""
    try:
        res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみ操作できます")
    if not res.data or res.data.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみ操作できます")


# ---------- Block ----------

@router.post("/block", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
async def block_user(
    request: Request,
    body: BlockRequest,
    current_user: User = Depends(get_active_user),
) -> None:
    _require_approved(current_user)
    me = str(current_user.id)
    target = str(body.blocked_id)

    if me == target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="自分自身をブロックできません")

    # 冪等: 既にブロック済みなら何もしない
    existing = (
        supabase.table("blocks")
        .select("blocker_id")
        .eq("blocker_id", me)
        .eq("blocked_id", target)
        .limit(1)
        .execute()
    )
    if existing.data:
        return

    supabase.table("blocks").insert({"blocker_id": me, "blocked_id": target}).execute()

    # 互いにマッチしていたら matches を削除（messages は CASCADE で連動削除）
    # ブロック自体（blocks レコード）は成功済みのため、match 削除失敗時は巻き戻し不要。
    # ただし match が孤立すると blocks 両側 API フィルタで除外されるため表示漏洩は防げるが、
    # DB 上の不整合として残るため fail-open を許容せずログに記録する。
    try:
        match_res = (
            supabase.table("matches")
            .select("id")
            .or_(
                f"and(user_a_id.eq.{me},user_b_id.eq.{target}),and(user_a_id.eq.{target},user_b_id.eq.{me})"
            )
            .limit(1)
            .execute()
        )
        if match_res.data:
            match_id = match_res.data[0]["id"]
            supabase.table("matches").delete().eq("id", match_id).execute()
            # ブロック完了と同時に WS 接続も強制切断（タイピング通知の流出を防ぐ）
            await ws_manager.disconnect_all(match_id)
    except Exception as e:
        logger.error("ブロック後の match 削除に失敗（孤立 match の可能性）blocker=%s blocked=%s: %s", me, target, e)


@router.delete("/block/{blocked_id}", status_code=status.HTTP_403_FORBIDDEN)
async def unblock_user(
    blocked_id: UUID,
    current_user: User = Depends(get_active_user),
) -> dict:
    # ブロックは解除不可の仕様。誤ブロックはサポート（管理者による DB 直接操作）で対応。
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="ブロックは取り消せません。誤ブロックの場合はサポートまでご連絡ください。",
    )


# ---------- Report ----------

@router.post("/report", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def report_user(
    request: Request,
    body: ReportRequest,
    current_user: User = Depends(get_active_user),
) -> None:
    _require_approved(current_user)
    me = str(current_user.id)
    target = str(body.reported_id)

    if me == target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="自分自身を通報できません")

    if body.reason not in REPORT_REASONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="無効な通報理由です")

    try:
        supabase.table("reports").insert(
            {
                "reporter_id": me,
                "reported_id": target,
                "reason": body.reason,
                "detail": body.detail,
            }
        ).execute()
    except APIError as e:
        logger.error("通報の記録に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="通報の記録に失敗しました",
        )

    # 通報したら自動的に非表示に（冪等）
    try:
        supabase.table("hides").upsert(
            {"hider_id": me, "hidden_id": target},
            on_conflict="hider_id,hidden_id",
        ).execute()
    except Exception:
        pass


# ---------- Hide ----------

@router.post("/hide", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def hide_user(
    request: Request,
    body: HideRequest,
    current_user: User = Depends(get_active_user),
) -> None:
    _require_approved(current_user)
    me = str(current_user.id)
    target = str(body.hidden_id)

    if me == target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="自分自身を非表示にできません")

    # 冪等: 既に非表示済みなら何もしない
    existing = (
        supabase.table("hides")
        .select("hider_id")
        .eq("hider_id", me)
        .eq("hidden_id", target)
        .limit(1)
        .execute()
    )
    if existing.data:
        return

    supabase.table("hides").insert({"hider_id": me, "hidden_id": target}).execute()


@router.delete("/hide/{hidden_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def unhide_user(
    request: Request,
    hidden_id: UUID,
    current_user: User = Depends(get_active_user),
) -> None:
    _require_approved(current_user)
    me = str(current_user.id)
    supabase.table("hides").delete().eq("hider_id", me).eq("hidden_id", str(hidden_id)).execute()


# ---------- Query ----------


@router.get("/blocks", response_model=list[BlockedUserItem])
async def get_blocked_users(
    current_user: User = Depends(get_active_user),
) -> list[BlockedUserItem]:
    _require_approved(current_user)
    me = str(current_user.id)

    blocks_res = (
        supabase.table("blocks")
        .select("blocked_id")
        .eq("blocker_id", me)
        .execute()
    )

    blocked_ids = [row["blocked_id"] for row in (blocks_res.data or [])]
    if not blocked_ids:
        return []

    profiles_res = (
        supabase.table("profiles")
        .select("id, name, profile_image_path")
        .in_("id", blocked_ids)
        .execute()
    )

    result: list[BlockedUserItem] = []
    for p in (profiles_res.data or []):
        path: str | None = p.get("profile_image_path")
        result.append(BlockedUserItem(
            id=p["id"],
            name=p.get("name"),
            avatar_url=get_signed_image_url(path) if path else None,
        ))

    return result


@router.get("/hides", response_model=list[HiddenUserItem])
async def get_hidden_users(
    current_user: User = Depends(get_active_user),
) -> list[HiddenUserItem]:
    _require_approved(current_user)
    me = str(current_user.id)

    hides_res = (
        supabase.table("hides")
        .select("hidden_id, created_at")
        .eq("hider_id", me)
        .order("created_at", desc=True)
        .execute()
    )

    hidden_ids = [row["hidden_id"] for row in (hides_res.data or [])]
    if not hidden_ids:
        return []

    profiles_res = (
        supabase.table("profiles")
        .select("id, name, profile_image_path")
        .in_("id", hidden_ids)
        .execute()
    )

    by_id = {p["id"]: p for p in (profiles_res.data or [])}

    result: list[HiddenUserItem] = []
    for hid in hidden_ids:
        p = by_id.get(hid)
        if not p:
            continue
        path: str | None = p.get("profile_image_path")
        result.append(HiddenUserItem(
            id=p["id"],
            name=p.get("name"),
            avatar_url=get_signed_image_url(path) if path else None,
        ))

    return result


@router.get("/blocked-ids")
async def get_blocked_ids(
    current_user: User = Depends(get_active_user),
) -> dict[str, list[str]]:
    _require_approved(current_user)
    me = str(current_user.id)
    res = (
        supabase.table("blocks")
        .select("blocked_id")
        .eq("blocker_id", me)
        .execute()
    )
    return {"blocked_ids": [row["blocked_id"] for row in (res.data or [])]}


@router.get("/hidden-ids")
async def get_hidden_ids(
    current_user: User = Depends(get_active_user),
) -> dict[str, list[str]]:
    _require_approved(current_user)
    me = str(current_user.id)
    res = (
        supabase.table("hides")
        .select("hidden_id")
        .eq("hider_id", me)
        .execute()
    )
    return {"hidden_ids": [row["hidden_id"] for row in (res.data or [])]}
