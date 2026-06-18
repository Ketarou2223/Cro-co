# 解説: このファイルは「通知 API」で使う Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: backend/app/routers/notifications.py でインポートして使う
# 解説: 通知タイプ（type フィールド）: like / match / message / admin_warning 等

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# 解説: NotificationItem = 通知1件のデータ（送信者情報・内容プレビュー付き）
class NotificationItem(BaseModel):
    id: UUID
    # 解説: type = 通知の種類（like / match / message / admin_warning 等）
    type: str
    # 解説: from_user_id = 通知を発生させたユーザーの ID（システム通知は None）
    from_user_id: Optional[UUID] = None
    # 解説: from_user_name / from_user_avatar は routers/notifications.py で profiles テーブルから付加する
    from_user_name: Optional[str] = None
    from_user_avatar: Optional[str] = None
    # 解説: match_id = マッチ通知の場合はチャット画面に遷移するために使う
    match_id: Optional[UUID] = None
    # 解説: message_preview = メッセージ通知の場合の文章プレビュー（先頭30文字程度）
    message_preview: Optional[str] = None
    # 解説: read_at = None のとき未読。read_at がある場合は既読
    read_at: Optional[datetime] = None
    created_at: datetime
