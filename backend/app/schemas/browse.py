from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.profile import PhotoItem


class BrowseProfileItem(BaseModel):
    id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    bio: str | None
    avatar_url: str | None
    is_liked: bool


class ProfileDetail(BaseModel):
    id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    bio: str | None
    created_at: datetime
    avatar_url: str | None
    is_liked: bool
    photos: list[PhotoItem] = []
    interests: list[str] = []
    club: str | None = None
    hometown: str | None = None
    looking_for: str | None = None
