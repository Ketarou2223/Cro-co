import { useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import LoadingScreen from '@/components/LoadingScreen'
import { useProfile } from '@/hooks/useProfile'
import api from '@/lib/api'
import { clearAllDB, clearSensitiveStorage } from '@/lib/db'

const SUPPORT_EMAIL = 'support@crocoweb.jp'

export default function RejectedPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { profile, isLoading } = useProfile()
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  useEffect(() => {
    api.get<{ rejection_reason: string | null }>('/api/profile/me')
      .then((res) => setRejectionReason(res.data.rejection_reason))
      .catch(() => {})
  }, [])

  if (isLoading) return <LoadingScreen />

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/setup/required" replace />
  }

  const handleLogout = async () => {
    try {
      clearSensitiveStorage()
      await clearAllDB()
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[RejectedPage] signOut error:', e)
    }
  }

  const handleReapply = () => {
    navigate('/setup/required?mode=reapply')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 上部バナー */}
      <div className="bg-hot py-12 px-6 text-center">
        {/* SVG盾 + × */}
        <div className="flex justify-center mb-4">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M48 8 L80 20 L80 52 Q80 72 48 88 Q16 72 16 52 L16 20 Z"
              fill="white"
              fillOpacity="0.2"
              stroke="white"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="33" y1="34" x2="63" y2="64" stroke="white" strokeWidth="4.5" strokeLinecap="round"/>
            <line x1="63" y1="34" x2="33" y2="64" stroke="white" strokeWidth="4.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="font-display text-2xl text-white">ごめん、今回は難しかった。</h1>
        <p className="font-mono text-xs text-white/70 mt-2">APPLICATION REJECTED</p>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 px-6 py-6 max-w-sm mx-auto w-full space-y-4">
        {/* 却下理由 */}
        <div className="card-bold bg-white rounded-[18px] p-5 space-y-2">
          <span className="bg-ink text-white font-mono text-xs px-2 py-0.5 inline-block">
            却下理由
          </span>
          <p className="text-sm text-ink leading-relaxed">
            {rejectionReason ?? '詳細は運営から連絡する。'}
          </p>
        </div>

        {/* 考えられる理由 */}
        <div className="card-bold bg-white rounded-[18px] p-5 space-y-2">
          <p className="font-bold text-sm text-ink">考えられる理由</p>
          <ul className="space-y-1.5">
            <li className="flex gap-2 text-sm text-ink/70">
              <span className="shrink-0">•</span><span>学生証の画像が鮮明でなかった</span>
            </li>
            <li className="flex gap-2 text-sm text-ink/70">
              <span className="shrink-0">•</span><span>学生証の有効期限が切れている</span>
            </li>
            <li className="flex gap-2 text-sm text-ink/70">
              <span className="shrink-0">•</span><span>対象大学の学生証ではない</span>
            </li>
          </ul>
        </div>

        {/* 再申請 */}
        <div className="card-bold bg-white rounded-[18px] p-5 space-y-3">
          <p className="text-xs text-muted">
            再申請のときは、顔と学生証が両方はっきり写った写真を提出して。
          </p>
          <Button
            variant="bold"
            onClick={handleReapply}
            className="w-full h-11 text-base"
          >
            もう一度だけ、試してみる
          </Button>
        </div>

        {/* サポート */}
        <div className="card-bold bg-white rounded-[18px] p-5 space-y-2 text-center">
          <p className="text-sm text-muted">ご不明な点はお問い合わせください</p>
          <Button variant="outline-bold" className="w-full h-10 text-sm gap-1.5" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="w-4 h-4" />
              {SUPPORT_EMAIL}
            </a>
          </Button>
        </div>

        <Button
          variant="outline-bold"
          onClick={() => navigate('/home')}
          className="w-full h-10 text-sm"
        >
          ← ホームに戻る
        </Button>
        <Button
          variant="outline-bold"
          onClick={handleLogout}
          className="w-full h-10 text-sm"
        >
          ログアウト
        </Button>
      </div>
    </div>
  )
}
