from datetime import date, datetime
from typing import Annotated, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

# list[str] フィールドの要素ごとに適用する文字列制約（要素 1〜50 文字）
_ShortStr50 = Annotated[str, StringConstraints(max_length=50)]


class PhotoItem(BaseModel):
    id: UUID
    image_path: str
    display_order: int
    signed_url: Optional[str] = None
    status: str = "approved"  # pending | approved | rejected


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    updated_at: datetime
    name: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    status: Literal["pending_review", "approved", "rejected"]
    submitted_at: Optional[datetime] = None
    profile_image_path: Optional[str] = None
    avatar_url: Optional[str] = None
    photos: list[PhotoItem] = []
    interests: list[str] = []
    club: Optional[str] = None
    clubs: list[str] = []
    hometown: Optional[str] = None
    looking_for: Optional[str] = None
    show_online_status: bool = True
    last_seen_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    liked_count: int = 0
    status_message: Optional[str] = None
    status_message_updated_at: Optional[datetime] = None
    admission_year: Optional[int] = None
    faculty_hide_level: str = "none"
    hidden_clubs: list[str] = []
    identity_verified: bool = False
    gender: Optional[str] = None
    interest_in: Optional[str] = None
    profile_completed: bool = False
    profile_setup_completed: bool = False
    student_id_submitted: bool = False
    real_name: Optional[str] = None
    student_number: Optional[str] = None
    birth_date: Optional[date] = None
    onboarding_completed: bool = False


class PhotoReorderRequest(BaseModel):
    order: list[UUID]


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    year: Optional[int] = Field(None, ge=1, le=11)
    faculty: Optional[str] = Field(None, max_length=50)
    department: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    # max_length=20 はリストの要素数上限。各要素は _ShortStr50 で 50 文字以内
    interests: Optional[list[_ShortStr50]] = Field(None, max_length=20)
    club: Optional[str] = Field(None, max_length=50)
    # max_length=5 はリストの要素数上限（ルーター側の 5 件チェックと統一）
    clubs: Optional[list[_ShortStr50]] = Field(None, max_length=5)
    hometown: Optional[str] = Field(None, max_length=50)
    show_online_status: Optional[bool] = None
    status_message: Optional[str] = Field(None, max_length=30)
    faculty_hide_level: Optional[Literal["none", "faculty", "department"]] = None
    hidden_clubs: Optional[list[_ShortStr50]] = Field(None, max_length=5)
    gender: Optional[Literal["male", "female"]] = None
    interest_in: Optional[Literal["male", "female"]] = None
    # 氏名は文字種を縛らない（漢字・かな・ラテン・空白を許容）
    real_name: Optional[str] = Field(None, min_length=1, max_length=100)
    # 学籍番号は英数字のみ・20 文字以内（他大学展開を考慮した上限）
    student_number: Optional[str] = Field(
        None, min_length=1, max_length=20, pattern=r"^[A-Za-z0-9]+$"
    )
    birth_date: Optional[date] = None
