// 解説: このファイルは自分のプロフィールデータを取得・キャッシュするカスタムフックを提供する。
// 解説: 呼ばれる場所: OnboardingGuard.tsx / Layout.tsx 等、ログイン状態のどのページでも使える
// 解説: TanStack Query の useQuery でデータを取得・キャッシュする（2分間 staleTime）
// 解説: queryKey = ['profile-me'] でキャッシュを識別する（他のコンポーネントと同じキーを使えば同じキャッシュを参照）

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// 解説: ProfileData = プロフィールデータの型定義（GET /api/profile/me のレスポンスに対応）
export interface ProfileData {
  id: string
  email: string
  gender: string | null
  interest_in: string | null
  profile_setup_completed: boolean
  onboarding_completed: boolean
  student_id_submitted: boolean
  submitted_at: string | null
  // 解説: status = pending_review / approved / rejected の3択
  status: 'pending_review' | 'approved' | 'rejected'
  name: string | null
  year: number | null
  faculty: string | null
  department: string | null
  bio: string | null
  interests: string[]
  clubs: string[]
  status_message: string | null
  free_slots: string | null
  liked_count: number
  identity_verified: boolean
  student_type: string | null
  profile_image_path: string | null
  height_cm: number | null
  body_type: string | null
  blood_type: string | null
  sibling_rank: string | null
  languages: string[] | null
  campus: string | null
  housing: string | null
  commute_time: string | null
  commute_means: string[] | null
  second_lang: string | null
  relationship_goal: string | null
  marriage_intent: string | null
  preferred_age_band: string | null
  drinking: string | null
  smoking: string | null
  mbti: string | null
  love_type: string | null
  zodiac: string | null
  // 解説: photos = 投稿した写真リスト（image_path + display_order + 署名付き URL）
  photos: { id: string; image_path: string; display_order: number; signed_url?: string }[]
}

// 解説: useProfile() = 自分のプロフィールを取得するカスタムフック
export function useProfile() {
  // 解説: useAuth() = AuthContext からログイン中のユーザー情報を取得する
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: ['profile-me'],
    queryFn: () => api.get<ProfileData>('/api/profile/me').then(r => r.data),
    // 解説: enabled = !!user = ログインしていないときはクエリを実行しない
    enabled: !!user,
    // 解説: staleTime = 2分間キャッシュを有効とみなす（2分未満の再レンダーでは再取得しない）
    staleTime: 1000 * 60 * 2,
    // 解説: 423 = 再登録ブロック / 403 = BAN・削除済み。どちらもリトライ不要
    retry: (failureCount, err: unknown) => {
      const s = (err as { response?: { status?: number } })?.response?.status
      if (s === 423 || s === 403) return false
      return failureCount < 3
    },
  })

  // 解説: 423 = 再登録ブロック / 403 = BAN・削除済み → /blocked へリダイレクト
  // FastAPI の HTTPException は {"detail": {...}} 形式で返すため、detail を unwrap して state に渡す。
  // 403 は detail が文字列のため unwrap 後は空オブジェクト → /blocked で中立文を表示。
  useEffect(() => {
    if (!error) return
    const s = (error as { response?: { status?: number } })?.response?.status
    if (s !== 423 && s !== 403) return
    const raw = (error as { response?: { data?: unknown } })?.response?.data
    const rawDetail = raw != null ? (raw as { detail?: unknown }).detail : undefined
    const d = rawDetail != null && typeof rawDetail === 'object' ? rawDetail : {}
    navigate('/blocked', { state: d, replace: true })
  }, [error, navigate])

  return { profile, isLoading }
}
