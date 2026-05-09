from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    try:
        response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )
    if response.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )
    return ProfileResponse(**response.data)


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="更新するフィールドがありません",
        )
    try:
        response = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", str(current_user.id))
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"プロフィールの更新に失敗しました: {e.message}",
        )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )
    return ProfileResponse(**response.data[0])
