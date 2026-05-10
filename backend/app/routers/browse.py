from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.browse import BrowseProfileItem, ProfileDetail

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

    # いいね済みユーザーを一括取得（N+1回避）
    liked_set: set[str] = set()
    try:
        likes_res = (
            supabase.table("likes")
            .select("liked_id")
            .eq("liker_id", str(current_user.id))
            .execute()
        )
        liked_set = {row["liked_id"] for row in (likes_res.data or [])}
    except Exception:
        pass

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
                is_liked=p["id"] in liked_set,
            )
        )

    return result


@router.get("/profiles/{user_id}", response_model=ProfileDetail)
async def get_profile(
    user_id: str,
    current_user: User = Depends(get_current_user),
) -> ProfileDetail:
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

    # 対象ユーザーのプロフィールを取得
    is_self = str(current_user.id) == user_id
    try:
        target_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, bio, created_at, profile_image_path, status")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    if not target_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    p = target_res.data
    # 自分以外は approved のみ閲覧可
    if not is_self and p.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

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

    # いいね済みか確認
    is_liked = False
    if not is_self:
        try:
            like_res = (
                supabase.table("likes")
                .select("liked_id")
                .eq("liker_id", str(current_user.id))
                .eq("liked_id", user_id)
                .limit(1)
                .execute()
            )
            is_liked = len(like_res.data or []) > 0
        except Exception:
            pass

    return ProfileDetail(
        id=p["id"],
        name=p.get("name"),
        year=p.get("year"),
        faculty=p.get("faculty"),
        bio=p.get("bio"),
        created_at=p["created_at"],
        avatar_url=avatar_url,
        is_liked=is_liked,
    )
