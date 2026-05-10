import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) return
    api
      .get('/api/admin/pending')
      .then(() => setHasAccess(true))
      .catch(() => setHasAccess(false))
  }, [user])

  if (loading || hasAccess === null) {
    return <p className="min-h-screen flex items-center justify-center">読み込み中...</p>
  }

  if (!hasAccess) return <Navigate to="/home" replace />

  return <>{children}</>
}
