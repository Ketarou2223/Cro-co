// 解説: このファイルは管理者ダッシュボードで使う TypeScript 型定義を提供する。
// 解説: 呼ばれる場所: frontend/src/pages/admin/ 配下の全コンポーネントで共用する
// 解説: バックエンドの backend/app/schemas/admin.py の Pydantic モデルとフィールドを対応させている
// 解説: type = 型エイリアス（単純な型の別名）/ interface = オブジェクト型定義（プロパティを列挙）

// 解説: AdminTab = 管理者ダッシュボードのタブ名の型（8種類の文字列リテラル型）
export type AdminTab = 'overview' | 'users' | 'pending' | 'photos' | 'reports' | 'inquiries' | 'logs' | 'announcements'

// 解説: AnnouncementAdminItem = 管理者向けお知らせ1件の型定義
export interface AnnouncementAdminItem {
  id: string
  title: string
  body: string
  target_all: boolean
  target_faculties: string[]
  target_grades: number[]
  target_genders: string[]
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// 解説: UserStatus = ユーザーの審査・BAN 状態を表す型（4種類）
export type UserStatus = 'pending_review' | 'approved' | 'rejected' | 'banned'

// 解説: UserListItem = ユーザー一覧の1行分のデータ型
export interface UserListItem {
  id: string
  email: string
  name: string | null
  status: UserStatus
  gender: 'male' | 'female' | null
  year: number | null
  faculty: string | null
  department: string | null
  profile_image_path: string | null
  // 解説: profile_image_url = 署名付き URL（バックエンドで生成して返す）
  profile_image_url: string | null
  last_seen_at: string | null
  created_at: string
  reviewed_at: string | null
  banned_at: string | null
  privacy_purged_at: string | null
}

// 解説: UserListResponse = ユーザー一覧レスポンスの型（ページネーション情報付き）
export interface UserListResponse {
  users: UserListItem[]
  total: number
  page: number
  page_size: number
}

// 解説: UserDetail = ユーザー詳細ダイアログに表示する全フィールドの型
export interface UserDetail {
  id: string
  email: string
  name: string | null
  // 解説: real_name = KYC 済みの本名（学生証から取得）
  real_name: string | null
  student_number: string | null
  birth_date: string | null
  age: number | null
  gender: 'male' | 'female' | null
  interest_in: 'male' | 'female' | null
  year: number | null
  faculty: string | null
  department: string | null
  admission_year: number | null
  bio: string | null
  status_message: string | null
  interests: string[]
  clubs: string[]
  hometown: string | null
  status: UserStatus
  identity_verified: boolean
  student_id_submitted: boolean
  onboarding_completed: boolean
  profile_image_path: string | null
  profile_image_url: string | null
  // 解説: photos = ユーザーの投稿写真リスト（id / url / 表示順）
  photos: { id: string; url: string; display_order: number }[]
  privacy_purged_at: string | null
  banned_at: string | null
  banned_by: string | null
  ban_reason: string | null
  rejection_reason: string | null
  last_seen_at: string | null
  created_at: string
  reviewed_at: string | null
  match_count: number
  sent_likes: number
  received_likes: number
  report_count: number
}

// 解説: PendingPhoto = 審査待ち写真の型定義（PhotoReviewTab で使う）
export interface PendingPhoto {
  id: string
  user_id: string
  image_path: string
  display_order: number
  created_at: string
  // 解説: photo_url = 審査用の署名付き URL（バックエンドで生成）
  photo_url: string
  user_name: string | null
}

// 解説: AdminStats = ダッシュボードのサマリー統計の型定義
export interface AdminStats {
  total_users: number
  pending_count: number
  approved_count: number
  rejected_count: number
  total_matches: number
  total_messages: number
  // 解説: total_reports = 未処理の通報件数
  total_reports: number
  active_today: number
  inquiry_unread_count: number
}
