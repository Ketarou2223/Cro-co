import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import api from '@/lib/api'

interface Profile {
  id: string
  email: string
  created_at: string
  updated_at: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  profile_image_path: string | null
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Profile>('/api/profile/me')
      .then((res) => {
        setProfile(res.data)
        // profile_image_path がある場合のみ signed URL を取得
        if (res.data.profile_image_path) {
          return api.get<{ signed_url: string | null }>('/api/profile/avatar-url')
        }
        return null
      })
      .then((urlRes) => {
        if (urlRes) setAvatarUrl(urlRes.data.signed_url)
      })
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

  const unset = <span className="text-muted-foreground">（未設定）</span>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold">ホーム</h1>

      {error && (
        <Alert variant="destructive" className="max-w-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <p className="text-muted-foreground">
          メール: {profile?.email ?? user?.email}
        </p>
        <Button variant="outline" onClick={handleLogout}>ログアウト</Button>
      </div>

      {profile && (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">プロフィール</CardTitle>
          </CardHeader>
          <CardContent>
            {/* アバター */}
            <div className="flex justify-center mb-4">
              <Avatar className="w-24 h-24">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="アバター" />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  {profile.profile_image_path ? '...' : 'アバター未設定'}
                </AvatarFallback>
              </Avatar>
            </div>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">表示名</dt>
                <dd>{profile.name ?? unset}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">学年</dt>
                <dd>{profile.year != null ? `${profile.year}年` : unset}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">学部</dt>
                <dd>{profile.faculty ?? unset}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">自己紹介</dt>
                <dd className="whitespace-pre-wrap">{profile.bio ?? unset}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">登録日時</dt>
                <dd>{formatDate(profile.created_at)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button asChild variant="outline" size="sm">
                <Link to="/profile/edit">プロフィール編集</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/browse">ユーザー一覧を見る</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <nav className="flex gap-4">
        <Link to="/debug" className="text-muted-foreground underline underline-offset-4 text-sm">デバッグ</Link>
      </nav>
    </div>
  )
}
