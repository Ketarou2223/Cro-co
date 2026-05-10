import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

type Status = 'pending_review' | 'approved' | 'rejected'

interface ProfileStatus {
  status: Status
}

export default function StatusGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<ProfileStatus | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfileLoading(false)
      return
    }
    api
      .get<ProfileStatus>('/api/profile/me')
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))
  }, [user])

  if (loading || profileLoading) {
    return <p className="min-h-screen flex items-center justify-center">読み込み中...</p>
  }
  if (!profile) return <Navigate to="/login" replace />
  if (profile.status === 'pending_review') return <Navigate to="/pending" replace />
  if (profile.status === 'rejected') return <Navigate to="/rejected" replace />
  return <>{children}</>
}
