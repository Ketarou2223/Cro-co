import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[HomePage] signOut error:', e)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">ホーム</h1>

      <div className="flex items-center gap-4">
        <p className="text-muted-foreground">ログイン中: {user?.email}</p>
        <Button variant="outline" onClick={handleLogout}>ログアウト</Button>
      </div>

      <nav className="flex gap-4">
        <Link to="/debug" className="text-muted-foreground underline underline-offset-4 text-sm">デバッグ</Link>
      </nav>
    </div>
  )
}
