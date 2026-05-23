import { useEffect, useState } from 'react'
import { Ban } from 'lucide-react'
import api from '@/lib/api'
import { useAdminToast } from '../components/AdminToast'

interface ReportItem {
  id: string
  reporter_id: string
  reporter_name: string | null
  reported_id: string
  reported_name: string | null
  reason: string
  detail: string | null
  created_at: string
  status?: string
}

export default function ReportsTab() {
  const { show } = useAdminToast()
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<ReportItem[]>('/api/admin/reports')
      .then((res) => setReports(res.data))
      .catch(() => setError('通報一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const handleSuspend = async (userId: string, userName: string | null) => {
    if (!window.confirm(`${userName ?? 'このユーザー'}を通報による停止にしますか？`)) return
    setSuspendingId(userId)
    try {
      await api.post(`/api/admin/suspend/${userId}`)
      show('停止しました')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '停止処理に失敗しました'
      show(msg)
    } finally {
      setSuspendingId(null)
    }
  }

  if (loading) {
    return <p className="font-mono text-sm py-8 text-center" style={{ color: 'var(--color-muted, #888)' }}>読み込み中...</p>
  }

  if (error) {
    return <p className="text-hot font-bold text-sm">{error}</p>
  }

  if (reports.length === 0) {
    return (
      <div className="card-bold rounded-[18px] bg-white p-6 text-center">
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted, #888)' }}>通報はありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div key={report.id} className="card-bold bg-white rounded-[18px] p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs font-mono" style={{ color: 'var(--color-muted, #888)' }}>通報者</span>
              <p className="font-medium text-ink">{report.reporter_name ?? '（名前未設定）'}</p>
            </div>
            <div>
              <span className="text-xs font-mono" style={{ color: 'var(--color-muted, #888)' }}>通報された人</span>
              <p className="font-medium text-ink">{report.reported_name ?? '（名前未設定）'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-acid border-2 border-ink font-mono text-xs px-2 py-0.5 inline-block">
              {report.reason}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--color-muted, #888)' }}>
              {new Date(report.created_at).toLocaleString('ja-JP')}
            </span>
          </div>

          {report.detail && (
            <div className="text-sm bg-acid/20 rounded-lg p-3 border border-ink/10">
              <span className="text-xs font-mono" style={{ color: 'var(--color-muted, #888)' }}>詳細: </span>
              <span className="text-ink">{report.detail}</span>
            </div>
          )}

          <button
            type="button"
            disabled={suspendingId === report.reported_id}
            onClick={() => handleSuspend(report.reported_id, report.reported_name)}
            className="inline-flex items-center justify-center h-8 gap-1.5 rounded-lg border-2 border-ink bg-hot text-white font-bold text-sm px-3 shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <Ban className="w-4 h-4" />
            {suspendingId === report.reported_id ? '処理中...' : 'ユーザーを停止'}
          </button>
        </div>
      ))}
    </div>
  )
}
