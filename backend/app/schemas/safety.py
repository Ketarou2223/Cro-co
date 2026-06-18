# 解説: このファイルは「安全機能（ブロック・通報・非表示）API」で使う Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: backend/app/routers/safety.py でインポートして使う

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# 解説: REPORT_REASONS = 通報で選べる理由の定数タプル（これ以外は routers/safety.py で 400 を返す）
REPORT_REASONS = ('不適切な写真', 'ハラスメント', 'なりすまし', 'スパム', 'その他')


# 解説: BlockRequest = ブロックリクエスト本文（ブロック対象の ID のみ）
class BlockRequest(BaseModel):
    blocked_id: UUID


# 解説: ReportRequest = 通報リクエスト本文（対象 ID・理由・詳細）
class ReportRequest(BaseModel):
    reported_id: UUID
    reason: str = Field(..., description="通報理由")
    # 解説: detail = 通報の自由記述（任意・500文字以内）
    detail: Optional[str] = Field(None, max_length=500)


# 解説: HideRequest = 非表示リクエスト本文（非表示にする対象の ID のみ）
class HideRequest(BaseModel):
    hidden_id: UUID


# 解説: BlockedUserItem = ブロック一覧の1件分（相手の名前とアバター）
class BlockedUserItem(BaseModel):
    id: UUID
    name: Optional[str] = None
    # 解説: avatar_url = 署名付き URL（image_utils.get_signed_image_url() で生成）
    avatar_url: Optional[str] = None


# 解説: HiddenUserItem = 非表示一覧の1件分（BlockedUserItem と同じ形だが意味が異なる）
class HiddenUserItem(BaseModel):
    id: UUID
    name: Optional[str] = None
    avatar_url: Optional[str] = None
