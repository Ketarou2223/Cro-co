from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.profile import PhotoItem


class BrowseProfileItem(BaseModel):
    id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    department: str | None = None
    bio: str | None
    avatar_url: str | None
    is_liked: bool
    last_seen_at: datetime | None = None
    online_status: str = 'unknown'
    status_message: str | None = None
    clubs: list[str] = []


class RecommendedProfileItem(BrowseProfileItem):
    score: int = 0


class ProfileDetail(BaseModel):
    id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    department: str | None = None
    science_humanities: str | None = None
    bio: str | None
    created_at: datetime
    avatar_url: str | None
    is_liked: bool
    photos: list[PhotoItem] = []
    interests: list[str] = []
    club: str | None = None
    clubs: list[str] = []
    hometown: str | None = None
    looking_for: str | None = None
    last_seen_at: datetime | None = None
    online_status: str = 'unknown'
    status_message: str | None = None


class ProfileViewItem(BaseModel):
    viewer_id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    avatar_url: str | None
    viewed_at: datetime


class ProfileViewsResponse(BaseModel):
    views: list[ProfileViewItem]
    unread_count: int
