import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Power } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useAdminToast } from '../components/AdminToast'

export default function MaintenanceTab() {
  const qc = useQueryClient()
  const { show } = useAdminToast()
  const [confirming, setConfirming] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-maintenance'],
    queryFn: () =>
      api.get<{ maintenance: boolean }>('/api/admin/maintenance').then((r) => r.data),
    staleTime: 10_000,
  })

  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      api.post<{ ok: boolean; maintenance: boolean }>('/api/admin/maintenance', { enabled }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-maintenance'] })
      const on = res.data.maintenance
      show(`メンテナンスモードを${on ? 'ON' : 'OFF'}にしました`)
      setConfirming(false)
    },
    onError: () => {
      show('切り替えに失敗しました')
      setConfirming(false)
    },
  })

  const isMaintenance = data?.maintenance ?? false

  const handleToggle = () => {
    if (isMaintenance) {
      toggle.mutate(false)
    } else {
      setConfirming(true)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div
        className="border-2 border-ink rounded-[18px] p-6"
        style={{ boxShadow: '4px 4px 0 0 var(--color-ink)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Power className="w-5 h-5 text-ink" />
          <h2 className="font-display text-lg font-black text-ink">メンテナンスモード</h2>
        </div>

        <div className="flex items-center gap-3 mb-6 p-3 rounded-lg border-2 border-ink bg-bone">
          <div
            className="w-3 h-3 rounded-full border-2 border-ink"
            style={{ background: isMaintenance ? 'var(--color-danger)' : 'var(--color-success)' }}
          />
          <span className="font-mono text-sm font-bold text-ink">
            {isLoading ? '読み込み中...' : isMaintenance ? 'ON（メンテナンス中）' : 'OFF（通常稼働中）'}
          </span>
        </div>

        {!confirming ? (
          <Button
            variant={isMaintenance ? 'brand' : 'bold'}
            className="w-full"
            onClick={handleToggle}
            disabled={isLoading || toggle.isPending}
          >
            {isMaintenance ? 'メンテナンスを終了する' : 'メンテナンスを開始する'}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-danger/10 border-2 border-danger rounded-lg">
              <AlertTriangle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
              <p className="text-sm font-bold text-ink">
                全ユーザーのアクセスを遮断します。本当に開始しますか？
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="bold"
                className="flex-1 !bg-danger !border-danger"
                onClick={() => toggle.mutate(true)}
                disabled={toggle.isPending}
              >
                {toggle.isPending ? '処理中...' : '開始する'}
              </Button>
              <Button
                variant="outline-bold"
                className="flex-1"
                onClick={() => setConfirming(false)}
                disabled={toggle.isPending}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-ink/50 space-y-1 font-mono">
        <p>・ ON にすると admin 以外の全リクエストを遮断します</p>
        <p>・ 切り替えは最大 15 秒で全サーバーに伝播します</p>
        <p>・ OFF に戻すとユーザーは自動で元の画面に戻ります</p>
      </div>
    </div>
  )
}
