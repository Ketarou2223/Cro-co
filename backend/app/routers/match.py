from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.match import MatchedUserItem

_AVATAR_SIGNED_URL_SECONDS = 300  # 5分

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("/", response_model=list[MatchedUserItem])
async def list_matches(
    current_user: User = Depends(get_current_user),
) -> list[MatchedUserItem]:
    my_id = str(current_user.id)

    # 自分が approved か確認
    try:
        me_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", my_id)
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

    # 自分が関わるマッチを全件取得（OR フィルタ）
    try:
        matches_res = (
            supabase.table("matches")
            .select("id, user_a_id, user_b_id, created_at")
            .or_(f"user_a_id.eq.{my_id},user_b_id.eq.{my_id}")
            .order("created_at", desc=True)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"マッチ一覧の取得に失敗しました: {e.message}",
        )

    rows = matches_res.data or []
    if not rows:
        return []

    # 相手の user_id と matched_at, match_id を紐付けるマップを作成
    opponent_to_matched_at: dict[str, str] = {}
    opponent_to_match_id: dict[str, str] = {}
    for row in rows:
        opponent_id = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]
        opponent_to_matched_at[opponent_id] = row["created_at"]
        opponent_to_match_id[opponent_id] = row["id"]

    opponent_ids = list(opponent_to_matched_at.keys())

    # 相手プロフィールをバッチ取得（N+1回避）
    try:
        profiles_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, bio, profile_image_path")
            .in_("id", opponent_ids)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"プロフィールの取得に失敗しました: {e.message}",
        )

    profiles_by_id: dict[str, dict] = {
        p["id"]: p for p in (profiles_res.data or [])
    }

    # matched_at の降順を維持しながら結果を組み立て
    result: list[MatchedUserItem] = []
    for opponent_id in opponent_ids:
        p = profiles_by_id.get(opponent_id)
        if p is None:
            continue

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
            MatchedUserItem(
                match_id=opponent_to_match_id[opponent_id],
                user_id=p["id"],
                name=p.get("name"),
                year=p.get("year"),
                faculty=p.get("faculty"),
                bio=p.get("bio"),
                avatar_url=avatar_url,
                matched_at=opponent_to_matched_at[opponent_id],
            )
        )

    return result
