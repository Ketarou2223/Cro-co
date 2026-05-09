import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import api from '@/lib/api'

interface Profile {
  id: string
  email: string
  created_at: string
  updated_at: string
}

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Profile>('/api/profile/me')
      .then((res) => setProfile(res.data))
      .catch(() => setError('プロフィールの取得に失敗しました'))
  }, [])

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

      {error && (
        <Alert variant="destructive" className="max-w-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground">
            メール: {profile?.email ?? user?.email}
          </p>
          <Button variant="outline" onClick={handleLogout}>ログアウト</Button>
        </div>
        {profile && (
          <p className="text-sm text-muted-foreground">
            登録日時: {formatDate(profile.created_at)}
          </p>
        )}
      </div>

      <nav className="flex gap-4">
        <Link to="/debug" className="text-muted-foreground underline underline-offset-4 text-sm">デバッグ</Link>
      </nav>
    </div>
  )
}
