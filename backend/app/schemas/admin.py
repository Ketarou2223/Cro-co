# 解説: このファイルは「管理者 API」で使う Pydantic スキーマを定義する。
# 解説: 「スキーマ」= APIのリクエスト・レスポンスの型定義（型チェック・バリデーション）
# 解説: 呼ばれる場所: backend/app/routers/admin.py でインポートして response_model や body 型に使う
# 解説: Pydantic BaseModel = JSON ↔ Python オブジェクトの変換と自動バリデーションを担う基底クラス
# 解説: Field(...) = 必須フィールド。Field(None, ...) = 省略可能フィールド（デフォルト None）

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# 解説: ReportItem = 通報1件の基本情報。reporter=通報者 / reported=被通報者
class ReportItem(BaseModel):
    id: UUID
    reporter_id: UUID
    # 解説: reporter_name は profiles テーブルから JOIN して付加する（通報テーブル自体には名前はない）
    reporter_name: Optional[str] = None
    reported_id: UUID
    reported_name: Optional[str] = None
    reason: str
    detail: Optional[str] = None
    created_at: datetime


# 解説: ReportItemExtended = ReportItem を継承し、管理者が対応を記録するフィールドを追加したもの
class ReportItemExtended(ReportItem):
    # 解説: status = 通報の処理状態（pending / investigating / resolved / dismissed）
    status: str = "pending"
    resolved_at: Optional[datetime] = None
    # 解説: resolved_by = 対応した管理者の UUID
    resolved_by: Optional[UUID] = None
    resolution_note: Optional[str] = None
    # 解説: action_taken = 実施したアクション（warning / suspend / ban / none）
    action_taken: Optional[str] = None
    # 解説: reported_user_status = 被通報者の現在の account status（banned かどうかの確認用）
    reported_user_status: Optional[str] = None


# 解説: PendingProfileItem = 管理者の審査待ちプロフィール一覧の1件分のデータ
class PendingProfileItem(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    birth_date: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    # 解説: submitted_at = 学生証を提出した日時（審査待ちの判断基準）
    submitted_at: datetime
    student_id_image_path: str
    admission_year: Optional[int] = None
    # 解説: identity_verified = 身元確認済みフラグ（承認後 True になる）
    identity_verified: bool = False
    gender: Optional[str] = None
    interest_in: Optional[str] = None
    profile_completed: bool = False
    clubs: list[str] = []


# 解説: SignedUrlResponse = 署名付き URL を返すシンプルなレスポンス
class SignedUrlResponse(BaseModel):
    signed_url: str


# 解説: StudentIdDetailResponse = 学生証+身分証の署名付き URL + 学部情報を返すレスポンス
class StudentIdDetailResponse(BaseModel):
    signed_url: str
    faculty: Optional[str] = None
    department: Optional[str] = None
    admission_year: Optional[int] = None
    student_type: Optional[str] = None
    id_doc_signed_url: Optional[str] = None


# 解説: RejectRequest = 却下リクエスト本文（却下理由が必須）
class RejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


# 解説: ReviewResponse = 審査操作（承認・却下・停止）の結果レスポンス
class ReviewResponse(BaseModel):
    id: UUID
    # 解説: status = 操作後の新しいステータス
    status: str
    reviewed_at: datetime


# 解説: AdminStats = ダッシュボードのサマリー統計（全ユーザー数・審査待ち数・マッチ数等）
class AdminStats(BaseModel):
    total_users: int
    pending_count: int
    approved_count: int
    rejected_count: int
    total_matches: int
    total_messages: int
    # 解説: total_reports = 未処理（pending）の通報件数
    total_reports: int
    # 解説: active_today = 今日 last_seen_at が更新されたユーザー数
    active_today: int
    inquiry_unread_count: int = 0


# 解説: UserListItem = 管理者のユーザー一覧の1行分（一覧表示用の軽量版）
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
    # 解説: profile_image_url = 署名付き URL（image_utils.get_signed_image_url() で生成）
    profile_image_url: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    banned_at: Optional[datetime] = None
    privacy_purged_at: Optional[datetime] = None


# 解説: UserListResponse = ユーザー一覧レスポンス（ページネーション情報付き）
class UserListResponse(BaseModel):
    users: list[UserListItem]
    # 解説: total = フィルタ後の全件数（ページネーションのために total を返す）
    total: int
    page: int
    page_size: int


# 解説: UserDetailResponse = 管理者のユーザー詳細（全フィールド + 統計情報）
class UserDetailResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
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

    status: str
    identity_verified: bool = False
    student_id_submitted: bool = False
    onboarding_completed: bool = False
    profile_image_path: Optional[str] = None
    profile_image_url: Optional[str] = None
    # 解説: photos = ユーザーが投稿した写真の一覧（url・display_order を含む dict のリスト）
    photos: list[dict] = []

    privacy_purged_at: Optional[datetime] = None
    banned_at: Optional[datetime] = None
    # 解説: banned_by = BAN を実施した管理者の UUID
    banned_by: Optional[UUID] = None
    ban_reason: Optional[str] = None
    rejection_reason: Optional[str] = None

    last_seen_at: Optional[datetime] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    # 解説: 以下4フィールドは routers/admin.py で別途 DB から集計して付加する（profiles テーブルにはない）
    match_count: int = 0
    sent_likes: int = 0
    received_likes: int = 0
    report_count: int = 0


# 解説: BanRequest = BAN リクエスト本文（BAN 理由が必須）
class BanRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


# 解説: UnbanRequest = BAN 解除リクエスト本文（メモは任意）
class UnbanRequest(BaseModel):
    note: Optional[str] = Field(default=None, max_length=500)


# 解説: ReportUpdateRequest = 通報対応更新リクエスト（status・メモ・実施アクション）
class ReportUpdateRequest(BaseModel):
    # 解説: pattern = 正規表現による列挙値バリデーション（Pydantic v2 の Field パラメータ）
    status: str = Field(pattern="^(pending|investigating|resolved|dismissed)$")
    resolution_note: Optional[str] = Field(default=None, max_length=500)
    action_taken: Optional[str] = Field(
        default=None,
        # 解説: action_taken = 実施アクションは4択のみ受け付ける
        pattern="^(warning|suspend|ban|none)$",
    )


# 解説: TimeSeriesPoint = 時系列グラフの1点（日付・当日件数・累計件数）
class TimeSeriesPoint(BaseModel):
    date: str
    count: int
    # 解説: cumulative = その日までの累計件数（グラフの折れ線に使う）
    cumulative: int


# 解説: StatsTimeSeriesResponse = 登録者・マッチ数の時系列データ（registrations / matches）
class StatsTimeSeriesResponse(BaseModel):
    registrations: list[TimeSeriesPoint]
    matches: list[TimeSeriesPoint]


# 解説: FacultyBreakdown = 学部別の内訳（承認済みユーザーの合計・男女別）
class FacultyBreakdown(BaseModel):
    faculty: str
    count: int
    male: int
    female: int


# 解説: StatsBreakdownResponse = 学部・性別・学年別の内訳レスポンス
class StatsBreakdownResponse(BaseModel):
    by_faculty: list[FacultyBreakdown]
    # 解説: by_gender = {"male": 100, "female": 80} のように文字列キーで件数を返す
    by_gender: dict[str, int]
    # 解説: by_year = {"1": 50, "2": 60, ...} のように学年（文字列）ごとの件数
    by_year: dict[str, int]


# 解説: InquiryItem = 管理者が見る問い合わせ1件（全フィールド・ユーザー情報付き）
class InquiryItem(BaseModel):
    id: UUID
    user_id: UUID
    # 解説: user_email / user_name は routers/admin.py で profiles テーブルから付加する
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    category: str
    subject: str
    body: str
    status: str
    admin_reply: Optional[str] = None
    # 解説: admin_note = 管理者内部メモ（ユーザーには見せない）
    admin_note: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: datetime


# 解説: InquiryReplyRequest = 問い合わせへの返信リクエスト（reply 必須・note 任意）
class InquiryReplyRequest(BaseModel):
    reply: str = Field(min_length=1, max_length=2000)
    # 解説: note = 管理者内部メモ（ユーザーには表示しない）
    note: Optional[str] = Field(default=None, max_length=500)


# 解説: InquiryStatusUpdateRequest = 問い合わせのステータス更新リクエスト（既読・クローズ等）
class InquiryStatusUpdateRequest(BaseModel):
    status: str = Field(pattern="^(unread|read|replied|closed)$")
    note: Optional[str] = Field(default=None, max_length=500)


# 解説: PendingPhotoItem = 審査待ち写真1件（photo_url は署名付き URL）
class PendingPhotoItem(BaseModel):
    id: UUID
    user_id: UUID
    image_path: str
    display_order: int
    created_at: datetime
    # 解説: photo_url = image_utils.get_signed_image_url() で生成した閲覧用 URL
    photo_url: str
    user_name: Optional[str] = None
