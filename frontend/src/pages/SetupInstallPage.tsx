// 解説: このファイルは PWA ホーム画面追加を促すオンボーディングページを定義する。
// 解説: canInstall = beforeinstallprompt イベントが発火済み（Android/Chrome で利用可）
// 解説: isIOS / isAndroid = UA で判定し、プラットフォーム別の手動インストール手順カードを表示する
// 解説: standalone モード検出時はすでにインストール済みとして /setup/optional に即リダイレクトする
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Bell, Zap } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export default function SetupInstallPage() {
  const navigate = useNavigate()
  const { canInstall, install } = usePWAInstall()
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      navigate('/setup/optional', { replace: true })
      return
    }
    const ua = navigator.userAgent
    setIsIOS(/iphone|ipad|ipod/i.test(ua))
    setIsAndroid(/android/i.test(ua))
  }, [navigate])

  const handleInstall = async () => {
    const outcome = await install()
    // 承認時のみ前進。却下/不可なら留まり、再試行か「あとで」を選べる
    if (outcome === 'accepted') navigate('/setup/optional', { replace: true })
  }

  const handleSkip = () => navigate('/setup/optional')

  return (
    <div className="h-[100dvh] flex flex-col max-w-[480px] mx-auto bg-ink">
      <div className="flex-1 flex flex-col justify-center px-6 pt-8 pb-4 space-y-6">
        <div className="space-y-3">
          <span
            className="inline-block font-mono text-xs font-bold px-3 py-1 uppercase tracking-wider"
            style={{ background: 'var(--color-brand)', border: '2px solid var(--color-brand)', borderRadius: 6 }}
          >
            {/* @copy CRO-label-setup-install-01 Lv1 */}
            おすすめ
          </span>
          {/* @copy CRO-heading-setup-install-01 Lv1 */}
          <h1 className="font-display text-3xl text-white leading-tight" style={{ fontWeight: 900 }}>
            アプリとして<br />追加しましょう。
          </h1>
          {/* @copy CRO-onboarding-setup-install-01 Lv1 */}
          <p className="text-white/60 text-sm leading-relaxed">
            ホーム画面からすぐにアクセスできます。<br />
            通知も受け取れるようになります。
          </p>
        </div>

        <div className="space-y-3">
          {[
            // @copy CRO-label-setup-install-02 Lv1
            { Icon: Bell, title: 'いいねやマッチを即通知', desc: 'アプリを閉じていても届きます' },
            // @copy CRO-label-setup-install-03 Lv1
            { Icon: Zap, title: '起動が速い', desc: 'ホーム画面からワンタップで開けます' },
            // @copy CRO-label-setup-install-04 Lv1
            { Icon: Download, title: '容量ほぼゼロ', desc: 'ストアからのダウンロード不要' },
          ].map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-brand)' }}
              >
                <Icon className="w-4 h-4 text-ink" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{title}</p>
                <p className="text-white/50 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* iOS の手順カード */}
        {!canInstall && isIOS && (
          <div
            className="w-full p-4 rounded-xl space-y-2"
            style={{ background: 'rgba(61,220,151,0.15)', border: '2px solid var(--color-brand)' }}
          >
            {/* @copy CRO-heading-setup-install-02 Lv1 */}
            <p className="text-brand font-bold text-sm">iOSの場合</p>
            {/* @copy CRO-onboarding-setup-install-02 Lv1 */}
            <ol className="text-white/70 text-xs leading-relaxed space-y-1 list-decimal list-inside">
              <li>Safari の下部にある共有ボタンをタップ</li>
              <li>「ホーム画面に追加」を選択してタップ</li>
              <li>右上の「追加」をタップして完了</li>
            </ol>
          </div>
        )}

        {/* Android の手順カード（インストールプロンプト未取得時） */}
        {!canInstall && isAndroid && (
          <div
            className="w-full p-4 rounded-xl space-y-2"
            style={{ background: 'rgba(61,220,151,0.15)', border: '2px solid var(--color-brand)' }}
          >
            <p className="text-brand font-bold text-sm">Androidの場合</p>
            <ol className="text-white/70 text-xs leading-relaxed space-y-1 list-decimal list-inside">
              <li>ブラウザ右上の「⋮」をタップ</li>
              <li>「ホーム画面に追加」を選択してタップ</li>
              <li>「追加」をタップして完了</li>
            </ol>
          </div>
        )}

      </div>

      <div className="px-6 space-y-3" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {(isIOS || (isAndroid && !canInstall)) ? (
          // iOS・Android手順カード表示時: 主ボタンで次へ
          <button
            type="button"
            onClick={handleSkip}
            className="w-full h-14 font-bold text-base border-2 border-brand text-ink"
            style={{ background: 'var(--color-brand)', borderRadius: 12, boxShadow: '4px 4px 0 0 #0A0A0A' }}
          >
            {/* @copy CRO-button-setup-install-06 Lv1 */}
            次へ →
          </button>
        ) : (
          // 非iOS: beforeinstallprompt が取れていればダウンロードボタン、右下に「今はいい」
          <>
            {canInstall && (
              <button
                type="button"
                onClick={handleInstall}
                className="w-full h-14 font-bold text-base border-2 border-ink text-ink flex items-center justify-center gap-2"
                style={{ background: 'var(--color-brand)', borderRadius: 12, boxShadow: '4px 4px 0 0 #0A0A0A' }}
              >
                <Download className="w-5 h-5" />
                {/* @copy CRO-button-setup-install-02 Lv1 */}
                ダウンロード
              </button>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSkip}
                className="text-white/40 text-sm font-medium py-2 px-1"
              >
                {/* @copy CRO-button-setup-install-05 Lv1 */}
                今はいい
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
