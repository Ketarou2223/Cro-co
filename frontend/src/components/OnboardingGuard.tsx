// 解説: このファイルはオンボーディング未完了ユーザーをリダイレクトするガードを定義する（§5 保護ファイル・ロジック変更禁止）。
// 解説: student_id_submitted=false → /setup/required（学生証未提出）
// 解説: student_id_submitted=true かつ onboarding_completed=false → /setup/optional（任意プロフィール未完了）
// 解説: /setup/* パスは除外（無限リダイレクトループを防ぐ）
import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useProfile } from '@/hooks/useProfile'
import LoadingScreen from '@/components/LoadingScreen'

export default function OnboardingGuard({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useProfile()
  const { pathname } = useLocation()

  if (isLoading) return <LoadingScreen />

  if (!pathname.startsWith('/setup/')) {
    if (profile && !profile.student_id_submitted) {
      return <Navigate to="/setup/required" replace />
    }
    if (profile && profile.student_id_submitted && !profile.onboarding_completed) {
      return <Navigate to="/setup/optional" replace />
    }
  }

  return <>{children}</>
}
