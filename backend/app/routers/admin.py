from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import require_admin
from app.core.supabase_client import supabase
from app.schemas.admin import PendingProfileItem, SignedUrlResponse

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
