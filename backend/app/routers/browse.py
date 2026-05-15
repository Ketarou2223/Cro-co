from fastapi import APIRouter, Depends, HTTPException, Query, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.supabase_client import supabase
from app.schemas.browse import BrowseProfileItem, ProfileDetail
from app.schemas.profile import PhotoItem


def _public_image_url(path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/profile-images/{path}"

router = APIRouter(prefix="/api", tags=["browse"])


@router.get("/profiles", response_model=list[BrowseProfileItem])
async def list_profiles(
    year: int | None = Query(None, ge=1, le=6),
    faculty: str | None = Query(None, max_length=100),
    looking_for: str | None = Query(None),
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

    me = str(current_user.id)

    # ブロック関連ユーザーIDを収集（自分がブロックした・された）
    blocked_ids: set[str] = set()
    try:
        b1 = supabase.table("blocks").select("blocked_id").eq("blocker_id", me).execute()
        b2 = supabase.table("blocks").select("blocker_id").eq("blocked_id", me).execute()
        blocked_ids = {r["blocked_id"] for r in (b1.data or [])} | {r["blocker_id"] for r in (b2.data or [])}
    except Exception:
        pass

    # 非表示ユーザーIDを収集
    hidden_ids: set[str] = set()
    try:
        h = supabase.table("hides").select("hidden_id").eq("hider_id", me).execute()
        hidden_ids = {r["hidden_id"] for r in (h.data or [])}
    except Exception:
        pass

    exclude_ids = blocked_ids | hidden_ids

    # approved ユーザーを自分以外で取得（フィルター適用）
    try:
        q = (
            supabase.table("profiles")
            .select("id, name, year, faculty, bio, profile_image_path, looking_for, last_seen_at, show_online_status")
            .eq("status", "approved")
            .neq("id", me)
        )
        if exclude_ids:
            q = q.not_.in_("id", list(exclude_ids))
        if year is not None:
            q = q.eq("year", year)
        if faculty:
            q = q.ilike("faculty", f"%{faculty}%")
        if looking_for:
            q = q.eq("looking_for", looking_for)
        response = q.order("created_at", desc=True).limit(50).execute()
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
            .eq("liker_id", me)
            .execute()
        )
        liked_set = {row["liked_id"] for row in (likes_res.data or [])}
    except Exception:
        pass

    result: list[BrowseProfileItem] = []
    for p in response.data or []:
        path: str | None = p.get("profile_image_path")
        result.append(
            BrowseProfileItem(
                id=p["id"],
                name=p.get("name"),
                year=p.get("year"),
                faculty=p.get("faculty"),
                bio=p.get("bio"),
                avatar_url=_public_image_url(path) if path else None,
                is_liked=p["id"] in liked_set,
                last_seen_at=p.get("last_seen_at"),
                show_online_status=p.get("show_online_status", True),
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
            .select("id, name, year, faculty, bio, created_at, profile_image_path, status, interests, club, hometown, looking_for, last_seen_at, show_online_status")
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

    path: str | None = p.get("profile_image_path")
    avatar_url: str | None = _public_image_url(path) if path else None

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

    # 複数写真を取得
    photos: list[PhotoItem] = []
    try:
        photos_res = (
            supabase.table("profile_images")
            .select("id, image_path, display_order")
            .eq("user_id", user_id)
            .order("display_order")
            .execute()
        )
        for row in photos_res.data or []:
            photos.append(
                PhotoItem(
                    id=row["id"],
                    image_path=row["image_path"],
                    display_order=row["display_order"],
                    signed_url=_public_image_url(row["image_path"]),
                )
            )
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
        photos=photos,
        interests=p.get("interests") or [],
        club=p.get("club"),
        hometown=p.get("hometown"),
        looking_for=p.get("looking_for"),
        last_seen_at=p.get("last_seen_at"),
        show_online_status=p.get("show_online_status", True),
    )
