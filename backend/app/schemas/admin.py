from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


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
