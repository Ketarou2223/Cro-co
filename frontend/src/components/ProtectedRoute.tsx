// 解説: このファイルは「ログイン必須」ルートガードを定義する（§5 保護ファイル・ロジック変更禁止）。
// 解説: user=null（未ログイン）なら /login にリダイレクト。loading 中は待機テキストを表示してフラッシュを防ぐ
// 解説: App.tsx で認証が必要な全ルートをこのコンポーネントでラップしている
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <p className="min-h-screen flex items-center justify-center">読み込み中...</p>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
