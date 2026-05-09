from datetime import datetime
from typing import Optional
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


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    year: Optional[int] = Field(None, ge=1, le=6)
    faculty: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)
