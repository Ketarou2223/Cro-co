# 解説: このファイルは「ブラウズ（おすすめ・検索・足跡）API」で使う Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: backend/app/routers/browse.py でインポートして response_model に使う
# 解説: PhotoItem は profile.py で定義済みのものを再利用する（重複定義を避けるためインポート）

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.schemas.profile import PhotoItem


# 解説: DailyTodayForProfile = 相手プロフに同梱する当日の2択情報
class DailyTodayForProfile(BaseModel):
    question: dict[str, Any] | None
    their_choice: str | None
    answered: bool
    stats: dict[str, Any] | None


# 解説: BrowseProfileItem = ブラウズ一覧の1ユーザー分（軽量版・写真なし）
class BrowseProfileItem(BaseModel):
    id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    department: str | None = None
    bio: str | None
    # 解説: avatar_url = 署名付き URL（image_utils.get_signed_image_url() で生成）
    avatar_url: str | None
    # 解説: is_liked = 自分がこのユーザーにいいね済みかどうか
    is_liked: bool
    last_seen_at: datetime | None = None
    # 解説: online_status = "online" / "offline" / "unknown"（last_seen_at から計算）
    online_status: str = 'unknown'
    status_message: str | None = None
    clubs: list[str] = []
    # 解説: blurred = True のとき avatar_url は None・フロントでプレースホルダーを表示する
    blurred: bool = False


# 解説: RecommendedProfileItem = BrowseProfileItem を継承し、おすすめスコアを追加したもの
class RecommendedProfileItem(BrowseProfileItem):
    # 解説: score = 共通属性（学部・サークル等）の一致数から計算されたマッチング点数
    score: int = 0


# 解説: ProfileDetail = プロフィール詳細ページ用のフルデータ（写真・趣味・サークル等含む）
class ProfileDetail(BaseModel):
    id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    department: str | None = None
    # 解説: science_humanities = "理系" / "文系"（faculty_classification.py で判定）
    science_humanities: str | None = None
    bio: str | None
    created_at: datetime
    avatar_url: str | None
    is_liked: bool
    # 解説: photos = profile_images テーブルから取得した写真リスト（PhotoItem のリスト）
    photos: list[PhotoItem] = []
    interests: list[str] = []
    # 解説: club = 旧単一サークル（後方互換のため残す）。新規は clubs を使う
    club: str | None = None
    clubs: list[str] = []
    hometown: str | None = None
    last_seen_at: datetime | None = None
    online_status: str = 'unknown'
    status_message: str | None = None
    free_slots: str | None = None
    height_cm: int | None = None
    body_type: str | None = None
    blood_type: str | None = None
    sibling_rank: str | None = None
    languages: list[str] | None = None
    campus: str | None = None
    housing: str | None = None
    commute_time: str | None = None
    commute_means: list[str] | None = None
    second_lang: str | None = None
    relationship_goal: str | None = None
    marriage_intent: str | None = None
    preferred_age_band: str | None = None
    drinking: str | None = None
    smoking: str | None = None
    mbti: str | None = None
    love_type: str | None = None
    zodiac: str | None = None
    daily_today: DailyTodayForProfile | None = None
    # 解説: blurred = True のとき avatar_url と photos が空・フロントでプレースホルダーを表示する
    blurred: bool = False


# 解説: ProfileViewItem = 「足跡（閲覧者）」一覧の1件分（閲覧者の名前・学年・学部）
class ProfileViewItem(BaseModel):
    # 解説: viewer_id = このプロフィールを閲覧したユーザーの ID
    viewer_id: UUID
    name: str | None
    year: int | None
    faculty: str | None
    avatar_url: str | None
    viewed_at: datetime
    # 解説: is_new = confirmed_at が NULL（まだ確認していない）の場合 True
    is_new: bool = False


# 解説: ProfileViewsResponse = 足跡一覧レスポンス（views + 未読件数）
class ProfileViewsResponse(BaseModel):
    views: list[ProfileViewItem]
    # 解説: unread_count = まだ「見た」として処理していない足跡の件数
    unread_count: int
