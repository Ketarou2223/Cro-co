# 解説: このファイルは「マッチ API」で使う Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: backend/app/routers/match.py でインポートして使う
# 解説: 「マッチ」= 双方がいいねを送り合い、チャットができる状態

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel


# 解説: LastMessagePreview = マッチ一覧に表示する最終メッセージのプレビュー（送信者問わず最新1件）
class LastMessagePreview(BaseModel):
    content: str
    created_at: datetime
    # 解説: is_mine = True のとき自分が送ったメッセージ
    is_mine: bool


# 解説: MatchedUserItem = マッチ一覧の1件分（相手のプロフィール情報 + マッチ日時）
class MatchedUserItem(BaseModel):
    # 解説: match_id = matches テーブルの主キー（チャット画面への遷移に使う）
    match_id: UUID
    # 解説: user_id = マッチ相手のユーザー ID
    user_id: UUID
    name: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    bio: Optional[str] = None
    # 解説: avatar_url = 署名付き URL（image_utils.get_signed_image_url() で生成）
    avatar_url: Optional[str] = None
    matched_at: datetime
    # 解説: is_deleted = True のとき相手が退会済み（名前・アバターは匿名表示になる）
    is_deleted: bool = False
    # 解説: last_message = 最終メッセージプレビュー（0件なら null）
    last_message: Optional[LastMessagePreview] = None
    # 解説: last_activity_at = COALESCE(last_message.created_at, matched_at)。並び替えキー
    last_activity_at: datetime
    # 解説: unread_count = 相手→自分の未読メッセージ数（read_at IS NULL）
    unread_count: int = 0
