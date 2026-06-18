# 解説: このファイルは「チャットメッセージ」機能の API エンドポイントを定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(message.router) として登録される
# 解説: エンドポイント一覧:
#   POST /api/messages/               → メッセージを送信する（WebSocket でリアルタイム配信）
#   GET  /api/messages/{match_id}     → メッセージ一覧を取得する（ページング対応）
#   POST /api/messages/{id}/react     → メッセージにハートリアクションをつける/外す
#   POST /api/messages/{id}/read      → メッセージを既読にする
# 解説: 呼ぶ先:
#   Supabase: messages / matches / profiles / message_reactions テーブル
#   ws_manager.py: WebSocket でのリアルタイム配信（manager.broadcast）
#   push.py / email.py: 通知送信
#   block_utils.py: ブロック相手との通信を遮断
#
# 解説: 使用ライブラリ:
#   UUID = Python の UUID 型（メッセージ ID などに使う）
#   PaginatedMessagesResponse = カーソルページング（「続きを読む」方式の取得）に使うレスポンス型

import logging
from datetime import datetime, timezone, timedelta
# 解説: UUID = メッセージ ID / マッチ ID の型として使う
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from supabase_auth.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.block_utils import get_blocked_user_ids
from app.core.email import send_message_notification
from app.core.limiter import limiter
from app.core.push import send_push_to_user
from app.core.supabase_client import supabase
# 解説: manager = WebSocket 接続管理オブジェクト（送信後に全接続者にリアルタイム配信するため）
from app.core.ws_manager import manager
from app.schemas.message import MessageCreateRequest, MessageResponse, PaginatedMessagesResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messages", tags=["messages"])


# 解説: メッセージ受信プッシュ通知を送るバックグラウンドタスク関数
def _send_message_push_bg(match_row: dict, sender_id: str, content: str) -> None:
    """メッセージ受信プッシュ通知（BackgroundTask として実行）"""
    try:
        # 解説: 受信者 ID を特定する（match_row の user_a/user_b のうち送信者でない方）
        recipient_id = (
            match_row["user_b_id"] if match_row["user_a_id"] == sender_id
            else match_row["user_a_id"]
        )
        # 解説: 送信者の名前を取得してプッシュ通知に使う
        sender_res = (
            supabase.table("profiles")
            .select("name")
            .eq("id", sender_id)
            .single()
            .execute()
        )
        sender_name = (sender_res.data or {}).get("name") or "相手"
        # 解説: メッセージ本文の先頭30文字をプレビューとして使う
        preview = content[:30]
        logger.info("Message push scheduled: recipient=%s", recipient_id)
        # @copy CRO-push-message-title-01 Lv1 / CRO-push-message-body-01 Lv1
        send_push_to_user(
            recipient_id,
            "メッセージが届いた",
            f"{sender_name}: {preview}",
            # 解説: チャットページへの直リンクを通知に含める
            f"/chat/{match_row['id']}",
        )
    except Exception as e:
        logger.error("メッセージPush通知失敗 match=%s sender=%s: %s", match_row.get("id"), sender_id, e)


# 解説: メッセージ通知メールを送るバックグラウンドタスク関数（相手がオフラインの場合のみ送る）
def _send_message_notification_bg(match_row: dict, sender_id: str) -> None:
    """メッセージ通知メールを送信する（BackgroundTask として実行）"""
    try:
        # 解説: 受信者 ID を特定する
        other_id = (
            match_row["user_b_id"]
            if match_row["user_a_id"] == sender_id
            else match_row["user_a_id"]
        )
        # 解説: 受信者のメール・名前・最終アクセス時刻を取得する
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
            # 解説: last_seen_at を datetime に変換する
            last_seen = datetime.fromisoformat(last_seen_raw)
            # 解説: タイムゾーン情報がない場合は UTC とみなす
            if last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=timezone.utc)
            # 解説: 5分以内にアクセスしていればオンラインとみなす
            is_online = (datetime.now(timezone.utc) - last_seen) < timedelta(minutes=5)
        # 解説: オフラインの場合のみメール通知を送る（オンライン中はメール不要）
        if not is_online and other.get("email"):
            sender_res = (
                supabase.table("profiles")
                .select("name")
                .eq("id", sender_id)
                .single()
                .execute()
            )
            sender_name = (sender_res.data or {}).get("name") or "相手"
            send_message_notification(other["email"], sender_name)
    except Exception as e:
        logger.error("メッセージ通知メール送信失敗 match=%s sender=%s: %s", match_row.get("id"), sender_id, e)


# 解説: 承認済みユーザーかどうかを確認するヘルパ関数（全エンドポイントで共通使用）
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
            detail="学生証の審査が完了したらチャットできるよ。",
        )
    return my_id


# 解説: マッチが存在し自分がそのメンバーかどうかを確認するヘルパ関数（全エンドポイントで共通使用）
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
    # 解説: 自分が user_a でも user_b でもなければアクセス権限なし
    if row["user_a_id"] != my_id and row["user_b_id"] != my_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このマッチへのアクセス権限がありません",
        )
    # ブロック相手（双方向）とのチャットは不可。ブロック判明を伝えない中立メッセージ
    # 解説: 相手 ID を特定する（自分でない方）
    opponent_id = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]
    if opponent_id in set(get_blocked_user_ids(my_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このユーザーは利用できません",
        )
    return row


# 解説: POST /api/messages/ = メッセージを送信するエンドポイント
@router.post("/", response_model=MessageResponse)
# 解説: 1分間に30回まで（連打防止）
@limiter.limit("30/minute")
async def send_message(
    request: Request,
    body: MessageCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_active_user),
) -> MessageResponse:
    # 解説: 承認済みか確認して自分の ID を取得
    my_id = _assert_approved(current_user)
    # 解説: マッチが存在し自分がメンバーか確認してマッチ行を取得
    match_row = _assert_match_member(str(body.match_id), my_id)

    # リプライ元の検証と情報取得
    # 解説: リプライ先メッセージが指定された場合、存在確認と内容取得を行う
    reply_to_content: str | None = None
    reply_to_sender_name: str | None = None
    if body.reply_to_id:
        try:
            reply_res = (
                supabase.table("messages")
                .select("id, match_id, content, sender_id")
                .eq("id", str(body.reply_to_id))
                .single()
                .execute()
            )
        except APIError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="リプライ先のメッセージが見つかりません",
            )
        if not reply_res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="リプライ先のメッセージが見つかりません",
            )
        # 解説: リプライ先メッセージが同じマッチのものかを確認する（別チャットのメッセージへの偽リプライを防ぐ）
        if reply_res.data["match_id"] != str(body.match_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="リプライ先のメッセージがこのマッチに属していません",
            )
        # 解説: リプライ元の内容を先頭50文字に切り詰めて保存（表示用）
        reply_to_content = (reply_res.data["content"] or "")[:50]
        try:
            # 解説: リプライ元の送信者名を取得する（「～さんへの返信」表示に使う）
            sender_res = (
                supabase.table("profiles")
                .select("name")
                .eq("id", reply_res.data["sender_id"])
                .single()
                .execute()
            )
            reply_to_sender_name = (sender_res.data or {}).get("name")
        except Exception:
            pass

    # 解説: INSERT するデータを辞書として組み立てる
    insert_data: dict = {
        "match_id": str(body.match_id),
        "sender_id": my_id,
        "content": body.content,
    }
    # 解説: リプライの場合のみ reply_to_id を追加する
    if body.reply_to_id:
        insert_data["reply_to_id"] = str(body.reply_to_id)

    try:
        # 解説: messages テーブルにメッセージを INSERT する
        insert_res = (
            supabase.table("messages")
            .insert(insert_data)
            .execute()
        )
    except APIError as e:
        logger.error("メッセージの送信に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メッセージの送信に失敗しました",
        )

    # 解説: INSERT された行を取得する
    inserted = insert_res.data[0]
    # 解説: WebSocket で同じマッチの全接続者にメッセージをリアルタイム配信する
    await manager.broadcast(
        str(body.match_id),
        {
            "id": str(inserted["id"]),
            "match_id": str(inserted["match_id"]),
            "sender_id": str(inserted["sender_id"]),
            "content": inserted["content"],
            "created_at": inserted["created_at"],
            "read_at": None,
            "reaction_count": 0,
            "my_reaction": False,
            # 解説: reply_to_id が None の場合は None を入れる（UUID を str に変換）
            "reply_to_id": str(inserted["reply_to_id"]) if inserted.get("reply_to_id") else None,
            "reply_to_content": reply_to_content,
            "reply_to_sender_name": reply_to_sender_name,
        },
    )

    sender_id = my_id
    # 解説: 受信者 ID を特定する（送信者でない方）
    recipient_id = (
        match_row["user_b_id"] if match_row["user_a_id"] == my_id
        else match_row["user_a_id"]
    )
    logger.info("Message sent, scheduling push: sender=%s recipient=%s", sender_id, recipient_id)
    # 解説: バックグラウンドでメール通知とプッシュ通知を送る
    background_tasks.add_task(_send_message_notification_bg, match_row=match_row, sender_id=sender_id)
    background_tasks.add_task(_send_message_push_bg, match_row=match_row, sender_id=sender_id, content=body.content)

    return MessageResponse(
        **inserted,
        reply_to_content=reply_to_content,
        reply_to_sender_name=reply_to_sender_name,
    )


# 解説: GET /api/messages/{match_id} = メッセージ一覧をカーソルページングで取得する
# 解説: 「カーソルページング」= 「この ID より前のメッセージをN件」という形式の取得方法
#       無限スクロールの「続きを読む」に使う
@router.get("/{match_id}", response_model=PaginatedMessagesResponse)
async def get_messages(
    match_id: UUID,
    # 解説: before = このメッセージ ID より古いものを取得する（ページングのカーソル）
    before: str | None = Query(None),
    # 解説: limit = 1回に取得する件数。最大100件
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_active_user),
) -> PaginatedMessagesResponse:
    my_id = _assert_approved(current_user)
    _assert_match_member(str(match_id), my_id)

    try:
        # 解説: メッセージを新しい順（desc）で limit 件取得するクエリを組み立てる
        query = (
            supabase.table("messages")
            .select("id, match_id, sender_id, content, created_at, read_at, reply_to_id")
            .eq("match_id", str(match_id))
            .order("created_at", desc=True)
            .limit(limit)
        )

        # 解説: before が指定されている場合はそのメッセージより古いものだけに絞る
        if before:
            try:
                # 解説: before（メッセージ ID）の created_at を取得して基準日時にする
                before_res = (
                    supabase.table("messages")
                    .select("created_at")
                    .eq("id", before)
                    .single()
                    .execute()
                )
                if before_res.data:
                    # 解説: .lt = less than（より前）で絞り込む
                    query = query.lt("created_at", before_res.data["created_at"])
            except Exception:
                pass

        msgs_res = query.execute()
    except APIError as e:
        logger.error("メッセージの取得に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メッセージの取得に失敗しました",
        )

    # 解説: 取得した生データ
    raw_rows = msgs_res.data or []
    # 解説: 取得件数が limit と同じ = まだ続きがある（has_more=True）
    has_more = len(raw_rows) == limit
    # 解説: 新しい順で取得したものを古い順に反転させる（チャット画面では上が古い方）
    rows = list(reversed(raw_rows))
    msg_ids = [r["id"] for r in rows]

    # リアクション集計
    # 解説: {message_id: (count, my_reaction)} の辞書を作る
    reaction_map: dict[str, tuple[int, bool]] = {}
    if msg_ids:
        try:
            # 解説: 全メッセージのリアクションを1回のクエリで一括取得する（N+1 防止）
            reac_res = (
                supabase.table("message_reactions")
                .select("message_id, user_id")
                .in_("message_id", msg_ids)
                .execute()
            )
            for r in (reac_res.data or []):
                mid = r["message_id"]
                # 解説: 既存の (count, cur_mine) を取り出して count+1 し、自分のリアクションか判定
                cur_count, cur_mine = reaction_map.get(mid, (0, False))
                reaction_map[mid] = (cur_count + 1, cur_mine or r["user_id"] == my_id)
        except Exception:
            pass

    # リプライ情報をバッチ取得（N+1回避）
    # 解説: リプライ先メッセージの内容・送信者名をまとめて取得する
    reply_map: dict[str, dict] = {}
    # 解説: 重複を set で排除してからリプライ先 ID のリストを作る
    reply_ids = list({r["reply_to_id"] for r in rows if r.get("reply_to_id")})
    if reply_ids:
        try:
            # 解説: リプライ先メッセージを一括取得する
            reply_msgs_res = (
                supabase.table("messages")
                .select("id, content, sender_id")
                .in_("id", reply_ids)
                .execute()
            )
            # 解説: {id: message行} の辞書に変換
            reply_msgs = {r["id"]: r for r in (reply_msgs_res.data or [])}

            # 解説: リプライ元の送信者プロフィールを一括取得する
            reply_sender_ids = list({r["sender_id"] for r in reply_msgs.values()})
            profiles_map: dict[str, str | None] = {}
            if reply_sender_ids:
                profiles_res = (
                    supabase.table("profiles")
                    .select("id, name")
                    .in_("id", reply_sender_ids)
                    .execute()
                )
                profiles_map = {p["id"]: p.get("name") for p in (profiles_res.data or [])}

            # 解説: reply_map に {リプライ先ID: {content, sender_name}} を格納する
            for rid, rmsg in reply_msgs.items():
                reply_map[rid] = {
                    "content": (rmsg["content"] or "")[:50],
                    "sender_name": profiles_map.get(rmsg["sender_id"]),
                }
        except Exception:
            pass

    # 解説: 各メッセージ行を MessageResponse に変換してリストを作る
    result: list[MessageResponse] = []
    for row in rows:
        reply_id = row.get("reply_to_id")
        reply_info = reply_map.get(reply_id, {}) if reply_id else {}
        result.append(
            MessageResponse(
                **row,
                # 解説: reaction_map からリアクション数と自分のリアクションを取り出す（なければデフォルト値）
                reaction_count=reaction_map.get(row["id"], (0, False))[0],
                my_reaction=reaction_map.get(row["id"], (0, False))[1],
                reply_to_content=reply_info.get("content"),
                reply_to_sender_name=reply_info.get("sender_name"),
            )
        )

    # 解説: カーソルページングの next_cursor = 一番古いメッセージの ID（続きを読む時に before に渡す）
    next_cursor = rows[0]["id"] if has_more and rows else None
    return PaginatedMessagesResponse(messages=result, has_more=has_more, next_cursor=next_cursor)


# 解説: POST /api/messages/{message_id}/react = メッセージへのハートリアクションをトグルする
@router.post("/{message_id}/react")
@limiter.limit("60/minute")
async def react_message(
    request: Request,
    message_id: UUID,
    current_user: User = Depends(get_active_user),
) -> dict:
    my_id = _assert_approved(current_user)

    try:
        # 解説: リアクション対象のメッセージが存在するか確認する
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

    # 解説: そのメッセージのマッチに自分が属しているか確認する
    _assert_match_member(msg_res.data["match_id"], my_id)

    # 解説: 既にリアクション済みかどうかを確認する
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

    # 解説: トグル動作: リアクション済みなら削除、未リアクションなら追加
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

    # 解説: 最新のリアクション数を取得する
    try:
        count_res = (
            supabase.table("message_reactions")
            .select("user_id")
            .eq("message_id", str(message_id))
            .execute()
        )
        count = len(count_res.data or [])
    except Exception:
        # 解説: 取得失敗時は楽観的な値で返す（reacted が True なら 1、False なら 0）
        count = 1 if reacted else 0

    return {"reacted": reacted, "count": count}


# 解説: POST /api/messages/{match_id}/read = 未読メッセージを一括既読にする
@router.post("/{match_id}/read")
async def mark_read(
    match_id: UUID,
    current_user: User = Depends(get_active_user),
) -> dict:
    my_id = _assert_approved(current_user)
    _assert_match_member(str(match_id), my_id)

    # 解説: 現在の UTC 時刻を ISO 文字列として既読日時に使う
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        # 解説: 自分が受け取ったメッセージ（sender_id が自分でない）の read_at を一括更新する
        (
            supabase.table("messages")
            .update({"read_at": now_iso})
            .eq("match_id", str(match_id))
            # 解説: .neq = not equal（自分が送ったメッセージは既読対象外）
            .neq("sender_id", my_id)
            # 解説: .is_("read_at", "null") = まだ未読のメッセージのみ対象
            .is_("read_at", "null")
            .execute()
        )
    except APIError as e:
        logger.error("既読の更新に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既読の更新に失敗しました",
        )

    # 既読通知を WebSocket でリアルタイムブロードキャスト
    # 解説: 相手のチャット画面で「既読」マークがリアルタイムで更新される
    await manager.broadcast(
        str(match_id),
        {
            "type": "read_receipt",
            "reader_id": my_id,
            "match_id": str(match_id),
            "read_at": now_iso,
        },
    )

    return {"ok": True}
