from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.ws_manager import manager
from app.core.supabase_client import supabase
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/chat/{match_id}")
async def websocket_chat(
    match_id: str,
    websocket: WebSocket,
    token: str = Query(...),
):
    # JWT認証（WebSocketはヘッダー送信不可のためクエリパラメータで受け取る）
    try:
        user_resp = supabase.auth.get_user(token)
        user_id = str(user_resp.user.id)
    except Exception:
        await websocket.close(code=4001, reason="Not authenticated")
        return

    # マッチ参加者確認
    try:
        match = (
            supabase.table("matches")
            .select("user_a_id, user_b_id")
            .eq("id", match_id)
            .single()
            .execute()
        )
        m = match.data
        if m["user_a_id"] != user_id and m["user_b_id"] != user_id:
            await websocket.close(code=4003, reason="Forbidden")
            return
    except Exception:
        await websocket.close(code=4004, reason="Match not found")
        return

    # 接続登録
    await manager.connect(match_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            elif data.startswith("typing:start:"):
                mid = data[len("typing:start:"):]
                if mid == match_id:
                    await manager.broadcast(
                        match_id,
                        {"type": "typing", "sender_id": user_id, "is_typing": True},
                        exclude=websocket,
                    )
            elif data.startswith("typing:stop:"):
                mid = data[len("typing:stop:"):]
                if mid == match_id:
                    await manager.broadcast(
                        match_id,
                        {"type": "typing", "sender_id": user_id, "is_typing": False},
                        exclude=websocket,
                    )
    except WebSocketDisconnect:
        manager.disconnect(match_id, websocket)
