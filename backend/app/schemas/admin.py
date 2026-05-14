from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ReportItem(BaseModel):
    id: UUID
    reporter_id: UUID
    reporter_name: Optional[str] = None
    reported_id: UUID
    reported_name: Optional[str] = None
    reason: str
    detail: Optional[str] = None
    created_at: datetime


class PendingProfileItem(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    bio: Optional[str] = None
    submitted_at: datetime
    student_id_image_path: str


class SignedUrlResponse(BaseModel):
    signed_url: str


class RejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class ReviewResponse(BaseModel):
    id: UUID
    status: str
    reviewed_at: datetime
