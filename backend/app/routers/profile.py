from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.profile import ProfileResponse

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
