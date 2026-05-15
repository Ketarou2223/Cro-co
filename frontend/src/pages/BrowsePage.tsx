import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Layout from '@/components/Layout'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'
import ColorfulCard from '@/components/ColorfulCard'
import { usePageTitle } from '@/hooks/usePageTitle'
import api from '@/lib/api'

interface BrowseProfileItem {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  avatar_url: string | null
  is_liked: boolean
  looking_for: string | null
  last_seen_at: string | null
  show_online_status: boolean
}

export function ActivityBadge({ lastSeenAt, showOnlineStatus }: { lastSeenAt: string | null; showOnlineStatus: boolean }) {
  if (!showOnlineStatus || !lastSeenAt) return null
  const diffMs = Date.now() - new Date(lastSeenAt).getTime()
  const diffHours = diffMs / 3600000

  if (diffHours < 24) {
    return (
      <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
        🟢 アクティブ
      </span>
    )
  }
  if (diffHours < 72) {
    return (
      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
        最近ログイン
      </span>
    )
  }
  return null
}

interface Filters {
  year: string
  faculty: string
  looking_for: string
}

const FILTER_STORAGE_KEY = 'cro-co-browse-filter'
const EMPTY_FILTERS: Filters = { year: '', faculty: '', looking_for: '' }

function loadSavedFilters(): Filters {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) return { ...EMPTY_FILTERS, ...JSON.parse(saved) }
  } catch {}
  return EMPTY_FILTERS
}

const YEAR_CHIPS = ['', '1', '2', '3', '4', '5', '6']
const PURPOSE_CHIPS = ['', '恋愛', '友達', 'なんでも']

export default function BrowsePage() {
  usePageTitle('みんなを見る')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const savedFilters = loadSavedFilters()
  const [filters, setFilters] = useState<Filters>(savedFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(savedFilters)

  const { data: profiles = [], isLoading: loading, isError, refetch } = useQuery({
    queryKey: ['profiles', appliedFilters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (appliedFilters.year) params.set('year', appliedFilters.year)
      if (appliedFilters.faculty.trim()) params.set('faculty', appliedFilters.faculty.trim())
      if (appliedFilters.looking_for) params.set('looking_for', appliedFilters.looking_for)
      const qs = params.toString()
      return api.get<BrowseProfileItem[]>(`/api/profiles${qs ? `?${qs}` : ''}`).then(r => r.data)
    },
  })

  const updateFilters = (newFilters: Filters) => {
    setFilters(newFilters)
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters))
    } catch {}
  }

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters })
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
    } catch {}
  }

  const handleResetFilters = () => {
    updateFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY)
    } catch {}
  }

  const hasActiveFilters =
    appliedFilters.year !== '' ||
    appliedFilters.faculty !== '' ||
    appliedFilters.looking_for !== ''

  const activeFilterCount = [
    appliedFilters.year,
    appliedFilters.faculty,
    appliedFilters.looking_for,
  ].filter(Boolean).length

  return (
    <Layout>
      <div className="px-4 pt-5 pb-4 space-y-4">
        {/* ページタイトル */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-end justify-between">
            <div>
              <h1
                className="font-display leading-tight"
                style={{
                  fontFamily: "'Noto Sans JP', sans-serif",
                  fontWeight: 900,
                  fontSize: '2rem',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                  color: '#0A0A0A',
                }}
              >
                今日キャンパスに<br />いる、誰か。
              </h1>
            </div>
            {!loading && !isError && (
              <div
                className="shrink-0 font-mono font-bold text-xs px-3 py-1.5 rounded-full"
                style={{ border: '2px solid #0A0A0A', background: '#FFFFFF', color: '#0A0A0A' }}
              >
                {profiles.length} USERS
              </div>
            )}
          </div>
        </motion.div>

        {/* フィルターバー */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 overflow-x-auto flex gap-2 pb-1 scrollbar-hide">
            {/* 学年チップ */}
            {YEAR_CHIPS.filter(v => v !== '').map((v) => (
              <button
                key={`y-${v}`}
                type="button"
                onClick={() => {
                  const next = { ...filters, year: filters.year === v ? '' : v }
                  updateFilters(next)
                  setAppliedFilters(next)
                }}
                className="tag-pill shrink-0 transition-colors"
                style={
                  appliedFilters.year === v
                    ? { background: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' }
                    : {}
                }
              >
                {v}年
              </button>
            ))}
            {/* 目的チップ */}
            {PURPOSE_CHIPS.filter(v => v !== '').map((v) => (
              <button
                key={`p-${v}`}
                type="button"
                onClick={() => {
                  const next = { ...filters, looking_for: filters.looking_for === v ? '' : v }
                  updateFilters(next)
                  setAppliedFilters(next)
                }}
                className="tag-pill shrink-0 transition-colors"
                style={
                  appliedFilters.looking_for === v
                    ? { background: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' }
                    : {}
                }
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex gap-1 shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-gray-500 underline underline-offset-2"
              >
                リセット
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="tag-pill"
              style={filtersOpen || activeFilterCount > 0 ? { background: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' } : {}}
            >
              絞り込み{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
            </button>
          </div>
        </motion.div>

        {/* フィルターパネル */}
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card-bold bg-white p-4 space-y-3"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-500">学部・学科（部分一致）</p>
              <Input
                value={filters.faculty}
                onChange={(e) => updateFilters({ ...filters, faculty: e.target.value })}
                placeholder="例: 工学部"
                className="h-9 text-sm border-2 border-ink"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="bold" onClick={handleApplyFilters} className="flex-1">
                適用する
              </Button>
              <Button size="sm" variant="outline-bold" onClick={handleResetFilters} className="flex-1">
                リセット
              </Button>
            </div>
          </motion.div>
        )}

        {isError && (
          <ErrorState message="ユーザーの取得に失敗しました" onRetry={refetch} />
        )}

        {/* スケルトン */}
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-bold overflow-hidden bg-gray-100">
                <div className="w-full bg-gray-200" style={{ aspectRatio: '4/3' }} />
                <div className="p-3 space-y-2 bg-white border-t-2 border-ink">
                  <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 空状態 */}
        {!loading && !isError && profiles.length === 0 && (
          <div className="py-12 text-center space-y-4">
            <div className="text-8xl">👀</div>
            <div>
              <p className="font-display text-2xl text-ink" style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}>
                {activeFilterCount > 0 ? '条件に合う人がいない' : 'まだユーザーがいません'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {activeFilterCount > 0 ? 'フィルターを変えてみてください' : 'もう少し待ってみましょう'}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="outline-bold" onClick={handleResetFilters} className="rounded-xl px-6">
                フィルターをリセット
              </Button>
            )}
          </div>
        )}

        {/* プロフィールグリッド */}
        {!loading && !isError && profiles.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {profiles.map((profile, index) => (
              <ColorfulCard
                key={profile.id}
                index={index}
                user={{
                  id: profile.id,
                  name: profile.name,
                  year: profile.year,
                  faculty: profile.faculty,
                  bio: profile.bio,
                  avatar_url: profile.avatar_url,
                  interests: [],
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
