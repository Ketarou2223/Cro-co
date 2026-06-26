// 解説: このファイルは管理ダッシュボードの「操作ログ」タブを定義する。
// 解説: GET /api/admin/logs で管理者の操作履歴（承認・却下・BAN・通報処理等）をページネーション付きで取得・表示する
// 解説: admin_email / action / target_type / target_id / created_at を一覧表示する
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface AdminLog {
  id: string
  admin_id: string
  admin_email: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

interface LogsResponse {
  logs: AdminLog[]
  total: number
  page: number
  page_size: number
}

const ACTION_LABEL: Record<string, string> = {
  view_user_detail:      'ユーザー詳細を閲覧',
  ban_user:              'ユーザーをBAN',
  unban_user:            'BAN解除',
  update_report:         '通報を更新',
  reply_inquiry:         '問い合わせに返信',
  update_inquiry_status: '問い合わせを更新',
  approve:               'ユーザーを承認',
  reject:                'ユーザーを却下',
  suspend:               'ユーザーを停止',
  approve_user:          'ユーザーを承認',
  reject_user:           'ユーザーを却下',
  suspend_user:          'ユーザーを停止',
  privacy_purge:         '個人情報削除バッチ実行',
}

export default function LogsTab() {
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page],
    queryFn: () =>
      api
        .get<LogsResponse>(`/api/admin/logs?page=${page}&page_size=${PAGE_SIZE}`)
        .then((r) => r.data),
    staleTime: 60_000,
  })

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-accent font-bold text-xs text-muted">
          全 {data?.total ?? '—'} 件 / ページ {page} / {totalPages}
        </p>
        <p className="text-[13px] text-muted">
          管理者操作の監査ログ（改ざん不可）
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted">読み込み中...</p>}

      {!isLoading && (data?.logs.length ?? 0) === 0 && (
        <div className="card-bold rounded-[14px] bg-white p-6 text-center">
          <p className="text-sm text-muted">ログなし</p>
        </div>
      )}

      <div className="space-y-1.5">
        {data?.logs.map((log) => (
          <div
            key={log.id}
            className="bg-white border-2 border-ink/20 rounded-lg px-3 py-2 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-accent text-[13px] font-bold text-ink">
                  {ACTION_LABEL[log.action] ?? log.action}
                </span>
                {log.target_type && (
                  <span className="font-accent font-bold text-[9px] text-muted">
                    [{log.target_type}]
                  </span>
                )}
              </div>
              <p className="font-accent font-bold text-[13px] text-muted">
                {log.admin_email}
                {log.ip_address && ` / ${log.ip_address}`}
              </p>
              {Object.keys(log.details).length > 0 && (
                <p className="font-accent font-bold text-[9px] text-ink/60 truncate">
                  {JSON.stringify(log.details)}
                </p>
              )}
            </div>
            <span className="font-accent font-bold text-[9px] text-muted shrink-0">
              {new Date(log.created_at).toLocaleString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border-2 border-ink bg-white font-accent text-xs font-bold disabled:opacity-30"
            style={{ borderRadius: 6 }}
          >
            ← 前
          </button>
          <span className="font-accent font-bold text-xs">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border-2 border-ink bg-white font-accent text-xs font-bold disabled:opacity-30"
            style={{ borderRadius: 6 }}
          >
            次 →
          </button>
        </div>
      )}
    </div>
  )
}
