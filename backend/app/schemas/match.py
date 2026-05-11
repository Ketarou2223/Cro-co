from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel


class MatchedUserItem(BaseModel):
    match_id: UUID
    user_id: UUID
    name: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    matched_at: datetime
