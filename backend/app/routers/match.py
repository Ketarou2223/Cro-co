import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.auth.approved_user import get_approved_user
from app.core.block_utils import get_blocked_user_ids
from app.core.image_utils import get_signed_image_url
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.schemas.match import MatchedUserItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("/", response_model=list[MatchedUserItem])
async def list_matches(
    current_user: User = Depends(get_approved_user),
) -> list[MatchedUserItem]:
    my_id = str(current_user.id)

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
        logger.error("マッチ一覧の取得に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="マッチ一覧の取得に失敗しました",
        )

    rows = matches_res.data or []
    if not rows:
        return []

    # ブロック相手（双方向）をマッチ一覧から除外
    blocked_ids = set(get_blocked_user_ids(my_id))

    # 相手の user_id と matched_at, match_id を紐付けるマップを作成
    opponent_to_matched_at: dict[str, str] = {}
    opponent_to_match_id: dict[str, str] = {}
    for row in rows:
        opponent_id = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]
        if opponent_id in blocked_ids:
            continue
        opponent_to_matched_at[opponent_id] = row["created_at"]
        opponent_to_match_id[opponent_id] = row["id"]

    opponent_ids = list(opponent_to_matched_at.keys())
    if not opponent_ids:
        return []

    # 相手プロフィールをバッチ取得（N+1回避）
    try:
        profiles_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, bio, profile_image_path, status")
            .in_("id", opponent_ids)
            .execute()
        )
    except APIError as e:
        logger.error("プロフィールの取得に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロフィールの取得に失敗しました",
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

        # 実退会では matches が CASCADE 削除されるためここに到達しない。seed データ（auth.users 残置）のみ動作。IDEAS「ブロック時のデータ物理削除」実装時に去就を決めること
        is_deleted = p.get("status") == "deleted"
        # profile_image_path は approved 写真のみ不変条件（W1〜W4 で担保・[8.3]）
        path: str | None = p.get("profile_image_path") if not is_deleted else None
        avatar_url: str | None = get_signed_image_url(path) if path else None

        result.append(
            MatchedUserItem(
                match_id=opponent_to_match_id[opponent_id],
                user_id=p["id"],
                name=None if is_deleted else p.get("name"),
                year=None if is_deleted else p.get("year"),
                faculty=None if is_deleted else p.get("faculty"),
                bio=None if is_deleted else p.get("bio"),
                avatar_url=avatar_url,
                matched_at=opponent_to_matched_at[opponent_id],
                is_deleted=is_deleted,
            )
        )

    return result


@router.get("/unread-count")
@limiter.limit("60/minute")
async def get_unread_count(
    request: Request,
    current_user: User = Depends(get_active_user),
) -> dict:
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
        return {"unread_messages": 0, "unread_matches": 0, "unread_views": 0, "unread_likes_received": 0}

    if not me_res.data or me_res.data.get("status") != "approved":
        return {"unread_messages": 0, "unread_matches": 0, "unread_views": 0, "unread_likes_received": 0}

    # ブロック相手（双方向）を全カウントから除外
    blocked_ids = set(get_blocked_user_ids(my_id))

    matches_res = (
        supabase.table("matches")
        .select("id, user_a_id, user_b_id")
        .or_(f"user_a_id.eq.{my_id},user_b_id.eq.{my_id}")
        .execute()
    )
    match_ids: list[str] = []
    matched_user_ids: set[str] = set()
    for row in (matches_res.data or []):
        other = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]
        if other in blocked_ids:
            continue
        match_ids.append(row["id"])
        matched_user_ids.add(other)

    if not match_ids:
        # マッチなしでも likes/views は集計する
        unread_views = 0
        unread_likes_received = 0
        try:
            views_q = (
                supabase.table("profile_views")
                .select("viewer_id", count="exact")
                .eq("viewed_id", my_id)
                .is_("confirmed_at", "null")
            )
            if blocked_ids:
                views_q = views_q.not_.in_("viewer_id", list(blocked_ids))
            views_res = views_q.execute()
            unread_views = views_res.count or 0
        except Exception:
            pass
        try:
            likes_q = (
                supabase.table("likes")
                .select("liker_id", count="exact")
                .eq("liked_id", my_id)
                .is_("receiver_read_at", "null")
            )
            if blocked_ids:
                likes_q = likes_q.not_.in_("liker_id", list(blocked_ids))
            lr = likes_q.execute()
            unread_likes_received = lr.count or 0
        except Exception:
            pass
        return {"unread_messages": 0, "unread_matches": 0, "unread_views": unread_views, "unread_likes_received": unread_likes_received}

    # 未読メッセージ数
    unread_res = (
        supabase.table("messages")
        .select("id", count="exact")
        .in_("match_id", match_ids)
        .neq("sender_id", my_id)
        .is_("read_at", "null")
        .execute()
    )
    unread_messages = unread_res.count or 0

    # メッセージ0件のマッチ数
    all_msgs_res = (
        supabase.table("messages")
        .select("match_id")
        .in_("match_id", match_ids)
        .execute()
    )
    match_ids_with_msgs = {row["match_id"] for row in (all_msgs_res.data or [])}
    unread_matches = max(0, len(match_ids) - len(match_ids_with_msgs))

    # 未確認の足跡数（ブロック相手を除外）
    unread_views = 0
    try:
        views_q = (
            supabase.table("profile_views")
            .select("viewer_id", count="exact")
            .eq("viewed_id", my_id)
            .is_("confirmed_at", "null")
        )
        if blocked_ids:
            views_q = views_q.not_.in_("viewer_id", list(blocked_ids))
        views_res = views_q.execute()
        unread_views = views_res.count or 0
    except Exception:
        pass

    # 未既読のいいね受信数（マッチ済み・ブロック相手を除外）
    unread_likes_received = 0
    try:
        q = (
            supabase.table("likes")
            .select("liker_id", count="exact")
            .eq("liked_id", my_id)
            .is_("receiver_read_at", "null")
        )
        excluded_likers = matched_user_ids | blocked_ids
        if excluded_likers:
            q = q.not_.in_("liker_id", list(excluded_likers))
        lr = q.execute()
        unread_likes_received = lr.count or 0
    except Exception:
        pass

    return {
        "unread_messages": unread_messages,
        "unread_matches": unread_matches,
        "unread_views": unread_views,
        "unread_likes_received": unread_likes_received,
    }


@router.get("/{match_id}", response_model=MatchedUserItem)
async def get_match(
    match_id: UUID,
    current_user: User = Depends(get_approved_user),
) -> MatchedUserItem:
    my_id = str(current_user.id)

    try:
        match_res = (
            supabase.table("matches")
            .select("id, user_a_id, user_b_id, created_at")
            .eq("id", str(match_id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="マッチが見つかりません",
        )

    row = match_res.data
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="マッチが見つかりません",
        )
    if row["user_a_id"] != my_id and row["user_b_id"] != my_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このマッチへのアクセス権限がありません",
        )

    opponent_id = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]

    # ブロック相手（双方向）なら中立メッセージで 403
    if opponent_id in set(get_blocked_user_ids(my_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このユーザーは利用できません",
        )

    try:
        profile_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, bio, profile_image_path, status")
            .eq("id", opponent_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="相手のプロフィールが見つかりません",
        )

    p = profile_res.data
    is_deleted = p.get("status") == "deleted" if p else False
    # profile_image_path は approved 写真のみ不変条件（W1〜W4 で担保・[8.3]）
    path: str | None = p.get("profile_image_path") if (p and not is_deleted) else None
    avatar_url: str | None = get_signed_image_url(path) if path else None

    return MatchedUserItem(
        match_id=row["id"],
        user_id=p["id"],
        name=None if is_deleted else p.get("name"),
        year=None if is_deleted else p.get("year"),
        faculty=None if is_deleted else p.get("faculty"),
        bio=None if is_deleted else p.get("bio"),
        avatar_url=avatar_url,
        matched_at=row["created_at"],
        is_deleted=is_deleted,
    )

