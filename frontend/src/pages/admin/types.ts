export type AdminTab = 'overview' | 'users' | 'pending' | 'photos' | 'reports' | 'inquiries' | 'logs'

export type UserStatus = 'pending_review' | 'approved' | 'rejected' | 'banned'

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
  profile_image_url: string | null
  last_seen_at: string | null
  created_at: string
  reviewed_at: string | null
  banned_at: string | null
  privacy_purged_at: string | null
}

export interface UserListResponse {
  users: UserListItem[]
  total: number
  page: number
  page_size: number
}

export interface UserDetail {
  id: string
  email: string
  name: string | null
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

export interface PendingPhoto {
  id: string
  user_id: string
  image_path: string
  display_order: number
  created_at: string
  photo_url: string
  user_name: string | null
}

export interface AdminStats {
  total_users: number
  pending_count: number
  approved_count: number
  rejected_count: number
  total_matches: number
  total_messages: number
  total_reports: number
  active_today: number
}
