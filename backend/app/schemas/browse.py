from uuid import UUID

from pydantic import BaseModel


class BrowseProfileItem(BaseModel):
    id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    bio: str | None
    avatar_url: str | None
