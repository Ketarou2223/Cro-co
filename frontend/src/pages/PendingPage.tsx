import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'

type Profile = {
  submitted_at: string | null
}

export default function PendingPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    api
      .get<Profile>('/api/profile/me')
      .then((res) => setProfile(res.data))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[PendingPage] signOut error:', e)
    }
  }

  const submittedDate = profile?.submitted_at
    ? new Date(profile.submitted_at).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            {profile?.submitted_at ? '審査中です' : '学生証のアップロードが必要です'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.submitted_at ? (
            <>
              <p className="text-sm text-muted-foreground">
                学生証を受け取りました。審査中です。
              </p>
              <p className="text-xs text-muted-foreground">提出日時: {submittedDate}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                本人確認のため、学生証の画像をアップロードしてください。
              </p>
              <Button onClick={() => navigate('/upload-student-id')} className="w-full">
                学生証をアップロードする
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleLogout} className="w-full">
            ログアウト
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
