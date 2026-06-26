// 解説: このファイルは Service Worker の新バージョンが利用可能なとき表示するバナーコンポーネントを定義する。
// 解説: 呼ばれる場所: Layout.tsx か App.tsx でページ上部に常時表示（needRefresh = true のとき）
// 解説: needRefresh = Service Worker の新バージョンが待機中の状態（vite-plugin-pwa が検知）
// 解説: updateServiceWorker(true) = 新バージョンの Service Worker を即時適用してページをリロードする

import { usePWAInstall } from '@/hooks/usePWAInstall'

export default function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWAInstall()

  // 解説: needRefresh = false のときはバナー非表示（通常時）
  if (!needRefresh) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 max-w-[480px] mx-auto">
      <div className="bg-brand border-b-2 border-ink px-4 py-2 flex items-center justify-between">
        {/* @copy CRO-banner-pwa-update-01 Lv1 */}
        <span className="text-sm font-bold text-ink">新しいバージョンがあります。</span>
        {/* 解説: updateServiceWorker(true) = 新 SW を即時起動して reload する */}
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="text-xs font-accent font-bold text-ink underline"
        >
          UPDATE
        </button>
      </div>
    </div>
  )
}
