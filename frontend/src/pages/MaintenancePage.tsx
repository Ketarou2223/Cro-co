import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CrocoIllust from '@/components/CrocoIllust'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function MaintenancePage() {
  usePageTitle('メンテナンス中')

  return (
    <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-6">
      <div
        className="w-full max-w-sm bg-paper border-2 border-ink rounded-[18px] p-8 text-center"
        style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
      >
        <CrocoIllust size={80} className="mx-auto mb-6" />

        <div className="inline-block font-mono text-[11px] font-bold uppercase tracking-widest bg-warning border-2 border-ink px-3 py-1 mb-4">
          MAINTENANCE
        </div>

        <h1 className="font-display text-2xl font-black text-ink mb-3">
          ただいめんてな<br />んす中です
        </h1>

        <p className="text-sm text-ink/60 leading-relaxed mb-6">
          システムのメンテナンスを実施しています。<br />
          時間をおいて再度お試しください。
        </p>

        <Button
          variant="outline-bold"
          className="w-full gap-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" />
          再読み込み
        </Button>
      </div>
    </div>
  )
}
