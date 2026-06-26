// 解説: このファイルは管理ダッシュボードの「ユーザー管理」タブを定義する。
// 解説: ステータスフィルタ（全員/審査中/承認済み/却下/BAN）+ キーワード検索で一覧表示する
// 解説: UserListTable = 一覧テーブルコンポーネント（行クリックで UserDetailDialog を開く）
// 解説: ページネーション: page/perPage を useState で管理、GET /api/admin/users にクエリパラメータで送信する
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import UserListTable from '../components/UserListTable'
import UserDetailDialog from '../components/UserDetailDialog'
import type { UserListResponse, UserStatus } from '../types'

const STATUS_FILTERS: { value: UserStatus | 'all'; label: string }[] = [
  { value: 'all',            label: 'すべて' },
  { value: 'approved',       label: '承認済み' },
  { value: 'pending_review', label: '審査待ち' },
  { value: 'rejected',       label: '却下' },
  { value: 'banned',         label: 'BAN' },
  { value: 'deleted',        label: '退会済み' },
]

const GENDER_FILTERS: { value: 'all' | 'male' | 'female'; label: string }[] = [
  { value: 'all',    label: 'すべての性別' },
  { value: 'male',   label: '男性' },
  { value: 'female', label: '女性' },
]

type AdminSort = 'last_sign_in_desc' | 'last_seen_desc' | 'created_desc' | 'name_asc'

const SORT_OPTIONS: { value: AdminSort; label: string }[] = [
  { value: 'last_sign_in_desc', label: 'ログイン順' },
  { value: 'last_seen_desc',    label: 'アクティブ順' },
  { value: 'created_desc',      label: '登録順' },
  { value: 'name_asc',          label: '名前順' },
]

export default function UsersTab() {
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [sort, setSort] = useState<AdminSort>('last_sign_in_desc')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // 検索デバウンス
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // フィルター変更でページリセット
  useEffect(() => { setPage(1) }, [statusFilter, genderFilter, search, sort])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', statusFilter, genderFilter, search, sort, page],
    queryFn: async (): Promise<UserListResponse> => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (genderFilter !== 'all') params.set('gender', genderFilter)
      if (search) params.set('search', search)
      params.set('sort', sort)
      params.set('page', String(page))
      params.set('page_size', '20')
      const r = await api.get<UserListResponse>(`/api/admin/users?${params.toString()}`)
      return r.data
    },
    staleTime: 30_000,
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-3">
      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
        <Input
          type="text"
          placeholder="名前・メールで検索"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 border-2 border-ink h-10 focus-visible:ring-0"
        />
      </div>

      {/* ステータスフィルター */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`font-mono text-[11px] font-bold px-2.5 py-1 border-2 border-ink transition-colors ${
              statusFilter === f.value ? 'bg-ink text-white' : 'bg-white text-ink'
            }`}
            style={{ borderRadius: 6 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 性別フィルター */}
      <div className="flex gap-1.5 flex-wrap">
        {GENDER_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setGenderFilter(f.value)}
            className={`font-mono text-[11px] font-bold px-2.5 py-1 border-2 border-ink transition-colors ${
              genderFilter === f.value ? 'bg-ink text-white' : 'bg-white text-ink'
            }`}
            style={{ borderRadius: 6 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ソート */}
      <div className="flex gap-1.5 flex-wrap">
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setSort(o.value)}
            className={`font-mono text-[11px] font-bold px-2.5 py-1 border-2 border-ink transition-colors ${
              sort === o.value ? 'bg-brand text-ink' : 'bg-white text-ink'
            }`}
            style={{ borderRadius: 6 }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* 件数 */}
      <p className="font-mono text-xs" style={{ color: 'var(--color-muted, #888)' }}>
        {total} 件 / {page} / {totalPages} ページ
      </p>

      {/* リスト */}
      <UserListTable users={data?.users ?? []} onSelect={handleSelect} loading={isLoading} />

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border-2 border-ink bg-white font-mono text-xs font-bold disabled:opacity-30"
            style={{ borderRadius: 6 }}
          >
            ← 前
          </button>
          <span className="font-mono text-xs text-ink">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border-2 border-ink bg-white font-mono text-xs font-bold disabled:opacity-30"
            style={{ borderRadius: 6 }}
          >
            次 →
          </button>
        </div>
      )}

      {/* 詳細モーダル */}
      <UserDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        userId={selectedId}
        onChange={() => { void refetch() }}
      />
    </div>
  )
}
