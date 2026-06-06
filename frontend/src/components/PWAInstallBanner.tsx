import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface Props {
  wrapperClassName?: string
}

export default function PWAInstallBanner({ wrapperClassName = 'mx-4 mb-4' }: Props) {
  const { install } = usePWAInstall()
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [guideType, setGuideType] = useState<'ios' | 'android' | null>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa-banner-dismissed')) return
    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua)
    const android = /android/i.test(ua)
    if (!ios && !android) return
    setIsIOS(ios)
    setShow(true)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', '1')
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (isIOS) {
      setGuideType('ios')
      return
    }
    // Android: ネイティブプロンプトを試し、失敗時は手順表示
    const outcome = await install()
    if (outcome === 'accepted') {
      setDismissed(true)
    } else if (outcome === 'unavailable') {
      setGuideType('android')
    }
    // 'dismissed' は何もしない
  }

  if (!show || dismissed) return null

  const guideSteps =
    guideType === 'ios'
      ? [
          '下の共有ボタン（四角に矢印）をタップ',
          '「ホーム画面に追加」を選択',
          '右上の「追加」をタップ',
        ]
      : guideType === 'android'
      ? [
          'Chrome 右上の「⋮」メニューをタップ',
          '「アプリをインストール」または「ホーム画面に追加」を選択',
          '「インストール」をタップ',
        ]
      : []

  return (
    <>
      <div
        className={`${wrapperClassName} rounded-xl overflow-hidden`}
        style={{ border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A' }}
      >
        <div className="bg-ink px-4 py-3 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#DFFF1F' }}
          >
            <Download className="w-4 h-4 text-ink" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">アプリとして追加しましょう</p>
            <p className="text-white/50 text-xs">通知・即起動が使えるようになります</p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 text-white/30 hover:text-white/60 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="w-full py-2.5 font-mono text-xs font-bold text-ink uppercase tracking-wide"
          style={{ background: '#DFFF1F' }}
        >
          ホーム画面に追加する →
        </button>
      </div>

      {guideType && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="w-full max-w-[480px] mx-auto rounded-t-2xl overflow-hidden"
            style={{ background: '#fff', border: '2px solid #0A0A0A' }}
          >
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <p className="font-bold text-ink text-base">ホーム画面に追加する方法</p>
              <button type="button" onClick={() => setGuideType(null)}>
                <X className="w-5 h-5 text-ink/40" />
              </button>
            </div>
            <div className="px-5 pb-4 space-y-3">
              {guideSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold"
                    style={{ background: '#DFFF1F', border: '1.5px solid #0A0A0A' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm text-ink">{step}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-6">
              <button
                type="button"
                onClick={() => { setGuideType(null); handleDismiss() }}
                className="w-full h-12 font-bold text-sm border-2 border-ink"
                style={{ background: '#0A0A0A', color: '#DFFF1F', borderRadius: 10 }}
              >
                追加した！
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
