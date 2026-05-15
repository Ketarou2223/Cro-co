from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


REPORT_REASONS = ('不適切な写真', 'ハラスメント', 'なりすまし', 'スパム', 'その他')


class BlockRequest(BaseModel):
    blocked_id: UUID


class ReportRequest(BaseModel):
    reported_id: UUID
    reason: str = Field(..., description="通報理由")
    detail: Optional[str] = Field(None, max_length=500)


class HideRequest(BaseModel):
    hidden_id: UUID


class BlockedUserItem(BaseModel):
    id: UUID
    name: Optional[str] = None
    avatar_url: Optional[str] = None
