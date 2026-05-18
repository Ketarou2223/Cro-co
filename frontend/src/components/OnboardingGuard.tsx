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
