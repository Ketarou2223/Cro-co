import logging

from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.email import send_match_notification
from app.core.supabase_client import supabase
from app.schemas.like import LikeCreateRequest, LikeResponse, LikerItem


def _public_image_url(path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/profile-images/{path}"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/likes", tags=["likes"])


@router.post("/", response_model=LikeResponse)
async def create_like(
    body: LikeCreateRequest,
    current_user: User = Depends(get_current_user),
) -> LikeResponse:
    liker_id = str(current_user.id)
    liked_id = str(body.liked_id)

    # チェック1: 自分が approved か
    try:
        me_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", liker_id)
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
            detail="承認済みユーザーのみいいねできます",
        )

    # チェック2: 自分自身へのいいね禁止
    if liker_id == liked_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="自分自身にいいねすることはできません",
        )

    # チェック3: 相手が存在かつ approved か
    try:
        target_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", liked_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    if not target_res.data or target_res.data.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    # チェック4: 既存のいいねを確認（冪等な動作）→ 新規マッチ成立ではないので is_match=False
    try:
        existing_res = (
            supabase.table("likes")
            .select("liker_id, liked_id, created_at")
            .eq("liker_id", liker_id)
            .eq("liked_id", liked_id)
            .single()
            .execute()
        )
        if existing_res.data:
            return LikeResponse(**existing_res.data, is_match=False)
    except APIError:
        pass  # 行が存在しない場合は APIError → そのまま INSERT へ

    # INSERT（DBトリガー detect_match が裏で matches を自動更新する）
    try:
        insert_res = (
            supabase.table("likes")
            .insert({"liker_id": liker_id, "liked_id": liked_id})
            .execute()
        )
    except APIError as e:
        # 重複キーエラーの場合は既存行を返す（競合状態への対応）
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            try:
                fallback_res = (
                    supabase.table("likes")
                    .select("liker_id, liked_id, created_at")
                    .eq("liker_id", liker_id)
                    .eq("liked_id", liked_id)
                    .single()
                    .execute()
                )
                return LikeResponse(**fallback_res.data, is_match=False)
            except APIError:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="いいねの登録に失敗しました",
        )

    if not insert_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="いいねの登録に失敗しました",
        )

    # INSERT 後にマッチ成立を確認（トリガーが matches を更新済みのはず）
    user_a = min(liker_id, liked_id)
    user_b = max(liker_id, liked_id)
    is_match = False
    try:
        match_res = (
            supabase.table("matches")
            .select("user_a_id")
            .eq("user_a_id", user_a)
            .eq("user_b_id", user_b)
            .single()
            .execute()
        )
        is_match = match_res.data is not None
    except APIError:
        pass  # matches 行なし → is_match=False のまま

    if is_match:
        try:
            profiles_res = (
                supabase.table("profiles")
                .select("id, email, name")
                .in_("id", [liker_id, liked_id])
                .execute()
            )
            profiles_map = {p["id"]: p for p in (profiles_res.data or [])}
            liker_profile = profiles_map.get(liker_id, {})
            liked_profile = profiles_map.get(liked_id, {})
            if liker_profile.get("email"):
                send_match_notification(
                    liker_profile["email"],
                    liked_profile.get("name") or "相手",
                )
            if liked_profile.get("email"):
                send_match_notification(
                    liked_profile["email"],
                    liker_profile.get("name") or "相手",
                )
        except Exception as e:
            logger.error("マッチ通知メール送信中にエラー: %s", e)

    return LikeResponse(**insert_res.data[0], is_match=is_match)


@router.get("/received", response_model=list[LikerItem])
async def get_received_likes(
    current_user: User = Depends(get_current_user),
) -> list[LikerItem]:
    my_id = str(current_user.id)

    try:
        me_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", my_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="プロフィールが見つかりません")

    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみアクセスできます")

    likes_res = (
        supabase.table("likes")
        .select("liker_id")
        .eq("liked_id", my_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    liker_ids = [row["liker_id"] for row in (likes_res.data or [])]
    if not liker_ids:
        return []

    # マッチ済みを除外
    matches_res = (
        supabase.table("matches")
        .select("user_a_id, user_b_id")
        .or_(f"user_a_id.eq.{my_id},user_b_id.eq.{my_id}")
        .execute()
    )
    matched_ids: set[str] = set()
    for row in (matches_res.data or []):
        other = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]
        matched_ids.add(other)

    liker_ids = [lid for lid in liker_ids if lid not in matched_ids]
    if not liker_ids:
        return []

    profiles_res = (
        supabase.table("profiles")
        .select("id, name, year, faculty, profile_image_path")
        .in_("id", liker_ids)
        .execute()
    )

    result: list[LikerItem] = []
    for p in (profiles_res.data or []):
        path: str | None = p.get("profile_image_path")
        result.append(LikerItem(
            id=p["id"],
            name=p.get("name"),
            year=p.get("year"),
            faculty=p.get("faculty"),
            avatar_url=_public_image_url(path) if path else None,
        ))

    return result
