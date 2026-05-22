import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, Heart, MessageCircle, Zap } from 'lucide-react'
import { subscribePush } from '@/lib/push'
import api from '@/lib/api'

export default function SetupNotifyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleEnable = async () => {
    setLoading(true)
    try {
      const success = await subscribePush()
      if (success) {
        localStorage.setItem('notification-enabled', 'true')
      }
    } catch {
      // 失敗しても進む
    }
    setDone(true)
    setLoading(false)
    await new Promise(resolve => setTimeout(resolve, 800))
    try {
      await api.patch('/api/profile/me', { onboarding_completed: true })
      await queryClient.refetchQueries({ queryKey: ['profile-me'] })
    } catch {
      // 失敗しても進む
    }
    navigate('/setup/complete', { replace: true })
  }

  const handleSkip = async () => {
    try {
      await api.patch('/api/profile/me', { onboarding_completed: true })
      await queryClient.refetchQueries({ queryKey: ['profile-me'] })
    } catch {
      // 失敗しても進む
    }
    navigate('/setup/complete', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] mx-auto">
      {/* 上部: 黒背景 */}
      <div className="bg-ink flex-1 flex flex-col justify-center px-6 pt-16 pb-8 space-y-8">
        <div className="space-y-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#DFFF1F', border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #DFFF1F' }}
          >
            <Bell className="w-8 h-8 text-ink" />
          </div>
          <h1 className="font-display text-4xl text-white leading-tight" style={{ fontWeight: 900 }}>
            通知をオンに<br />しておこう。
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            マッチやいいねを見逃さないために。<br />
            いつでも設定から変更できる。
          </p>
        </div>

        {/* 通知の種類 */}
        <div className="space-y-3">
          {[
            { Icon: Heart, label: 'いいねが届いたとき', color: '#FF3B6B' },
            { Icon: Zap, label: 'マッチが成立したとき', color: '#DFFF1F' },
            { Icon: MessageCircle, label: 'メッセージが届いたとき', color: '#A8F0D1' },
          ].map(({ Icon, label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: color }}
              >
                <Icon className="w-4 h-4 text-ink" />
              </div>
              <p className="text-white/80 text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ボトムボタン */}
      <div className="bg-white px-6 pt-6 pb-12 space-y-3">
        {done ? (
          <div
            className="w-full h-14 flex items-center justify-center font-bold text-base rounded-xl border-2 border-ink"
            style={{ background: '#A8F0D1' }}
          >
            設定した！次へ進む...
          </div>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="w-full h-14 font-bold text-base border-2 border-ink"
            style={{
              background: '#0A0A0A',
              color: '#DFFF1F',
              borderRadius: 12,
              boxShadow: '4px 4px 0 0 #0A0A0A',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '設定中...' : '通知をオンにする →'}
          </button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-center text-muted text-sm font-medium py-2"
        >
          あとで設定する
        </button>
      </div>
    </div>
  )
}
