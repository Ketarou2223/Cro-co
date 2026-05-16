from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationItem(BaseModel):
    id: UUID
    type: str
    from_user_id: Optional[UUID] = None
    from_user_name: Optional[str] = None
    from_user_avatar: Optional[str] = None
    match_id: Optional[UUID] = None
    message_preview: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime
