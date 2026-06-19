# 解説: このファイルは「運営お知らせ」の管理者向けエンドポイントを定義する。
# 解説: 全エンドポイントは require_admin（管理者のみ）。
# 解説: エンドポイント一覧:
#   POST   /api/admin/announcements/{id}  → お知らせ作成
#   GET    /api/admin/announcements       → 一覧（取消済み含む・新しい順）
#   PATCH  /api/admin/announcements/{id} → 編集（本文・対象変更可）
#   DELETE /api/admin/announcements/{id} → 取消（is_deleted=true・論理削除）

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from postgrest.exceptions import APIError
from supabase_auth.types import User

from app.auth.dependencies import require_admin
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.schemas.announcements import (
    AnnouncementAdminItem,
    AnnouncementCreate,
    AnnouncementUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/announcements", tags=["admin-announcements"])

_SELECT_FIELDS = "id, title, body, target_all, target_faculties, target_grades, target_genders, created_by, is_deleted, deleted_at, created_at, updated_at"


@router.post("/", response_model=AnnouncementAdminItem)
@limiter.limit("30/min")
async def create_announcement(
    request: Request,
    body: AnnouncementCreate,
    current_user: User = Depends(require_admin),
) -> AnnouncementAdminItem:
    """お知らせを作成する。"""
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "title": body.title,
        "body": body.body,
        "target_all": body.target_all,
        "target_faculties": body.target_faculties,
        "target_grades": body.target_grades,
        "target_genders": body.target_genders,
        "created_by": str(current_user.id),
        "created_at": now,
        "updated_at": now,
    }
    try:
        res = supabase.table("announcements").insert(row).execute()
    except APIError as e:
        logger.error("お知らせ作成失敗: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="お知らせの作成に失敗しました",
        )
    return AnnouncementAdminItem(**res.data[0])


@router.get("/", response_model=list[AnnouncementAdminItem])
@limiter.limit("60/min")
async def list_announcements(
    request: Request,
    current_user: User = Depends(require_admin),
) -> list[AnnouncementAdminItem]:
    """お知らせ一覧（取消済み含む・新しい順）。"""
    try:
        res = (
            supabase.table("announcements")
            .select(_SELECT_FIELDS)
            .order("created_at", desc=True)
            .execute()
        )
    except APIError as e:
        logger.error("お知らせ一覧取得失敗: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="データの取得に失敗しました",
        )
    return [AnnouncementAdminItem(**r) for r in (res.data or [])]


@router.patch("/{announcement_id}", response_model=AnnouncementAdminItem)
@limiter.limit("30/min")
async def update_announcement(
    request: Request,
    announcement_id: UUID,
    body: AnnouncementUpdate,
    current_user: User = Depends(require_admin),
) -> AnnouncementAdminItem:
    """お知らせを編集する（本文・対象変更可）。取消済みは編集不可。"""
    update_data: dict = {}
    if body.title is not None:
        update_data["title"] = body.title
    if body.body is not None:
        update_data["body"] = body.body
    if body.target_all is not None:
        update_data["target_all"] = body.target_all
    if body.target_faculties is not None:
        update_data["target_faculties"] = body.target_faculties
    if body.target_grades is not None:
        update_data["target_grades"] = body.target_grades
    if body.target_genders is not None:
        update_data["target_genders"] = body.target_genders

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="更新するフィールドがありません",
        )
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        res = (
            supabase.table("announcements")
            .update(update_data)
            .eq("id", str(announcement_id))
            .eq("is_deleted", False)
            .execute()
        )
    except APIError as e:
        logger.error("お知らせ更新失敗 id=%s: %s", announcement_id, e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="お知らせの更新に失敗しました",
        )
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="お知らせが見つかりません")
    return AnnouncementAdminItem(**res.data[0])


@router.delete("/{announcement_id}")
@limiter.limit("30/min")
async def delete_announcement(
    request: Request,
    announcement_id: UUID,
    current_user: User = Depends(require_admin),
) -> dict:
    """お知らせを取り消す（is_deleted=true・論理削除）。"""
    now = datetime.now(timezone.utc).isoformat()
    try:
        res = (
            supabase.table("announcements")
            .update({"is_deleted": True, "deleted_at": now, "updated_at": now})
            .eq("id", str(announcement_id))
            .eq("is_deleted", False)
            .execute()
        )
    except APIError as e:
        logger.error("お知らせ取消失敗 id=%s: %s", announcement_id, e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="お知らせの取り消しに失敗しました",
        )
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="お知らせが見つかりません")
    return {"ok": True}
