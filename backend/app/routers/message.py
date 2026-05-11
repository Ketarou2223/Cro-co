from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.message import MessageCreateRequest, MessageResponse

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
    _assert_match_member(str(body.match_id), my_id)

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
            .select("id, match_id, sender_id, content, created_at")
            .eq("match_id", str(match_id))
            .order("created_at", desc=False)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メッセージの取得に失敗しました: {e.message}",
        )

    return [MessageResponse(**row) for row in (msgs_res.data or [])]
