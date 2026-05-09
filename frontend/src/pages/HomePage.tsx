import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">ホーム</h1>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : user ? (
        <p className="text-muted-foreground">ログイン中: {user.email}</p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground">未ログイン状態です</p>
          <Link to="/login" className="text-primary underline underline-offset-4">
            ログインする
          </Link>
        </div>
      )}

      <nav className="flex gap-4">
        <Link to="/login" className="text-primary underline underline-offset-4">ログイン</Link>
        <Link to="/signup" className="text-primary underline underline-offset-4">新規登録</Link>
        <Link to="/debug" className="text-muted-foreground underline underline-offset-4 text-sm">デバッグ</Link>
      </nav>
    </div>
  )
}
