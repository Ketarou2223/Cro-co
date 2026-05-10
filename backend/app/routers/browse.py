from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.browse import BrowseProfileItem

_AVATAR_SIGNED_URL_SECONDS = 300  # 5分

router = APIRouter(prefix="/api", tags=["browse"])


@router.get("/profiles", response_model=list[BrowseProfileItem])
async def list_profiles(
    current_user: User = Depends(get_current_user),
) -> list[BrowseProfileItem]:
    # 自分の status が approved か確認
    try:
        me_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="承認済みユーザーのみアクセスできます",
        )

    # approved ユーザーを自分以外で取得
    try:
        response = (
            supabase.table("profiles")
            .select("id, name, year, faculty, bio, profile_image_path")
            .eq("status", "approved")
            .neq("id", str(current_user.id))
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ユーザー一覧の取得に失敗しました: {e.message}",
        )

    result: list[BrowseProfileItem] = []
    for p in response.data or []:
        avatar_url: str | None = None
        path: str | None = p.get("profile_image_path")
        if path:
            try:
                signed = supabase.storage.from_("profile-images").create_signed_url(
                    path=path,
                    expires_in=_AVATAR_SIGNED_URL_SECONDS,
                )
                avatar_url = signed.get("signedURL")
            except Exception:
                avatar_url = None

        result.append(
            BrowseProfileItem(
                id=p["id"],
                name=p.get("name"),
                year=p.get("year"),
                faculty=p.get("faculty"),
                bio=p.get("bio"),
                avatar_url=avatar_url,
            )
        )

    return result
