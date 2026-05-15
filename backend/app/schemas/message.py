from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MessageCreateRequest(BaseModel):
    match_id: UUID
    content: str = Field(min_length=1, max_length=1000)


class MessageResponse(BaseModel):
    id: UUID
    match_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    read_at: Optional[datetime] = None
