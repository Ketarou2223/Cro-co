# 解説: このファイルは「マッチ」機能の API エンドポイントを定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(match.router) として登録される
# 解説: エンドポイント一覧:
#   GET /api/matches/              → 自分のマッチ一覧を取得する
#   GET /api/matches/unread-count  → 未読数（メッセージ / マッチ / 足跡 / いいね受信）を返す
#   GET /api/matches/{match_id}    → 特定のマッチ詳細を取得する
# 解説: 呼ぶ先:
#   Supabase: matches / profiles / messages / profile_views / likes テーブル
#   block_utils.py: ブロック相手を除外
#   image_utils.py: プロフィール画像の署名付き URL 生成

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from supabase_auth.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.auth.approved_user import get_approved_user
from app.core.block_utils import get_blocked_user_ids
from app.core.image_utils import get_signed_image_url
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.schemas.match import LastMessagePreview, MatchedUserItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/matches", tags=["matches"])


# 解説: GET /api/matches/ = 自分が関わる全マッチを一覧で返す
@router.get("/", response_model=list[MatchedUserItem])
async def list_matches(
    current_user: User = Depends(get_approved_user),
) -> list[MatchedUserItem]:
    my_id = str(current_user.id)

    # 自分が関わるマッチを全件取得（OR フィルタ）
    # 解説: user_a_id または user_b_id が自分 ID のマッチを全て取得する
    try:
        matches_res = (
            supabase.table("matches")
            .select("id, user_a_id, user_b_id, created_at")
            # 解説: .or_(...) = user_a_id が自分 OR user_b_id が自分
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
    # 解説: {相手ID: マッチ日時} と {相手ID: マッチID} の辞書を作る（後のプロフィール取得に使う）
    opponent_to_matched_at: dict[str, str] = {}
    opponent_to_match_id: dict[str, str] = {}
    for row in rows:
        # 解説: user_a と user_b のうち自分でない方が「相手」
        opponent_id = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]
        if opponent_id in blocked_ids:
            continue
        opponent_to_matched_at[opponent_id] = row["created_at"]
        opponent_to_match_id[opponent_id] = row["id"]

    opponent_ids = list(opponent_to_matched_at.keys())
    if not opponent_ids:
        return []

    # 相手プロフィールをバッチ取得（N+1回避）
    # 解説: 全相手のプロフィールを1回のクエリで取得する（1人ずつ取ると N+1 問題になる）
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

    # 解説: {id: profile辞書} に変換して高速参照できるようにする
    profiles_by_id: dict[str, dict] = {
        p["id"]: p for p in (profiles_res.data or [])
    }

    # 各マッチの最新メッセージ・未読数を個別クエリで取得（β規模前提 2×N）
    # 将来最適化: 件数増時は DISTINCT ON + グループ集計の RPC 化（IDEAS 参照）
    match_id_to_last_msg: dict[str, LastMessagePreview | None] = {}
    match_id_to_unread: dict[str, int] = {}
    for opponent_id in opponent_ids:
        mid = opponent_to_match_id[opponent_id]
        last_msg: LastMessagePreview | None = None
        unread = 0
        try:
            msg_res = (
                supabase.table("messages")
                .select("content, created_at, sender_id")
                .eq("match_id", mid)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if msg_res.data:
                row = msg_res.data[0]
                last_msg = LastMessagePreview(
                    content=row["content"],
                    created_at=row["created_at"],
                    is_mine=(row["sender_id"] == my_id),
                )
        except Exception:
            pass
        try:
            unread_res = (
                supabase.table("messages")
                .select("id", count="exact")
                .eq("match_id", mid)
                .eq("sender_id", opponent_id)
                .is_("read_at", "null")
                .execute()
            )
            unread = unread_res.count or 0
        except Exception:
            pass
        match_id_to_last_msg[mid] = last_msg
        match_id_to_unread[mid] = unread

    # 結果を組み立て → last_activity_at 降順でソート
    result: list[MatchedUserItem] = []
    for opponent_id in opponent_ids:
        p = profiles_by_id.get(opponent_id)
        if p is None:
            continue

        # 実退会では matches が CASCADE 削除されるためここに到達しない。seed データ（auth.users 残置）のみ動作。IDEAS「ブロック時のデータ物理削除」実装時に去就を決めること
        # 解説: status = "deleted" = 退会済みユーザー（名前・写真を表示しない）
        is_deleted = p.get("status") == "deleted"
        # profile_image_path は approved 写真のみ不変条件（W1〜W4 で担保・[8.3]）
        # 解説: 退会済みの場合は画像を表示しない
        path: str | None = p.get("profile_image_path") if not is_deleted else None
        avatar_url: str | None = get_signed_image_url(path) if path else None

        mid = opponent_to_match_id[opponent_id]
        last_msg = match_id_to_last_msg.get(mid)
        unread = match_id_to_unread.get(mid, 0)
        matched_at_str = opponent_to_matched_at[opponent_id]
        # 解説: last_activity_at = 最終メッセージ日時 or マッチ成立日時（並び替えキー）
        last_activity_at = last_msg.created_at if last_msg else matched_at_str

        # 解説: MatchedUserItem を組み立てて result に追加する
        result.append(
            MatchedUserItem(
                match_id=mid,
                user_id=p["id"],
                # 解説: 退会済みユーザーは名前・年・学部・自己紹介を非表示（None）にする
                name=None if is_deleted else p.get("name"),
                year=None if is_deleted else p.get("year"),
                faculty=None if is_deleted else p.get("faculty"),
                bio=None if is_deleted else p.get("bio"),
                avatar_url=avatar_url,
                matched_at=matched_at_str,
                is_deleted=is_deleted,
                last_message=last_msg,
                last_activity_at=last_activity_at,
                unread_count=unread,
            )
        )

    # last_activity_at 降順でソート（要件6）
    result.sort(key=lambda x: x.last_activity_at, reverse=True)
    return result


# 解説: GET /api/matches/unread-count = 未読数の集計（メッセージ / マッチ / 足跡 / いいね受信）
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

    # 解説: approved でなければ全て 0 を返す（審査中は未読バッジを出さない）
    if not me_res.data or me_res.data.get("status") != "approved":
        return {"unread_messages": 0, "unread_matches": 0, "unread_views": 0, "unread_likes_received": 0}

    # ブロック相手（双方向）を全カウントから除外
    blocked_ids = set(get_blocked_user_ids(my_id))

    # 解説: 自分が関わるマッチを全件取得する
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
        # 解説: ブロック相手のマッチは除外する
        if other in blocked_ids:
            continue
        match_ids.append(row["id"])
        matched_user_ids.add(other)

    if not match_ids:
        # マッチなしでも likes/views は集計する
        # 解説: マッチがなくても足跡数・いいね受信数はカウントする
        unread_views = 0
        unread_likes_received = 0
        try:
            # 解説: confirmed_at が NULL = まだ確認していない足跡をカウントする
            views_q = (
                supabase.table("profile_views")
                .select("viewer_id", count="exact")
                .eq("viewed_id", my_id)
                .is_("confirmed_at", "null")
            )
            if blocked_ids:
                # 解説: ブロック相手の足跡は除外する
                views_q = views_q.not_.in_("viewer_id", list(blocked_ids))
            views_res = views_q.execute()
            unread_views = views_res.count or 0
        except Exception:
            pass
        try:
            # 解説: receiver_read_at が NULL = まだ既読にしていないいいね受信をカウントする
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
    # 解説: 自分が受信者（sender_id が自分でない）かつ未読（read_at が NULL）のメッセージ数
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
    # 解説: 「新しいマッチ」= マッチしたがまだメッセージが1件もないもの
    all_msgs_res = (
        supabase.table("messages")
        .select("match_id")
        .in_("match_id", match_ids)
        .execute()
    )
    # 解説: メッセージがあるマッチの ID 集合
    match_ids_with_msgs = {row["match_id"] for row in (all_msgs_res.data or [])}
    # 解説: メッセージなしのマッチ数 = 全マッチ数 - メッセージありのマッチ数（0以下にはしない）
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
        # 解説: マッチ済みの相手（matched_user_ids）とブロック相手（blocked_ids）の両方を除外
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


# 解説: GET /api/matches/{match_id} = 特定のマッチ詳細（相手のプロフィール）を返す
@router.get("/{match_id}", response_model=MatchedUserItem)
async def get_match(
    match_id: UUID,
    current_user: User = Depends(get_approved_user),
) -> MatchedUserItem:
    my_id = str(current_user.id)

    try:
        # 解説: 指定されたマッチ ID の行を取得する
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
    # 解説: 自分がそのマッチのメンバーでなければ 403
    if row["user_a_id"] != my_id and row["user_b_id"] != my_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このマッチへのアクセス権限がありません",
        )

    # 解説: 相手 ID を特定する
    opponent_id = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]

    # ブロック相手（双方向）なら中立メッセージで 403
    if opponent_id in set(get_blocked_user_ids(my_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このユーザーは利用できません",
        )

    try:
        # 解説: 相手のプロフィールを取得する
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
        last_message=None,
        last_activity_at=row["created_at"],
        unread_count=0,
    )
