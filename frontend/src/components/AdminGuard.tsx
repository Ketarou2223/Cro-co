// 解説: このファイルは管理者専用ルートガードを定義する（§5 保護ファイル・ロジック変更禁止）。
// 解説: GET /api/admin/pending を実際に叩いて成功すれば管理者と判定（フロントにメールリストを置かない設計）
// 解説: 403/401 になれば非管理者 → /home にリダイレクト（管理者判定はバックエンドの require_admin が担保）
// 解説: App.tsx の /admin ルートをラップしている
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
