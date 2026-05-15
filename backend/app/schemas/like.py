from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class LikeCreateRequest(BaseModel):
    liked_id: UUID


class LikeResponse(BaseModel):
    liker_id: UUID
    liked_id: UUID
    created_at: datetime
    is_match: bool = False


class LikerItem(BaseModel):
    id: UUID
    name: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    avatar_url: Optional[str] = None
