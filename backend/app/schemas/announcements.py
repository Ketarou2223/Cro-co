# 解説: このファイルは「運営お知らせ」機能の Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: routers/announcements.py / routers/admin_announcements.py

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

# 有効な学部名（osaka-u-data.ts FACULTIES キーと同期）
_VALID_FACULTIES: frozenset[str] = frozenset({
    '文学部', '人間科学部', '外国語学部', '法学部', '経済学部',
    '理学部', '医学部', '歯学部', '薬学部', '工学部', '基礎工学部',
})
_VALID_GENDERS: frozenset[str] = frozenset({'male', 'female'})


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=1000)
    target_all: bool = False
    target_faculties: list[str] = Field(default_factory=list)
    target_grades: list[int] = Field(default_factory=list)
    target_genders: list[str] = Field(default_factory=list)

    @field_validator('target_faculties')
    @classmethod
    def validate_faculties(cls, v: list[str]) -> list[str]:
        for f in v:
            if f not in _VALID_FACULTIES:
                raise ValueError(f'不正な学部名: {f}')
        return list(dict.fromkeys(v))  # 重複除去

    @field_validator('target_grades')
    @classmethod
    def validate_grades(cls, v: list[int]) -> list[int]:
        for g in v:
            if g < 1 or g > 6:
                raise ValueError(f'学年は 1〜6 で指定してください: {g}')
        return sorted(set(v))

    @field_validator('target_genders')
    @classmethod
    def validate_genders(cls, v: list[str]) -> list[str]:
        for g in v:
            if g not in _VALID_GENDERS:
                raise ValueError(f'不正な性別値: {g}')
        return list(dict.fromkeys(v))


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    body: Optional[str] = Field(None, min_length=1, max_length=1000)
    target_all: Optional[bool] = None
    target_faculties: Optional[list[str]] = None
    target_grades: Optional[list[int]] = None
    target_genders: Optional[list[str]] = None

    @field_validator('target_faculties')
    @classmethod
    def validate_faculties(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        for f in v:
            if f not in _VALID_FACULTIES:
                raise ValueError(f'不正な学部名: {f}')
        return list(dict.fromkeys(v))

    @field_validator('target_grades')
    @classmethod
    def validate_grades(cls, v: Optional[list[int]]) -> Optional[list[int]]:
        if v is None:
            return v
        for g in v:
            if g < 1 or g > 6:
                raise ValueError(f'学年は 1〜6 で指定してください: {g}')
        return sorted(set(v))

    @field_validator('target_genders')
    @classmethod
    def validate_genders(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        for g in v:
            if g not in _VALID_GENDERS:
                raise ValueError(f'不正な性別値: {g}')
        return list(dict.fromkeys(v))


# 管理者向けレスポンス（全フィールド）
class AnnouncementAdminItem(BaseModel):
    id: UUID
    title: str
    body: str
    target_all: bool
    target_faculties: list[str]
    target_grades: list[int]
    target_genders: list[str]
    created_by: Optional[UUID] = None
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ユーザー向けレスポンス（既読フラグ付き）
class AnnouncementUserItem(BaseModel):
    id: UUID
    title: str
    body: str
    created_at: datetime
    is_read: bool


class AnnouncementUnreadCount(BaseModel):
    unread_count: int
