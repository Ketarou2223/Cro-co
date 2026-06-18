# 解説: このファイルは「チャットメッセージ API」で使う Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: backend/app/routers/message.py でインポートして使う

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# 解説: MessageCreateRequest = メッセージ送信リクエスト本文
class MessageCreateRequest(BaseModel):
    # 解説: match_id = メッセージを送るチャットルームの ID（matches テーブルの主キー）
    match_id: UUID
    # 解説: content = メッセージ本文（1〜1000文字）
    content: str = Field(min_length=1, max_length=1000)
    # 解説: reply_to_id = 返信元メッセージの ID（返信なしの場合は None）
    reply_to_id: Optional[UUID] = None


# 解説: MessageResponse = メッセージ1件のレスポンス（リアクション・返信情報付き）
class MessageResponse(BaseModel):
    id: UUID
    match_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    # 解説: read_at = 相手がメッセージを読んだ日時（None = 未読）
    read_at: Optional[datetime] = None
    # 解説: reaction_count = このメッセージへのリアクション（ハート）の合計数
    reaction_count: int = 0
    # 解説: my_reaction = 自分がこのメッセージにリアクション済みかどうか
    my_reaction: bool = False
    reply_to_id: Optional[UUID] = None
    # 解説: reply_to_content = 返信元メッセージの本文（プレビュー表示用）
    reply_to_content: Optional[str] = None
    # 解説: reply_to_sender_name = 返信元メッセージの送信者名（プレビュー表示用）
    reply_to_sender_name: Optional[str] = None


# 解説: PaginatedMessagesResponse = カーソルページネーション付きメッセージ一覧レスポンス
class PaginatedMessagesResponse(BaseModel):
    messages: list[MessageResponse]
    # 解説: has_more = True のとき次ページが存在する（「もっと読み込む」ボタンの表示判定）
    has_more: bool
    # 解説: next_cursor = 次ページ取得時に cursor パラメータとして渡す値（created_at の ISO 文字列）
    next_cursor: Optional[str] = None
