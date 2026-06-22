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
  liked_count: number
  identity_verified: boolean
  profile_image_path: string | null
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
    // 解説: 423 は再登録ブロック（正常系扱い）。リトライ不要
    retry: (failureCount, err: unknown) => {
      const s = (err as { response?: { status?: number } })?.response?.status
      if (s === 423) return false
      return failureCount < 3
    },
  })

  // 解説: 423 = 再登録ブロック。setup 画面を描画させず /blocked へリダイレクト
  useEffect(() => {
    if (!error) return
    const s = (error as { response?: { status?: number } })?.response?.status
    if (s !== 423) return
    const d = (error as { response?: { data?: { type?: string; retain_until?: string; message?: string } } })?.response?.data ?? {}
    navigate('/blocked', { state: d, replace: true })
  }, [error, navigate])

  return { profile, isLoading }
}
