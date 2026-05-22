import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Bell, Zap } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export default function SetupInstallPage() {
  const navigate = useNavigate()
  const { canInstall, install } = usePWAInstall()
  const [isInstalled, setIsInstalled] = useState(false)
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
    if (outcome === 'accepted') setIsInstalled(true)
  }

  const handleSkip = () => navigate('/setup/optional')
  const handleContinue = () => navigate('/setup/optional')

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] mx-auto bg-ink">
      <div className="flex-1 flex flex-col justify-center px-6 pt-16 pb-8 space-y-8">
        <div className="space-y-3">
          <span
            className="inline-block font-mono text-xs font-bold px-3 py-1 uppercase tracking-wider"
            style={{ background: '#DFFF1F', border: '2px solid #DFFF1F', borderRadius: 6 }}
          >
            おすすめ
          </span>
          <h1 className="font-display text-5xl text-white leading-tight" style={{ fontWeight: 900 }}>
            アプリとして<br />追加しよう。
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            ホーム画面から即アクセス。<br />
            通知も受け取れるようになる。
          </p>
        </div>

        <div className="space-y-3">
          {[
            { Icon: Bell, title: 'いいねやマッチを即通知', desc: 'アプリを閉じていても知らせる' },
            { Icon: Zap, title: '起動が速い', desc: 'ホーム画面からワンタップで開く' },
            { Icon: Download, title: '容量ほぼゼロ', desc: 'ストアからのダウンロード不要' },
          ].map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: '#DFFF1F' }}
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
        {!isInstalled && !canInstall && isIOS && (
          <div
            className="w-full p-4 rounded-xl space-y-2"
            style={{ background: 'rgba(223,255,31,0.15)', border: '2px solid #DFFF1F' }}
          >
            <p className="text-acid font-bold text-sm">iOSの場合</p>
            <ol className="text-white/70 text-xs leading-relaxed space-y-1 list-decimal list-inside">
              <li>Safari の下部にある共有ボタンをタップ</li>
              <li>「ホーム画面に追加」を選択してタップ</li>
              <li>右上の「追加」をタップして完了</li>
            </ol>
          </div>
        )}

        {/* Android で canInstall=false の手順カード */}
        {!isInstalled && !canInstall && !isIOS && isAndroid && (
          <div
            className="w-full p-4 rounded-xl space-y-2"
            style={{ background: 'rgba(223,255,31,0.15)', border: '2px solid #DFFF1F' }}
          >
            <p className="text-acid font-bold text-sm">Androidの場合</p>
            <ol className="text-white/70 text-xs leading-relaxed space-y-1 list-decimal list-inside">
              <li>Chrome 右上の「⋮」メニューをタップ</li>
              <li>「アプリをインストール」または「ホーム画面に追加」を選択</li>
              <li>「インストール」をタップして完了</li>
            </ol>
          </div>
        )}
      </div>

      <div className="px-6 pb-12 space-y-3">
        {isInstalled ? (
          <button
            type="button"
            onClick={handleContinue}
            className="w-full h-14 font-bold text-base border-2 border-acid text-ink"
            style={{ background: '#DFFF1F', borderRadius: 12, boxShadow: '4px 4px 0 0 #DFFF1F' }}
          >
            追加した！次へ →
          </button>
        ) : canInstall ? (
          <button
            type="button"
            onClick={handleInstall}
            className="w-full h-14 font-bold text-base border-2 border-acid text-ink"
            style={{ background: '#DFFF1F', borderRadius: 12, boxShadow: '4px 4px 0 0 #DFFF1F' }}
          >
            ホーム画面に追加する
          </button>
        ) : (isIOS || isAndroid) ? (
          <button
            type="button"
            onClick={handleContinue}
            className="w-full h-14 font-bold text-base border-2 border-acid text-ink"
            style={{ background: '#DFFF1F', borderRadius: 12, boxShadow: '4px 4px 0 0 #DFFF1F' }}
          >
            手順通りに追加した
          </button>
        ) : (
          <button
            type="button"
            onClick={handleContinue}
            className="w-full h-14 font-bold text-base border-2 border-acid text-ink"
            style={{ background: '#DFFF1F', borderRadius: 12, boxShadow: '4px 4px 0 0 #DFFF1F' }}
          >
            次へ進む →
          </button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-center text-white/40 text-sm font-medium py-2"
        >
          あとで追加する
        </button>
      </div>
    </div>
  )
}
