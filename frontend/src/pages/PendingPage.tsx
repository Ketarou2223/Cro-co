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

  const steps = [
    {
      num: '1',
      label: '登録完了',
      sub: 'アカウント作成',
      done: true,
      active: false,
    },
    {
      num: '2',
      label: isSubmitted ? '提出済み' : '提出待ち',
      sub: '学生証アップロード',
      done: isSubmitted,
      active: !isSubmitted,
    },
    {
      num: '3',
      label: '審査待ち',
      sub: '管理者による確認',
      done: false,
      active: isSubmitted,
    },
  ]

  return (
    <div className="min-h-screen bg-mint flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-10 max-w-sm mx-auto w-full">
        {/* アイコン＆タイトル */}
        <div className="text-8xl mb-4 text-center">⏳</div>
        <h1 className="font-display text-4xl text-ink text-center mb-3">審査中です。</h1>
        <span className="font-mono text-xs bg-ink text-white px-4 py-1.5 inline-block mb-8">
          PENDING REVIEW
        </span>

        {/* 説明カード */}
        <div className="card-bold bg-white rounded-[18px] p-5 w-full mb-4">
          {isSubmitted ? (
            <div className="space-y-3">
              <p className="text-sm text-ink/70">
                学生証を受け取りました。管理者が確認中です。<br />
                審査結果はメールでお知らせします。
              </p>
              {submittedDate && (
                <div className="bg-acid/30 border border-ink/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-ink/50 font-mono">提出日時</p>
                  <p className="text-sm font-bold text-ink">{submittedDate}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🪪</span>
                <div>
                  <p className="font-bold text-ink">学生証のアップロードが必要です</p>
                  <p className="text-xs text-ink/60">本人確認のため画像をご提出ください</p>
                </div>
              </div>
              <Button
                variant="bold"
                onClick={() => navigate('/upload-student-id')}
                className="w-full h-11 text-base"
              >
                学生証をアップロードする
              </Button>
            </div>
          )}
        </div>

        {/* ステップ表示 */}
        <div className="w-full space-y-2 mb-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`flex items-center gap-3 p-3 rounded-[14px] border-2 border-ink ${
                step.done
                  ? 'bg-acid'
                  : step.active
                  ? 'bg-ink text-white'
                  : 'bg-white'
              }`}
              style={{ boxShadow: '3px 3px 0 0 #0A0A0A' }}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                  step.done
                    ? 'bg-ink text-white border-ink'
                    : step.active
                    ? 'bg-white text-ink border-white'
                    : 'bg-white text-ink/40 border-ink/30'
                }`}
              >
                {step.done ? '✓' : step.num}
              </div>
              <div>
                <p className={`text-sm font-bold ${step.active ? 'text-white' : 'text-ink'}`}>
                  {step.label}
                </p>
                <p className={`text-xs font-mono ${step.active ? 'text-white/70' : 'text-ink/50'}`}>
                  {step.sub}
                </p>
              </div>
              {step.active && (
                <span className="ml-auto text-white/70 font-mono text-xs">⋯</span>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline-bold"
          onClick={handleLogout}
          className="w-full h-11"
        >
          ログアウト
        </Button>
      </div>
    </div>
  )
}
