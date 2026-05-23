from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class InquiryCreateRequest(BaseModel):
    category: str = Field(pattern="^(bug|feature|account|report|other)$")
    subject: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1, max_length=2000)


class InquiryUserItem(BaseModel):
    """ユーザー自身が見る用（admin_note は含まない）"""
    id: UUID
    category: str
    subject: str
    body: str
    status: str
    admin_reply: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: datetime


class InquiryItem(BaseModel):
    """管理者用（全フィールド）"""
    id: UUID
    user_id: UUID
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    category: str
    subject: str
    body: str
    status: str
    admin_reply: Optional[str] = None
    admin_note: Optional[str] = None
    replied_at: Optional[datetime] = None
    replied_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
