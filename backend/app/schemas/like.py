from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class LikeCreateRequest(BaseModel):
    liked_id: UUID


class LikeResponse(BaseModel):
    liker_id: UUID
    liked_id: UUID
    created_at: datetime
