from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ReportItem(BaseModel):
    id: UUID
    reporter_id: UUID
    reporter_name: Optional[str] = None
    reported_id: UUID
    reported_name: Optional[str] = None
    reason: str
    detail: Optional[str] = None
    created_at: datetime


class ReportItemExtended(ReportItem):
    status: str = "pending"
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    resolution_note: Optional[str] = None
    action_taken: Optional[str] = None
    reported_user_status: Optional[str] = None


class PendingProfileItem(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    real_name: Optional[str] = None
    student_number: Optional[str] = None
    birth_date: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    submitted_at: datetime
    student_id_image_path: str
    admission_year: Optional[int] = None
    identity_verified: bool = False
    gender: Optional[str] = None
    interest_in: Optional[str] = None
    profile_completed: bool = False
    clubs: list[str] = []


class SignedUrlResponse(BaseModel):
    signed_url: str


class StudentIdDetailResponse(BaseModel):
    signed_url: str
    faculty: Optional[str] = None
    department: Optional[str] = None
    admission_year: Optional[int] = None


class RejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class ReviewResponse(BaseModel):
    id: UUID
    status: str
    reviewed_at: datetime


class AdminStats(BaseModel):
    total_users: int
    pending_count: int
    approved_count: int
    rejected_count: int
    total_matches: int
    total_messages: int
    total_reports: int
    active_today: int
    inquiry_unread_count: int = 0


class UserListItem(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    status: str
    gender: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    profile_image_path: Optional[str] = None
    profile_image_url: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    banned_at: Optional[datetime] = None
    privacy_purged_at: Optional[datetime] = None


class UserListResponse(BaseModel):
    users: list[UserListItem]
    total: int
    page: int
    page_size: int


class UserDetailResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    real_name: Optional[str] = None
    student_number: Optional[str] = None
    birth_date: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    interest_in: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    admission_year: Optional[int] = None
    bio: Optional[str] = None
    status_message: Optional[str] = None
    interests: list[str] = []
    clubs: list[str] = []
    hometown: Optional[str] = None
    looking_for: Optional[str] = None

    status: str
    identity_verified: bool = False
    student_id_submitted: bool = False
    onboarding_completed: bool = False
    profile_image_path: Optional[str] = None
    profile_image_url: Optional[str] = None
    photos: list[dict] = []

    privacy_purged_at: Optional[datetime] = None
    banned_at: Optional[datetime] = None
    banned_by: Optional[UUID] = None
    ban_reason: Optional[str] = None
    rejection_reason: Optional[str] = None

    last_seen_at: Optional[datetime] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    match_count: int = 0
    sent_likes: int = 0
    received_likes: int = 0
    report_count: int = 0


class BanRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class UnbanRequest(BaseModel):
    note: Optional[str] = Field(default=None, max_length=500)


class ReportUpdateRequest(BaseModel):
    status: str = Field(pattern="^(pending|investigating|resolved|dismissed)$")
    resolution_note: Optional[str] = Field(default=None, max_length=500)
    action_taken: Optional[str] = Field(
        default=None,
        pattern="^(warning|suspend|ban|none)$",
    )


class TimeSeriesPoint(BaseModel):
    date: str
    count: int
    cumulative: int


class StatsTimeSeriesResponse(BaseModel):
    registrations: list[TimeSeriesPoint]
    matches: list[TimeSeriesPoint]


class FacultyBreakdown(BaseModel):
    faculty: str
    count: int
    male: int
    female: int


class StatsBreakdownResponse(BaseModel):
    by_faculty: list[FacultyBreakdown]
    by_gender: dict[str, int]
    by_year: dict[str, int]


class InquiryItem(BaseModel):
    id: UUID
    user_id: UUID
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    category: str
    subject: str
    body: str
    status: str
    admin_reply: Optional[str] = None
    admin_note: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: datetime


class InquiryReplyRequest(BaseModel):
    reply: str = Field(min_length=1, max_length=2000)
    note: Optional[str] = Field(default=None, max_length=500)


class InquiryStatusUpdateRequest(BaseModel):
    status: str = Field(pattern="^(unread|read|replied|closed)$")
    note: Optional[str] = Field(default=None, max_length=500)


class PendingPhotoItem(BaseModel):
    id: UUID
    user_id: UUID
    image_path: str
    display_order: int
    created_at: datetime
    photo_url: str
    user_name: Optional[str] = None
