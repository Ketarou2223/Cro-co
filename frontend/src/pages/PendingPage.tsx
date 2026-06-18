// 解説: このファイルは学生証審査中ユーザーの待機ページを定義する。
// 解説: 表示条件: profile.status === 'pending_review'（ChatGuard が判定してリダイレクト）
// 解説: 機能: SVG 砂時計アニメーション + 3ステップ進捗表示 + 提出日時表示 + ログアウトボタン
// 解説: clearSensitiveStorage / clearAllDB = IndexedDB・localStorage の機微データをログアウト前に消去する
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import LoadingScreen from '@/components/LoadingScreen'
import { useProfile } from '@/hooks/useProfile'
import { clearAllDB, clearSensitiveStorage } from '@/lib/db'

export default function PendingPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { profile, isLoading } = useProfile()

  if (isLoading) return <LoadingScreen />

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/setup/required" replace />
  }
  if (profile && !profile.student_id_submitted) {
    return <Navigate to="/setup/required" replace />
  }

  const handleLogout = async () => {
    try {
      clearSensitiveStorage()
      await clearAllDB()
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[PendingPage] signOut error:', e)
    }
  }

  // 解説: isSubmitted = 学生証を提出済みかどうか（ステップ1のチェックマーク表示に使う）
  const isSubmitted = profile?.student_id_submitted ?? false

  // 解説: submittedDate = 提出日時を日本語フォーマット（例: 2026年6月11日 13:42）で表示する
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
      // @copy CRO-label-pending-01 Lv0
      label: '本人確認情報・学生証提出',
      // @copy CRO-label-pending-02 Lv0
      sub: '完了',
      done: isSubmitted,
      active: !isSubmitted,
    },
    {
      num: '2',
      // @copy CRO-label-pending-03 Lv0
      label: '審査中',
      // @copy CRO-label-pending-04 Lv0
      sub: 'アプリ内のステータスでご確認いただけます。',
      done: false,
      active: isSubmitted,
    },
    {
      num: '3',
      // @copy CRO-label-pending-05 Lv0
      label: 'チャット解放',
      // @copy CRO-label-pending-06 Lv0
      sub: '承認後にご利用いただけます。',
      done: false,
      active: false,
    },
  ]

  return (
    <div className="min-h-screen bg-brand/10 flex flex-col">
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
            <path d="M8 8 L72 8 L52 40 L28 40 Z" fill="var(--color-brand)" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round"/>
            <path d="M28 40 L52 40 L72 72 L8 72 Z" fill="var(--color-brand)" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round"/>
            <line x1="6" y1="8" x2="74" y2="8" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="6" y1="72" x2="74" y2="72" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="33" cy="16" r="2.5" fill="#0A0A0A" opacity="0.5"/>
            <circle cx="40" cy="16" r="2.5" fill="#0A0A0A" opacity="0.5"/>
            <circle cx="47" cy="16" r="2.5" fill="#0A0A0A" opacity="0.5"/>
            <circle cx="36" cy="23" r="2" fill="#0A0A0A" opacity="0.4"/>
            <circle cx="44" cy="23" r="2" fill="#0A0A0A" opacity="0.4"/>
            <ellipse cx="40" cy="64" rx="16" ry="5" fill="#0A0A0A" opacity="0.45"/>
            <circle cx="40" cy="40" r="2" fill="#0A0A0A"/>
          </svg>
        </div>

        {/* @copy CRO-heading-pending-01 Lv0 */}
        <h1 className="font-display text-4xl text-ink text-center mb-3">確認しています。</h1>
        <span className="font-mono text-xs bg-ink text-white px-4 py-1.5 inline-block mb-8">
          PENDING REVIEW
        </span>

        {/* 説明カード */}
        <div className="card-bold bg-white rounded-[18px] p-5 w-full mb-4">
          <div className="space-y-3">
            {/* @copy CRO-onboarding-pending-01 Lv0 */}
            <p className="text-sm text-ink/70">
              審査の間も、気になる人を探したり、いいねを送ったり、マッチしたりできます。チャットは承認後にご利用いただけます。
            </p>
            {submittedDate && (
              <div className="bg-brand/30 border border-ink/20 rounded-lg px-3 py-2">
                {/* @copy CRO-label-pending-07 Lv0 */}
                <p className="text-xs text-muted font-mono">提出日時</p>
                <p className="text-sm font-bold text-ink">{submittedDate}</p>
              </div>
            )}
            {/* @copy CRO-onboarding-pending-02 Lv0 */}
            <p className="text-xs text-muted">結果はアプリ内のステータスでご確認いただけます。もうしばらくお待ちください。</p>
          </div>
        </div>

        {/* ステップ表示 */}
        <div className="w-full space-y-2 mb-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`flex items-center gap-3 p-3 rounded-[14px] border-2 border-ink ${
                step.done
                  ? 'bg-brand'
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
                    : 'bg-white text-subtle border-ink/30'
                }`}
              >
                {step.done ? '✓' : step.num}
              </div>
              <div>
                <p className={`text-sm font-bold ${step.active ? 'text-white' : 'text-ink'}`}>
                  {step.label}
                </p>
                <p className={`text-xs font-mono ${step.active ? 'text-white/70' : 'text-muted'}`}>
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
          onClick={() => navigate('/home')}
          className="w-full h-11 mb-3"
        >
          {/* @copy CRO-button-pending-01 Lv1 */}
          ホームに戻る →
        </Button>

        <Button
          variant="outline-bold"
          onClick={handleLogout}
          className="w-full h-11"
        >
          {/* @copy CRO-button-pending-02 Lv1 */}
          ログアウト
        </Button>
      </div>
    </div>
  )
}
