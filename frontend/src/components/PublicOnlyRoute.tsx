// 解説: このファイルは「未ログインユーザー専用」ルートガードを定義する（§5 保護ファイル・ロジック変更禁止）。
// 解説: ログイン済みのユーザーが /login /signup 等にアクセスしたとき /home にリダイレクトする
// 解説: ProtectedRoute の逆の働き。App.tsx でログイン/登録ページに使用している
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <p className="min-h-screen flex items-center justify-center">読み込み中...</p>
  if (user) return <Navigate to="/home" replace />
  return <>{children}</>
}
