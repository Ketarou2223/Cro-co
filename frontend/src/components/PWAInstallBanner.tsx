// 解説: このファイルは PWA ホーム画面追加を促すバナーコンポーネントを定義する。
// 解説: 呼ばれる場所: SetupInstallPage.tsx / SettingsPage.tsx 等でインストール誘導に使う
// 解説: canInstall(=beforeinstallprompt保持)を正として出し分け: canInstall → ワンタップ / iOS → 手順案内
// 解説: UAゲート撤廃済み: desktop Chrome でも canInstall が true であればバナーを表示する

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface Props {
  wrapperClassName?: string
}

export default function PWAInstallBanner({ wrapperClassName = 'mx-4 mb-4' }: Props) {
  const { canInstall, install, isInstalled } = usePWAInstall()
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  // 解説: guideType = インストール手順ダイアログの種類（null = 非表示）
  const [guideType, setGuideType] = useState<'ios' | 'android' | null>(null)

  useEffect(() => {
    // 解説: standalone = すでに PWA としてインストール済みならバナーを表示しない
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (isInstalled) return
    // 解説: pwa-banner-dismissed = 一度「閉じる」したユーザーには再表示しない
    if (localStorage.getItem('pwa-banner-dismissed')) return
    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua)
    setIsIOS(ios)
    // 解説: beforeinstallprompt を取得済み(canInstall) か iOS(手順案内が必要) のときだけ出す
    setShow(canInstall || ios)
  }, [canInstall, isInstalled])

  const handleDismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', '1')
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (canInstall) {
      // 解説: canInstall = beforeinstallprompt 保持済み → ワンタップでネイティブダイアログを出す
      const outcome = await install()
      if (outcome === 'accepted') setDismissed(true)
      // dismissed/unavailable はバナー維持（手順ガイドに落とさない）
      return
    }
    if (isIOS) {
      // 解説: iOS は BeforeInstallPromptEvent が使えないため、手順ガイドを表示する
      setGuideType('ios')
    }
  }

  if (!show || dismissed) return null

  // 解説: guideSteps = OS によって異なるインストール手順のテキスト配列
  const guideSteps =
    guideType === 'ios'
      ? [
          // @copy CRO-onboarding-pwa-install-01 Lv1
          '下の共有ボタン（四角に矢印）をタップ',
          // @copy CRO-onboarding-pwa-install-02 Lv1
          '「ホーム画面に追加」を選択',
          // @copy CRO-onboarding-pwa-install-03 Lv1
          '右上の「追加」をタップ',
        ]
      : guideType === 'android'
      ? [
          // @copy CRO-onboarding-pwa-install-04 Lv1
          'Chrome 右上の「⋮」メニューをタップ',
          // @copy CRO-onboarding-pwa-install-05 Lv1
          '「アプリをインストール」または「ホーム画面に追加」を選択',
          // @copy CRO-onboarding-pwa-install-06 Lv1
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
            style={{ background: 'var(--color-brand)' }}
          >
            <Download className="w-4 h-4 text-ink" />
          </div>
          <div className="flex-1 min-w-0">
            {/* @copy CRO-banner-pwa-install-01 Lv1 */}
            <p className="text-white font-bold text-sm">アプリとして追加しましょう</p>
            {/* @copy CRO-banner-pwa-install-02 Lv1 */}
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
          style={{ background: 'var(--color-brand)' }}
        >
          {canInstall
            ? /* @copy CRO-button-pwa-install-01 Lv1 */ 'インストール →'
            : /* @copy CRO-button-pwa-install-01-ios Lv1 */ '追加方法を見る →'}
        </button>
      </div>

      {/* 解説: guideType が設定されたとき手順ダイアログをモーダル表示する */}
      {guideType && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="w-full max-w-[480px] mx-auto rounded-t-2xl overflow-hidden"
            style={{ background: '#fff', border: '2px solid #0A0A0A' }}
          >
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              {/* @copy CRO-heading-pwa-install-01 Lv1 */}
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
                    style={{ background: 'var(--color-brand)', border: '1.5px solid #0A0A0A' }}
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
                style={{ background: '#0A0A0A', color: 'var(--color-brand)', borderRadius: 10 }}
              >
                {/* @copy CRO-button-pwa-install-02 Lv1 */}
                追加した！
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
