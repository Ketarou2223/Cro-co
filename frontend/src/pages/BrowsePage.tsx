import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import Layout from '@/components/Layout'
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

function OnlineStatus({ lastSeenAt, showOnlineStatus }: { lastSeenAt: string | null; showOnlineStatus: boolean }) {
  if (!showOnlineStatus || !lastSeenAt) return null
  const diffMs = Date.now() - new Date(lastSeenAt).getTime()
  const diffMin = diffMs / 60000
  const diffHour = diffMs / 3600000
  const diffDay = diffMs / 86400000

  if (diffMin <= 5) {
    return (
      <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
        🟢 オンライン
      </span>
    )
  }
  if (diffHour < 24) {
    return (
      <span className="text-[10px] text-muted-foreground">
        {Math.floor(diffHour)}時間前
      </span>
    )
  }
  return (
    <span className="text-[10px] text-muted-foreground">
      {Math.floor(diffDay)}日前
    </span>
  )
}

interface Filters {
  year: string
  faculty: string
  looking_for: string
}

export default function BrowsePage() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<BrowseProfileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({ year: '', faculty: '', looking_for: '' })
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ year: '', faculty: '', looking_for: '' })

  const fetchProfiles = (f: Filters) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (f.year) params.set('year', f.year)
    if (f.faculty.trim()) params.set('faculty', f.faculty.trim())
    if (f.looking_for) params.set('looking_for', f.looking_for)
    const qs = params.toString()
    api
      .get<BrowseProfileItem[]>(`/api/profiles${qs ? `?${qs}` : ''}`)
      .then((res) => setProfiles(res.data))
      .catch(() => setError('ユーザー一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProfiles(appliedFilters)
  }, [appliedFilters])

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters })
  }

  const handleResetFilters = () => {
    const empty: Filters = { year: '', faculty: '', looking_for: '' }
    setFilters(empty)
    setAppliedFilters(empty)
  }

  const activeFilterCount = [
    appliedFilters.year,
    appliedFilters.faculty,
    appliedFilters.looking_for,
  ].filter(Boolean).length

  return (
    <Layout>
      <div className="px-4 py-5 space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">みんなを見る</h1>
            {!loading && !error && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {profiles.length}人が登録中
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeFilterCount > 0
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            絞り込み
            {activeFilterCount > 0 && (
              <span className="text-xs bg-white/30 text-inherit px-1.5 py-0.5 rounded-full font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* フィルターパネル（折りたたみ） */}
        {filtersOpen && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 border border-border">
            {/* 学年 */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">学年</p>
              <div className="flex flex-wrap gap-1.5">
                {['', '1', '2', '3', '4', '5', '6'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, year: v }))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filters.year === v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {v === '' ? 'すべて' : `${v}年`}
                  </button>
                ))}
              </div>
            </div>

            {/* 学部 */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">学部・学科（部分一致）</p>
              <Input
                value={filters.faculty}
                onChange={(e) => setFilters((f) => ({ ...f, faculty: e.target.value }))}
                placeholder="例: 工学部"
                className="h-9 text-sm"
              />
            </div>

            {/* 目的 */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">目的</p>
              <div className="flex flex-wrap gap-1.5">
                {['', '恋愛', '友達', 'なんでも'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, looking_for: v }))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filters.looking_for === v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {v === '' ? 'すべて' : v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleApplyFilters} className="flex-1">
                適用する
              </Button>
              <Button size="sm" variant="outline" onClick={handleResetFilters} className="flex-1">
                リセット
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ローディング skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <Skeleton className="w-full aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 空状態 */}
        {!loading && !error && profiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-6xl">🌵</div>
            <p className="text-base font-medium text-center">
              {activeFilterCount > 0 ? '条件に合うユーザーがいません' : 'まだ誰もいません'}
            </p>
            {activeFilterCount > 0 ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                絞り込みをリセット
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                友達を招待してみよう！
              </p>
            )}
          </div>
        )}

        {/* プロフィールグリッド */}
        {!loading && !error && profiles.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left w-full"
                onClick={() => navigate(`/profile/${profile.id}`)}
              >
                {/* アバター */}
                <div className="relative w-full aspect-square bg-muted">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name ?? 'アバター'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-muted-foreground">
                      👤
                    </div>
                  )}
                  {/* いいね済みバッジ */}
                  {profile.is_liked && (
                    <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      ♥ いいね
                    </div>
                  )}
                  {/* 目的バッジ */}
                  {profile.looking_for && (
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {profile.looking_for}
                    </div>
                  )}
                </div>

                {/* 情報 */}
                <div className="p-3 space-y-0.5">
                  <p className="font-semibold text-sm truncate">
                    {profile.name ?? '（未設定）'}
                  </p>
                  {(profile.year != null || profile.faculty) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[
                        profile.year != null ? `${profile.year}年` : null,
                        profile.faculty,
                      ]
                        .filter(Boolean)
                        .join('・')}
                    </p>
                  )}
                  <OnlineStatus
                    lastSeenAt={profile.last_seen_at}
                    showOnlineStatus={profile.show_online_status}
                  />
                  {profile.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-0.5">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
