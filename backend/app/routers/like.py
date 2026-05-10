from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.like import LikeCreateRequest, LikeResponse

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

    # チェック4: 既存のいいねを確認（冪等な動作）
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
            return LikeResponse(**existing_res.data)
    except APIError:
        pass  # 行が存在しない場合は APIError → そのまま INSERT へ

    # INSERT
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
                return LikeResponse(**fallback_res.data)
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

    return LikeResponse(**insert_res.data[0])
