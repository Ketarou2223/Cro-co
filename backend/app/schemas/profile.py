# 解説: このファイルは「プロフィール API」で使う Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: backend/app/routers/profile.py + browse.py でインポートして使う
# 解説: PhotoItem は browse.py でも再利用するため、このファイルが SSoT（単一定義元）

from datetime import date, datetime
from typing import Annotated, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

# 解説: _ShortStr50 = 最大50文字の文字列制約（リストの各要素に適用するために Annotated で型として定義）
# list[str] フィールドの要素ごとに適用する文字列制約（要素 1〜50 文字）
_ShortStr50 = Annotated[str, StringConstraints(max_length=50)]


# 解説: PhotoItem = ユーザーが投稿した写真1枚のデータ（profile_images テーブルの1行）
class PhotoItem(BaseModel):
    id: UUID
    image_path: str
    display_order: int
    # 解説: signed_url = image_utils.get_signed_image_url() で生成した閲覧用 URL
    signed_url: Optional[str] = None
    status: str = "approved"  # pending | approved | rejected


# 解説: ProfileResponse = 自分のプロフィール（GET /api/profile/me）の完全レスポンス
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
    # 解説: status = pending_review / approved / rejected の3択（Literal で列挙）
    status: Literal["pending_review", "approved", "rejected"]
    submitted_at: Optional[datetime] = None
    profile_image_path: Optional[str] = None
    # 解説: avatar_url = 署名付き URL（profile_image_path から生成）
    avatar_url: Optional[str] = None
    photos: list[PhotoItem] = []
    interests: list[str] = []
    # 解説: club = 旧単一サークル（後方互換のため残す）。新規は clubs を使う
    club: Optional[str] = None
    clubs: list[str] = []
    hometown: Optional[str] = None
    show_online_status: bool = True
    last_seen_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    # 解説: liked_count = 自分がもらったいいねの累計数
    liked_count: int = 0
    status_message: Optional[str] = None
    status_message_updated_at: Optional[datetime] = None
    admission_year: Optional[int] = None
    # 解説: faculty_hide_level = "none" / "faculty" / "department"（身バレ防止の隠し設定）
    faculty_hide_level: str = "none"
    # 解説: hidden_clubs = 自分が参加しているが非公開にしているサークルのリスト
    hidden_clubs: list[str] = []
    identity_verified: bool = False
    gender: Optional[str] = None
    interest_in: Optional[str] = None
    profile_completed: bool = False
    profile_setup_completed: bool = False
    student_id_submitted: bool = False
    # 解説: birth_date = KYC フィールド（学生証から取得・本人のみ閲覧可）
    birth_date: Optional[date] = None
    onboarding_completed: bool = False


# 解説: PhotoReorderRequest = 写真の表示順を変更するリクエスト本文
class PhotoReorderRequest(BaseModel):
    # 解説: order = 写真 ID のリスト（この順番に display_order を振り直す）。最大6枚
    order: list[UUID] = Field(max_length=6)


# 解説: ProfileUpdateRequest = プロフィール更新リクエスト本文（全フィールド任意）
class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    # 解説: year = 学年（1〜6=学部1〜6年・7=M1・8=M2・9=D1・10=D2・11=D3。@ecs.osaka-u.ac.jp は院生も有効なため 11 まで許容）
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
    # birth_date は upload-student-id 経由でのみ確定する KYC フィールド。
    # PATCH /me では受け付けない（送られても Pydantic が無視する）。
