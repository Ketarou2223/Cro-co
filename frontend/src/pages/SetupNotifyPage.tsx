// 解説: このファイルはプッシュ通知オプトインページを定義する（オンボーディング最終ステップ直前）。
// 解説: handleEnable = subscribePush()（ブラウザ通知許可ダイアログ）→ POST /api/profile/complete-onboarding → /setup/complete へ遷移
// 解説: handleSkip = 通知なしで POST /api/profile/complete-onboarding → /setup/complete へ遷移
// 解説: done=true になったとき 800ms 待ってから API を呼ぶ（成功アニメーションを見せるための意図的な遅延）
import { useEffect, useState } from 'react'
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
  const [isIOSBrowser, setIsIOSBrowser] = useState(false)
  useEffect(() => {
    // iOS は standalone(ホーム画面アイコンから起動)でないと Web Push が使えない(iOS 16.4+ 制約)
    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsIOSBrowser(ios && !standalone)
  }, [])

  const handleEnable = async () => {
    setLoading(true)
    let success = false
    try {
      success = await subscribePush()
      if (success) localStorage.setItem('notification-enabled', 'true')
    } catch {
      // 失敗しても進む
    }
    setLoading(false)
    // 成功した時だけ「設定しました」を見せる。失敗/不許可は静かに前進
    if (success) {
      setDone(true)
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    try {
      await api.post('/api/profile/complete-onboarding')
      await queryClient.refetchQueries({ queryKey: ['profile-me'] })
    } catch {
      // 失敗しても進む
    }
    navigate('/setup/complete', { replace: true })
  }

  const handleSkip = async () => {
    try {
      await api.post('/api/profile/complete-onboarding')
      await queryClient.refetchQueries({ queryKey: ['profile-me'] })
    } catch {
      // 失敗しても進む
    }
    navigate('/setup/complete', { replace: true })
  }

  return (
    <div className="h-[100dvh] flex flex-col max-w-[480px] mx-auto">
      {/* 上部: 黒背景 */}
      <div className="bg-ink flex-1 flex flex-col justify-center px-6 pt-8 pb-4 space-y-6">
        <div className="space-y-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--color-brand)', border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 var(--color-brand)' }}
          >
            <Bell className="w-8 h-8 text-ink" />
          </div>
          {/* @copy CRO-heading-setup-notify-01 Lv1 */}
          <h1 className="font-display text-4xl text-white leading-tight" style={{ fontWeight: 900 }}>
            通知をオンに<br />しておきましょう。
          </h1>
          {/* @copy CRO-onboarding-setup-notify-01 Lv1 */}
          <p className="text-white/60 text-sm leading-relaxed">
            マッチやいいねを見逃さないように。<br />
            設定からいつでも変更できます。
          </p>
        </div>

        {/* 通知の種類 */}
        <div className="space-y-3">
          {[
            // @copy CRO-label-setup-notify-01 Lv1
            { Icon: Heart, label: 'いいねが届いたとき', color: 'var(--color-like)' },
            // @copy CRO-label-setup-notify-02 Lv1
            { Icon: Zap, label: 'マッチが成立したとき', color: 'var(--color-brand)' },
            // @copy CRO-label-setup-notify-03 Lv1
            { Icon: MessageCircle, label: 'メッセージが届いたとき', color: 'var(--color-hash-azure)' },
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
      <div className="bg-white px-6 pt-5 space-y-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        {isIOSBrowser ? (
          <>
            {/* @copy CRO-onboarding-setup-notify-02 Lv1 */}
            <div
              className="p-4 rounded-xl"
              style={{ background: 'var(--color-bone)', border: '2px solid #0A0A0A' }}
            >
              <p className="text-sm text-ink leading-relaxed">
                iOSは、ホーム画面に追加したアプリから開くと通知をオンにできます。あとで設定からも変更できます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full h-14 font-bold text-base border-2 border-ink"
              style={{ background: '#0A0A0A', color: 'var(--color-brand)', borderRadius: 12, boxShadow: '4px 4px 0 0 #0A0A0A' }}
            >
              {/* @copy CRO-button-setup-notify-03 Lv1 */}
              次へ
            </button>
          </>
        ) : (
          <>
            {done ? (
              <div
                className="w-full h-14 flex items-center justify-center font-bold text-base rounded-xl border-2 border-ink"
                style={{ background: 'var(--color-success)' }}
              >
                {/* @copy CRO-banner-setup-notify-01 Lv1 */}
                設定しました。次へ進む…
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                className="w-full h-14 font-bold text-base border-2 border-ink"
                style={{
                  background: '#0A0A0A',
                  color: 'var(--color-brand)',
                  borderRadius: 12,
                  boxShadow: '4px 4px 0 0 #0A0A0A',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {/* @copy CRO-button-setup-notify-01 Lv1 */}
                {loading ? '設定中…' : '通知をオンにする'}
              </button>
            )}

            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-center text-muted text-sm font-medium py-2"
            >
              {/* @copy CRO-button-setup-notify-02 Lv1 */}
              あとで
            </button>
          </>
        )}
      </div>
    </div>
  )
}
