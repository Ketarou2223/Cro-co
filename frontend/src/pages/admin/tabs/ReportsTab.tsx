// 解説: このファイルは管理ダッシュボードの「通報」タブを定義する。
// 解説: 機能: ユーザー通報一覧（GET /api/admin/reports）→ ステータス変更（pending/investigating/resolved/dismissed）
// 解説: 通報対象ユーザーの名前クリックで UserDetailDialog を開き、詳細確認・BAN ができる
// 解説: 通報ステータスは PATCH /api/admin/reports/:id で変更する
import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import api from '@/lib/api'
import { useAdminToast } from '../components/AdminToast'
import UserDetailDialog from '../components/UserDetailDialog'

type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed'

interface ReportItem {
  id: string
  reporter_id: string
  reporter_name: string | null
  reported_id: string
  reported_name: string | null
  reason: string
  detail: string | null
  created_at: string
  status: ReportStatus
  resolved_at: string | null
  resolution_note: string | null
  action_taken: string | null
  reported_user_status: string | null
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; bg: string; fg: string; Icon: typeof Clock }> = {
  pending:       { label: '未対応', bg: 'var(--color-danger)', fg: '#fff', Icon: AlertTriangle },
  investigating: { label: '調査中', bg: 'var(--color-warning)', fg: '#0A0A0A', Icon: Clock },
  resolved:      { label: '対応済み', bg: 'var(--color-success)', fg: '#0A0A0A', Icon: CheckCircle },
  dismissed:     { label: '却下', bg: 'var(--color-bone)', fg: 'rgba(10,10,10,0.6)', Icon: XCircle },
}

const ACTION_OPTIONS = [
  { value: 'none', label: '対応なし' },
  { value: 'warning', label: '警告' },
  { value: 'suspend', label: '一時停止' },
  { value: 'ban', label: 'BAN' },
] as const

export default function ReportsTab() {
  const toast = useAdminToast()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: () => {
      const url = statusFilter === 'all'
        ? '/api/admin/reports'
        : `/api/admin/reports?status=${statusFilter}`
      return api.get<ReportItem[]>(url).then((r) => r.data)
    },
    staleTime: 30_000,
  })

  const filteredReports = (reports ?? []).filter((r) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return r.reason.toLowerCase().includes(q) || (r.detail?.toLowerCase() ?? '').includes(q)
  })

  const updateReport = useCallback(async (
    reportId: string,
    reportStatus: ReportStatus,
    note?: string,
    action?: string,
  ) => {
    setUpdatingId(reportId)
    try {
      await api.patch(`/api/admin/reports/${reportId}`, {
        status: reportStatus,
        resolution_note: note ?? null,
        action_taken: action ?? null,
      })
      await qc.invalidateQueries({ queryKey: ['admin-reports'] })
      await qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.show('通報を更新しました')
    } catch {
      toast.show('更新に失敗しました')
    } finally {
      setUpdatingId(null)
    }
  }, [qc, toast])

  const handleSuspend = async (reportId: string, userId: string) => {
    if (!window.confirm('このユーザーを停止しますか？')) return
    try {
      await api.post(`/api/admin/suspend/${userId}`)
      await updateReport(reportId, 'resolved', '通報による停止', 'suspend')
    } catch {
      toast.show('停止に失敗しました')
    }
  }

  const openUserDetail = (userId: string) => {
    setDetailUserId(userId)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'pending', 'investigating', 'resolved', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`font-mono text-[13px] font-bold px-2.5 py-1 border-2 border-ink transition-colors ${
              statusFilter === s ? 'bg-ink text-white' : 'bg-white text-ink'
            }`}
            style={{ borderRadius: 6 }}
          >
            {s === 'all' ? 'すべて' : STATUS_CONFIG[s].label}
            {s === 'pending' && (reports?.filter((r) => r.status === 'pending').length ?? 0) > 0 && (
              <span className="ml-1 px-1 py-0.5 rounded-full text-[9px] bg-hot text-white">
                {reports?.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="理由・詳細で検索..."
        className="w-full font-mono text-xs px-3 py-2 border-2 border-ink bg-white text-ink placeholder:text-ink/40 outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
        style={{ borderRadius: 8 }}
      />

      {isLoading && <p className="font-mono text-sm text-muted">読み込み中...</p>}

      {!isLoading && filteredReports.length === 0 && (
        <div className="card-bold rounded-[14px] bg-white p-6 text-center">
          <p className="font-mono text-sm text-muted">
            {searchQuery.trim() ? '該当する通報なし' : '通報なし'}
          </p>
        </div>
      )}

      {filteredReports.map((r) => {
        const sc = STATUS_CONFIG[r.status]
        const isUpdating = updatingId === r.id
        return (
          <div key={r.id} className="card-bold bg-white rounded-[14px] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 font-mono text-[13px] font-bold px-2 py-0.5"
                  style={{ background: sc.bg, color: sc.fg, border: '1.5px solid #0A0A0A', borderRadius: 4 }}
                >
                  <sc.Icon className="w-3 h-3" />
                  {sc.label}
                </span>
                <span className="font-mono text-[13px] text-muted">
                  {new Date(r.created_at).toLocaleString('ja-JP')}
                </span>
              </div>
              <span
                className="font-mono text-[13px] font-bold px-2 py-0.5 border-2 border-ink bg-brand"
                style={{ borderRadius: 4 }}
              >
                {r.reason}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-mono text-[13px] font-bold text-ink/60 mb-0.5">通報者</p>
                <p className="font-bold text-ink">{r.reporter_name ?? '—'}</p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => openUserDetail(r.reported_id)}
                  className="text-left w-full"
                >
                  <p className="font-mono text-[13px] font-bold text-ink/60 mb-0.5">通報対象 → クリックで詳細</p>
                  <p className="font-bold text-ink underline decoration-dotted">
                    {r.reported_name ?? '—'}
                    {r.reported_user_status === 'banned' && (
                      <span className="ml-1 font-mono text-[9px] text-hot">BAN中</span>
                    )}
                  </p>
                </button>
              </div>
            </div>

            {r.detail && (
              <div className="bg-ink/5 border-2 border-ink/20 rounded-lg p-2.5 text-sm text-ink">
                {r.detail}
              </div>
            )}

            {r.resolution_note && (
              <div className="bg-bone border-2 border-ink/30 rounded-lg p-2.5 text-xs text-ink">
                <span className="font-mono font-bold">対応メモ: </span>{r.resolution_note}
                {r.action_taken && r.action_taken !== 'none' && (
                  <span className="ml-2 font-mono font-bold text-hot">
                    [{ACTION_OPTIONS.find((a) => a.value === r.action_taken)?.label ?? r.action_taken}]
                  </span>
                )}
              </div>
            )}

            {r.status === 'pending' && (
              <div className="flex gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updateReport(r.id, 'investigating')}
                  className="font-mono text-[13px] font-bold px-3 py-1.5 border-2 border-ink bg-brand text-ink disabled:opacity-50"
                  style={{ borderRadius: 6, boxShadow: '3px 3px 0 0 #0A0A0A' }}
                >
                  調査開始
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updateReport(r.id, 'dismissed', '通報内容を確認の上、対応不要と判断', 'none')}
                  className="font-mono text-[13px] font-bold px-3 py-1.5 border-2 border-ink bg-white text-ink disabled:opacity-50"
                  style={{ borderRadius: 6 }}
                >
                  却下
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleSuspend(r.id, r.reported_id)}
                  className="font-mono text-[13px] font-bold px-3 py-1.5 border-2 border-ink bg-hot text-white disabled:opacity-50"
                  style={{ borderRadius: 6, boxShadow: '3px 3px 0 0 #0A0A0A' }}
                >
                  停止
                </button>
              </div>
            )}
            {r.status === 'investigating' && (
              <div className="flex gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updateReport(r.id, 'resolved', '調査完了・対応済み', 'warning')}
                  className="font-mono text-[13px] font-bold px-3 py-1.5 border-2 border-ink bg-brand text-ink disabled:opacity-50"
                  style={{ borderRadius: 6, boxShadow: '3px 3px 0 0 #0A0A0A' }}
                >
                  警告して解決
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleSuspend(r.id, r.reported_id)}
                  className="font-mono text-[13px] font-bold px-3 py-1.5 border-2 border-ink bg-hot text-white disabled:opacity-50"
                  style={{ borderRadius: 6, boxShadow: '3px 3px 0 0 #0A0A0A' }}
                >
                  停止して解決
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updateReport(r.id, 'dismissed', '調査の結果、対応不要と判断', 'none')}
                  className="font-mono text-[13px] font-bold px-3 py-1.5 border-2 border-ink bg-white text-ink disabled:opacity-50"
                  style={{ borderRadius: 6 }}
                >
                  却下
                </button>
              </div>
            )}
          </div>
        )
      })}

      <UserDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        userId={detailUserId}
        onChange={() => qc.invalidateQueries({ queryKey: ['admin-reports'] })}
      />
    </div>
  )
}
