// 解説: このファイルはユーザー一覧テーブルコンポーネントを定義する（UsersTab で使用）。
// 解説: 行クリックで onSelect(id) を呼び、UsersTab が UserDetailDialog を開く
// 解説: StatusBadge = 各行にステータスバッジを表示する子コンポーネント
import { User as UserIcon } from 'lucide-react'
import StatusBadge from './StatusBadge'
import type { UserListItem } from '../types'

interface Props {
  users: UserListItem[]
  onSelect: (id: string) => void
  loading?: boolean
}

export default function UserListTable({ users, onSelect, loading }: Props) {
  if (loading) {
    return <p className="text-sm text-center py-8" style={{ color: 'var(--color-muted, #888)' }}>読み込み中...</p>
  }
  if (users.length === 0) {
    return (
      <div className="card-bold rounded-[14px] bg-white p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--color-muted, #888)' }}>該当ユーザーなし</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => onSelect(u.id)}
          className="w-full card-bold bg-white rounded-[12px] p-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
        >
          {/* アバター */}
          <div
            className="w-12 h-12 rounded-lg border-2 border-ink shrink-0 overflow-hidden flex items-center justify-center"
            style={{ background: '#F5F5F5' }}
          >
            {u.profile_image_url ? (
              <img src={u.profile_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-ink/30" />
            )}
          </div>

          {/* 情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-ink truncate text-sm">{u.name ?? '（未設定）'}</p>
              <StatusBadge status={u.status} />
            </div>
            <p className="font-accent font-bold text-[13px] truncate" style={{ color: 'var(--color-muted, #888)' }}>{u.email}</p>
            <p className="text-xs text-ink/70 truncate">
              {[
                u.year != null ? `${u.year}年` : null,
                u.faculty,
                u.gender === 'male' ? '男性' : u.gender === 'female' ? '女性' : null,
              ].filter(Boolean).join(' / ') || '未設定'}
            </p>
          </div>

          {/* 最終活動 */}
          <div className="shrink-0 text-right">
            <p className="font-accent font-bold text-[13px]" style={{ color: 'var(--color-muted, #888)' }}>LAST REVIEWED</p>
            <p className="font-accent font-bold text-[13px] text-ink">
              {u.last_seen_at
                ? new Date(u.last_seen_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
                : '—'}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
