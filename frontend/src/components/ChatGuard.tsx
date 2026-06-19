// 解説: このファイルは審査中・却下ユーザーのチャット機能利用を制限するガードを定義する（§5 保護ファイル・ロジック変更禁止）。
// 解説: status=pending_review → チャット利用不可の案内画面を表示（「承認後にご利用ください」）
// 解説: status=rejected → 学生証再提出促進画面を表示（「再提出する」ボタンで /setup/required?mode=reapply へ）
// 解説: App.tsx で ChatPage・MatchesPage 等のチャット系ルートをラップしている
import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Clock } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import LoadingScreen from '@/components/LoadingScreen'

export default function ChatGuard({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useProfile()
  const navigate = useNavigate()

  if (isLoading) return <LoadingScreen />

  if (profile?.status === 'pending_review') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-[480px] mx-auto text-center gap-6">
        <Clock className="w-12 h-12 text-ink/40" />
        <p className="font-bold text-ink text-base leading-relaxed">
          現在審査中のためチャット機能はご利用いただけません。承認後にご利用ください。
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-11 px-6 font-bold text-sm border-2 border-ink"
          style={{ background: '#0A0A0A', color: '#fff', borderRadius: 8, boxShadow: '3px 3px 0 0 #0A0A0A' }}
        >
          戻る
        </button>
      </div>
    )
  }

  if (profile?.status === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-[480px] mx-auto text-center gap-6">
        <AlertCircle className="w-12 h-12 text-hot" />
        <p className="font-bold text-ink text-base">
          学生証の再提出が必要です。
        </p>
        <button
          type="button"
          onClick={() => navigate('/setup/required?mode=reapply')}
          className="h-11 px-6 font-bold text-sm border-2 border-ink"
          style={{ background: '#FF3B6B', color: '#fff', borderRadius: 8, boxShadow: '3px 3px 0 0 #0A0A0A' }}
        >
          再提出する
        </button>
      </div>
    )
  }

  return <>{children}</>
}
