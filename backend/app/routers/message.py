import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.email import send_message_notification
from app.core.supabase_client import supabase
from app.schemas.message import MessageCreateRequest, MessageResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _assert_approved(current_user: User) -> str:
    """承認済みユーザーであることを確認し my_id を返す"""
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )
    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="承認済みユーザーのみアクセスできます",
        )
    return my_id


def _assert_match_member(match_id: str, my_id: str) -> dict:
    """match_id が存在し自分がメンバーであることを確認して matches 行を返す"""
    try:
        match_res = (
            supabase.table("matches")
            .select("id, user_a_id, user_b_id")
            .eq("id", match_id)
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
    return row


@router.post("/", response_model=MessageResponse)
async def send_message(
    body: MessageCreateRequest,
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    my_id = _assert_approved(current_user)
    match_row = _assert_match_member(str(body.match_id), my_id)

    try:
        insert_res = (
            supabase.table("messages")
            .insert({
                "match_id": str(body.match_id),
                "sender_id": my_id,
                "content": body.content,
            })
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メッセージの送信に失敗しました: {e.message}",
        )

    try:
        other_id = (
            match_row["user_b_id"]
            if match_row["user_a_id"] == my_id
            else match_row["user_a_id"]
        )
        other_res = (
            supabase.table("profiles")
            .select("email, name, last_seen_at")
            .eq("id", other_id)
            .single()
            .execute()
        )
        other = other_res.data or {}
        last_seen_raw: str | None = other.get("last_seen_at")
        is_online = False
        if last_seen_raw:
            last_seen = datetime.fromisoformat(last_seen_raw)
            if last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=timezone.utc)
            is_online = (datetime.now(timezone.utc) - last_seen) < timedelta(minutes=5)

        if not is_online and other.get("email"):
            my_res = (
                supabase.table("profiles")
                .select("name")
                .eq("id", my_id)
                .single()
                .execute()
            )
            my_name = (my_res.data or {}).get("name") or "相手"
            send_message_notification(other["email"], my_name)
    except Exception as e:
        logger.error("メッセージ通知メール送信中にエラー: %s", e)

    return MessageResponse(**insert_res.data[0])


@router.get("/{match_id}", response_model=list[MessageResponse])
async def get_messages(
    match_id: UUID,
    current_user: User = Depends(get_current_user),
) -> list[MessageResponse]:
    my_id = _assert_approved(current_user)
    _assert_match_member(str(match_id), my_id)

    try:
        msgs_res = (
            supabase.table("messages")
            .select("id, match_id, sender_id, content, created_at, read_at")
            .eq("match_id", str(match_id))
            .order("created_at", desc=False)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メッセージの取得に失敗しました: {e.message}",
        )

    rows = msgs_res.data or []
    msg_ids = [r["id"] for r in rows]

    # リアクション集計
    reaction_map: dict[str, tuple[int, bool]] = {}
    if msg_ids:
        try:
            reac_res = (
                supabase.table("message_reactions")
                .select("message_id, user_id")
                .in_("message_id", msg_ids)
                .execute()
            )
            for r in (reac_res.data or []):
                mid = r["message_id"]
                cur_count, cur_mine = reaction_map.get(mid, (0, False))
                reaction_map[mid] = (cur_count + 1, cur_mine or r["user_id"] == my_id)
        except Exception:
            pass

    return [
        MessageResponse(
            **row,
            reaction_count=reaction_map.get(row["id"], (0, False))[0],
            my_reaction=reaction_map.get(row["id"], (0, False))[1],
        )
        for row in rows
    ]


@router.post("/{message_id}/react")
async def react_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
) -> dict:
    my_id = _assert_approved(current_user)

    # メッセージが存在するか確認
    try:
        msg_res = (
            supabase.table("messages")
            .select("match_id")
            .eq("id", str(message_id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="メッセージが見つかりません")

    if not msg_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="メッセージが見つかりません")

    # 自分のマッチ内メッセージか確認
    _assert_match_member(msg_res.data["match_id"], my_id)

    # 既存リアクション確認
    reacted = False
    try:
        existing = (
            supabase.table("message_reactions")
            .select("user_id")
            .eq("message_id", str(message_id))
            .eq("user_id", my_id)
            .single()
            .execute()
        )
        reacted = existing.data is not None
    except APIError:
        reacted = False

    if reacted:
        supabase.table("message_reactions").delete().eq("message_id", str(message_id)).eq("user_id", my_id).execute()
        reacted = False
    else:
        supabase.table("message_reactions").insert({
            "message_id": str(message_id),
            "user_id": my_id,
            "reaction": "heart",
        }).execute()
        reacted = True

    try:
        count_res = (
            supabase.table("message_reactions")
            .select("user_id")
            .eq("message_id", str(message_id))
            .execute()
        )
        count = len(count_res.data or [])
    except Exception:
        count = 1 if reacted else 0

    return {"reacted": reacted, "count": count}


@router.post("/{match_id}/read")
async def mark_read(
    match_id: UUID,
    current_user: User = Depends(get_current_user),
) -> dict:
    my_id = _assert_approved(current_user)
    _assert_match_member(str(match_id), my_id)

    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        (
            supabase.table("messages")
            .update({"read_at": now_iso})
            .eq("match_id", str(match_id))
            .neq("sender_id", my_id)
            .is_("read_at", "null")
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"既読の更新に失敗しました: {e.message}",
        )

    return {"ok": True}
