import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
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

  const isSubmitted = !!profile?.submitted_at

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
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-4">
      {/* ロゴ */}
      <div className="mb-8">
        <span className="text-2xl font-bold text-primary tracking-tight">Cro-co</span>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* ステップインジケーター */}
        <div className="flex items-center gap-0 justify-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              1
            </div>
            <span className="text-xs text-primary font-medium">登録</span>
          </div>
          <div className={`h-0.5 w-12 ${isSubmitted ? 'bg-primary' : 'bg-muted'}`} />
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isSubmitted
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              2
            </div>
            <span className={`text-xs font-medium ${isSubmitted ? 'text-primary' : 'text-muted-foreground'}`}>
              提出
            </span>
          </div>
          <div className="h-0.5 w-12 bg-muted" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
              3
            </div>
            <span className="text-xs text-muted-foreground font-medium">承認</span>
          </div>
        </div>

        {/* メインカード */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          {isSubmitted ? (
            <>
              {/* 審査中 */}
              <div className="flex flex-col items-center gap-4">
                {/* スピナーアニメーション */}
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-muted" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <h1 className="text-lg font-bold">審査中です</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    学生証を受け取りました。<br />
                    管理者が確認中です。しばらくお待ちください。
                  </p>
                </div>
              </div>

              {submittedDate && (
                <div className="bg-muted/50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">提出日時</p>
                  <p className="text-sm font-semibold mt-0.5">{submittedDate}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 未提出 */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-5xl">🪪</div>
                <div className="text-center">
                  <h1 className="text-lg font-bold">学生証のアップロードが必要です</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    本人確認のため、学生証の画像をアップロードしてください。
                  </p>
                </div>
              </div>

              <Button
                onClick={() => navigate('/upload-student-id')}
                className="w-full h-11 text-base"
              >
                学生証をアップロードする
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full text-muted-foreground"
        >
          ログアウト
        </Button>
      </div>
    </div>
  )
}
