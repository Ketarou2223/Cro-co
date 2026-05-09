import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <p className="min-h-screen flex items-center justify-center">読み込み中...</p>
  if (user) return <Navigate to="/home" replace />
  return <>{children}</>
}
