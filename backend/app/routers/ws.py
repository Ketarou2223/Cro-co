# 解説: このファイルは「リアルタイムチャット用 WebSocket」エンドポイントを定義する。
# 解説: 「WebSocket」= ブラウザとサーバーが双方向で常時接続する仕組み。
#       チャット画面を開いている間は接続が維持され、メッセージが即時に届く。
# 解説: 呼ばれる場所: main.py で app.include_router(ws.router) として登録される
# 解説: エンドポイント: WS /ws/chat/{match_id} → チャット部屋に接続する
# 解説: 呼ぶ先:
#   Supabase: profiles / matches テーブル（認証・参加確認）
#   block_utils.py: ブロック相手の接続を拒否
#   ws_manager.py: ConnectionManager（接続管理・ブロードキャスト）
#
# 解説: 認証方法:
#   HTTP とは異なり WebSocket では Authorization ヘッダーが使えない。
#   代わりに Sec-WebSocket-Protocol ヘッダーに JWT トークンを入れて送る。
#   サーバー側は supabase.auth.get_user(token) でトークンを検証する。
#
# 解説: クローズコード:
#   4001 = 認証失敗 / 4003 = 権限なし / 4004 = マッチ未発見
#   1008 = ポリシー違反（ブロック相手・接続数超過）

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.block_utils import get_blocked_user_ids
from app.core.ws_manager import manager
from app.core.supabase_client import supabase
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# 解説: WS /ws/chat/{match_id} = 指定マッチのチャット部屋に WebSocket で接続する
@router.websocket("/ws/chat/{match_id}")
async def websocket_chat(
    match_id: str,
    websocket: WebSocket,
):
    # JWT認証（Sec-WebSocket-Protocol ヘッダで受け取り・URLクエリ非使用）
    # 解説: URL にトークンを含めるとブラウザ履歴・ログに残るため、ヘッダー経由で受け取る
    token = websocket.headers.get("sec-websocket-protocol", "")
    if not token:
        await websocket.close(code=4001, reason="Not authenticated")
        return
    try:
        # 解説: Supabase の get_user() でトークンを検証し、ユーザー ID を取得する
        user_resp = supabase.auth.get_user(token)
        user_id = str(user_resp.user.id)
    except Exception:
        await websocket.close(code=4001, reason="Not authenticated")
        return

    # BAN/削除済みユーザーの接続を拒否
    # 解説: approved 以外（BAN / deleted / pending 等）は接続させない
    try:
        prof = (
            supabase.table("profiles")
            .select("status")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except Exception:
        await websocket.close(code=4003, reason="Forbidden")
        return
    if not prof.data or prof.data.get("status") != "approved":
        await websocket.close(code=4003, reason="Forbidden")
        return

    # マッチ参加者確認
    # 解説: 指定マッチが存在し、かつ自分がそのメンバーかどうかを確認する
    try:
        match = (
            supabase.table("matches")
            .select("user_a_id, user_b_id")
            .eq("id", match_id)
            .single()
            .execute()
        )
        m = match.data
        # 解説: 自分が user_a でも user_b でもなければアクセス権限なし
        if m["user_a_id"] != user_id and m["user_b_id"] != user_id:
            await websocket.close(code=4003, reason="Forbidden")
            return
    except Exception:
        await websocket.close(code=4004, reason="Match not found")
        return

    # ブロック相手（双方向）との接続を拒否
    # 解説: 相手 ID を特定する（自分でない方）
    opponent_id = m["user_b_id"] if m["user_a_id"] == user_id else m["user_a_id"]
    if opponent_id in set(get_blocked_user_ids(user_id)):
        # 解説: 1008 = Policy Violation（ブロック相手との接続禁止）
        await websocket.close(code=1008, reason="Forbidden")
        return

    # 接続登録（上限超過時は 1008 で拒否）
    # 解説: subprotocol=token = 同じトークンを Sec-WebSocket-Protocol として返す（ブラウザが要求する仕様）
    accepted = await manager.connect(match_id, websocket, subprotocol=token)
    if not accepted:
        await websocket.close(code=1008, reason="Too many connections")
        return
    try:
        # 解説: 接続が維持されている間は無限ループでメッセージを受け取る
        while True:
            # 解説: receive_text() = クライアントからのテキストメッセージを待つ（ブロッキング）
            data = await websocket.receive_text()
            if data == "ping":
                # 解説: ping/pong = 接続が生きているかの死活確認
                await websocket.send_text("pong")
            elif data.startswith("typing:start:"):
                # 解説: "typing:start:{match_id}" = 相手が入力中になったことを通知する
                mid = data[len("typing:start:"):]
                if mid == match_id:
                    # 解説: exclude=websocket = 送信者本人には送らない（自分に送り返さない）
                    await manager.broadcast(
                        match_id,
                        {"type": "typing", "sender_id": user_id, "is_typing": True},
                        exclude=websocket,
                    )
            elif data.startswith("typing:stop:"):
                # 解説: "typing:stop:{match_id}" = 相手が入力をやめたことを通知する
                mid = data[len("typing:stop:"):]
                if mid == match_id:
                    await manager.broadcast(
                        match_id,
                        {"type": "typing", "sender_id": user_id, "is_typing": False},
                        exclude=websocket,
                    )
    except WebSocketDisconnect:
        # 解説: WebSocketDisconnect = ブラウザが接続を閉じた時に発生する例外
        # 解説: disconnect() = ConnectionManager から自分の接続を削除する
        manager.disconnect(match_id, websocket)
