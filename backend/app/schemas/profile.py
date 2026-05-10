from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    updated_at: datetime
    name: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    bio: Optional[str] = None
    status: Literal["pending_review", "approved", "rejected"]
    student_id_image_path: Optional[str] = None
    submitted_at: Optional[datetime] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    year: Optional[int] = Field(None, ge=1, le=6)
    faculty: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)
