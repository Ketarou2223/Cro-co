from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    updated_at: datetime
