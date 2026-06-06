import { usePWAInstall } from '@/hooks/usePWAInstall'

export default function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWAInstall()

  if (!needRefresh) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 max-w-[480px] mx-auto">
      <div className="bg-acid border-b-2 border-ink px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-bold text-ink">新しいバージョンがあります。</span>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="text-xs font-mono font-bold text-ink underline"
        >
          UPDATE
        </button>
      </div>
    </div>
  )
}
