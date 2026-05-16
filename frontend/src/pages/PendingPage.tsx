import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
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
      <style>{`
        @keyframes hourglassRock {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(12deg); }
          80% { transform: rotate(-12deg); }
        }
        .hourglass-animate {
          animation: hourglassRock 2.4s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-10 max-w-sm mx-auto w-full">
        {/* SVG 砂時計 */}
        <div className="hourglass-animate mb-4">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 上の台形 */}
            <path d="M8 8 L72 8 L52 40 L28 40 Z" fill="#A8F0D1" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round"/>
            {/* 下の台形 */}
            <path d="M28 40 L52 40 L72 72 L8 72 Z" fill="#A8F0D1" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round"/>
            {/* 上下の横棒 */}
            <line x1="6" y1="8" x2="74" y2="8" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="6" y1="72" x2="74" y2="72" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round"/>
            {/* 上部の砂 */}
            <circle cx="33" cy="16" r="2.5" fill="#0A0A0A" opacity="0.5"/>
            <circle cx="40" cy="16" r="2.5" fill="#0A0A0A" opacity="0.5"/>
            <circle cx="47" cy="16" r="2.5" fill="#0A0A0A" opacity="0.5"/>
            <circle cx="36" cy="23" r="2" fill="#0A0A0A" opacity="0.4"/>
            <circle cx="44" cy="23" r="2" fill="#0A0A0A" opacity="0.4"/>
            {/* 下部の砂（山盛り） */}
            <ellipse cx="40" cy="64" rx="16" ry="5" fill="#0A0A0A" opacity="0.45"/>
            {/* くびれの中央点 */}
            <circle cx="40" cy="40" r="2" fill="#0A0A0A"/>
          </svg>
        </div>

        <h1 className="font-display text-4xl text-ink text-center mb-3">確認中。</h1>
        <span className="font-mono text-xs bg-ink text-white px-4 py-1.5 inline-block mb-8">
          PENDING REVIEW
        </span>

        {/* 説明カード */}
        <div className="card-bold bg-white rounded-[18px] p-5 w-full mb-4">
          {isSubmitted ? (
            <div className="space-y-3">
              <p className="text-sm text-ink/70">
                確認してるから、どこにも行かないで。
              </p>
              {submittedDate && (
                <div className="bg-acid/30 border border-ink/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-ink/50 font-mono">提出日時</p>
                  <p className="text-sm font-bold text-ink">{submittedDate}</p>
                </div>
              )}
              <p className="text-xs text-ink/50">通常1〜2日以内に連絡する。待っててね。</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-ink shrink-0" />
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
