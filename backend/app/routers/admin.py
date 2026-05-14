from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import require_admin
from app.core.supabase_client import supabase
from app.schemas.admin import (
    PendingProfileItem,
    RejectRequest,
    ReportItem,
    ReviewResponse,
    SignedUrlResponse,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

_SIGNED_URL_EXPIRES = 300  # 5分


@router.get("/pending", response_model=list[PendingProfileItem])
async def get_pending_profiles(
    current_user: User = Depends(require_admin),
) -> list[PendingProfileItem]:
    try:
        response = (
            supabase.table("profiles")
            .select("id, email, name, year, faculty, bio, submitted_at, student_id_image_path")
            .eq("status", "pending_review")
            .not_.is_("submitted_at", "null")
            .order("submitted_at", desc=False)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"データの取得に失敗しました: {e.message}",
        )
    return [PendingProfileItem(**item) for item in response.data]


@router.get("/student-id/{user_id}", response_model=SignedUrlResponse)
async def get_student_id_signed_url(
    user_id: str,
    current_user: User = Depends(require_admin),
) -> SignedUrlResponse:
    try:
        response = (
            supabase.table("profiles")
            .select("student_id_image_path")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    if not response.data or not response.data.get("student_id_image_path"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="学生証画像が未提出です",
        )

    image_path: str = response.data["student_id_image_path"]

    try:
        result = supabase.storage.from_("student-ids").create_signed_url(
            path=image_path,
            expires_in=_SIGNED_URL_EXPIRES,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="署名付きURLの生成に失敗しました",
        )

    # supabase-py v2 は dict {"signedURL": "..."} を返す
    if isinstance(result, dict):
        signed_url = result.get("signedURL") or result.get("signed_url", "")
    else:
        signed_url = getattr(result, "signed_url", "") or getattr(result, "signedURL", "")

    if not signed_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="署名付きURLの取得に失敗しました",
        )

    return SignedUrlResponse(signed_url=signed_url)


def _get_profile_status(user_id: str) -> str:
    """プロフィールの status を取得。存在しなければ 404 を raise。"""
    try:
        response = (
            supabase.table("profiles")
            .select("status")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )
    return response.data["status"]


@router.post("/approve/{user_id}", response_model=ReviewResponse)
async def approve_user(
    user_id: str,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    current_status = _get_profile_status(user_id)
    if current_status in ("approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"このユーザーは既に審査済みです（現在のステータス: {current_status}）",
        )

    now = datetime.now(timezone.utc)
    try:
        response = (
            supabase.table("profiles")
            .update(
                {
                    "status": "approved",
                    "reviewed_at": now.isoformat(),
                    "rejection_reason": None,
                }
            )
            .eq("id", user_id)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"承認処理に失敗しました: {e.message}",
        )

    updated = response.data[0] if response.data else {}
    return ReviewResponse(
        id=user_id,
        status=updated.get("status", "approved"),
        reviewed_at=updated.get("reviewed_at", now),
    )


@router.post("/reject/{user_id}", response_model=ReviewResponse)
async def reject_user(
    user_id: str,
    body: RejectRequest,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    current_status = _get_profile_status(user_id)
    if current_status in ("approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"このユーザーは既に審査済みです（現在のステータス: {current_status}）",
        )

    now = datetime.now(timezone.utc)
    try:
        response = (
            supabase.table("profiles")
            .update(
                {
                    "status": "rejected",
                    "reviewed_at": now.isoformat(),
                    "rejection_reason": body.reason,
                }
            )
            .eq("id", user_id)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"却下処理に失敗しました: {e.message}",
        )

    updated = response.data[0] if response.data else {}
    return ReviewResponse(
        id=user_id,
        status=updated.get("status", "rejected"),
        reviewed_at=updated.get("reviewed_at", now),
    )


@router.post("/suspend/{user_id}", response_model=ReviewResponse)
async def suspend_user_by_report(
    user_id: str,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    """通報による停止（ステータスを rejected に変更）。既に rejected でも上書き可。"""
    try:
        _get_profile_status(user_id)
    except HTTPException:
        raise

    now = datetime.now(timezone.utc)
    try:
        response = (
            supabase.table("profiles")
            .update(
                {
                    "status": "rejected",
                    "reviewed_at": now.isoformat(),
                    "rejection_reason": "通報による停止",
                }
            )
            .eq("id", user_id)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"停止処理に失敗しました: {e.message}",
        )

    updated = response.data[0] if response.data else {}
    return ReviewResponse(
        id=user_id,
        status=updated.get("status", "rejected"),
        reviewed_at=updated.get("reviewed_at", now),
    )


@router.get("/reports", response_model=list[ReportItem])
async def get_reports(
    current_user: User = Depends(require_admin),
) -> list[ReportItem]:
    try:
        res = (
            supabase.table("reports")
            .select("id, reporter_id, reported_id, reason, detail, created_at")
            .order("created_at", desc=True)
            .limit(200)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"通報一覧の取得に失敗しました: {e.message}",
        )

    # reporter / reported の名前を一括取得
    report_rows = res.data or []
    user_ids = list(
        {r["reporter_id"] for r in report_rows} | {r["reported_id"] for r in report_rows}
    )
    name_map: dict[str, str | None] = {}
    if user_ids:
        try:
            profiles_res = (
                supabase.table("profiles")
                .select("id, name")
                .in_("id", user_ids)
                .execute()
            )
            name_map = {p["id"]: p.get("name") for p in (profiles_res.data or [])}
        except Exception:
            pass

    return [
        ReportItem(
            id=r["id"],
            reporter_id=r["reporter_id"],
            reporter_name=name_map.get(r["reporter_id"]),
            reported_id=r["reported_id"],
            reported_name=name_map.get(r["reported_id"]),
            reason=r["reason"],
            detail=r.get("detail"),
            created_at=r["created_at"],
        )
        for r in report_rows
    ]
