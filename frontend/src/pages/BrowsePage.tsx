import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Lock, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Layout from '@/components/Layout'
import ErrorState from '@/components/ErrorState'
import NotifyNudge from '@/components/NotifyNudge'
import ColorfulCard from '@/components/ColorfulCard'
import MatchModal from '@/components/MatchModal'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/contexts/ToastContext'
import api from '@/lib/api'
import { dbGet, dbSet } from '@/lib/db'
import type { BrowseProfileItem } from '@/lib/db'

export function ActivityBadge({ lastSeenAt, showOnlineStatus }: { lastSeenAt: string | null; showOnlineStatus: boolean }) {
  if (!showOnlineStatus || !lastSeenAt) return null
  const diffMs = Date.now() - new Date(lastSeenAt).getTime()
  const diffHours = diffMs / 3600000

  if (diffHours < 1) {
    return (
      <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block shrink-0" />
        オンライン
      </span>
    )
  }
  if (diffHours < 24) {
    return (
      <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block shrink-0" />
        今日アクティブ
      </span>
    )
  }
  if (diffHours < 168) {
    return (
      <span className="text-[10px] text-gray-500 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block shrink-0" />
        今週アクティブ
      </span>
    )
  }
  if (diffHours < 720) {
    return (
      <span className="text-[10px] text-gray-400 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-gray-300 inline-block shrink-0" />
        今月アクティブ
      </span>
    )
  }
  return null
}

interface Filters {
  year: string
  faculty: string
}

const FILTER_STORAGE_KEY = 'cro-co-browse-filter'
const EMPTY_FILTERS: Filters = { year: '', faculty: '' }

function loadSavedFilters(): Filters {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) return { ...EMPTY_FILTERS, ...JSON.parse(saved) }
  } catch {}
  return EMPTY_FILTERS
}

const YEAR_CHIPS = ['1', '2', '3', '4', '5', '6']

interface MatchedUserState {
  name: string | null
  avatar_url: string | null
}

export default function BrowsePage() {
  usePageTitle('みんなを見る')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: myProfile } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () =>
      api
        .get<{
          name: string | null
          faculty: string | null
          bio: string | null
          status: string
          gender: string | null
          profile_setup_completed: boolean
          onboarding_completed: boolean
        }>('/api/profile/me')
        .then(r => r.data),
    retry: false,
  })

  const myStatus = myProfile?.status
  const isPending = myStatus === 'pending_review'

  const [filtersOpen, setFiltersOpen] = useState(false)
  const savedFilters = loadSavedFilters()
  const [filters, setFilters] = useState<Filters>(savedFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(savedFilters)
  const [sortBy, setSortBy] = useState('')
  const [localLikedIds, setLocalLikedIds] = useState<Set<string>>(new Set())
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedUser, setMatchedUser] = useState<MatchedUserState | null>(null)

  const [profiles, setProfiles] = useState<BrowseProfileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    if (myStatus !== 'approved') return
    let cancelled = false

    const params = new URLSearchParams()
    if (appliedFilters.year) params.set('year', appliedFilters.year)
    if (appliedFilters.faculty.trim()) params.set('faculty', appliedFilters.faculty.trim())
    if (sortBy) params.set('sort_by', sortBy)
    const qs = params.toString()
    const cacheKey = `browse${qs ? `:${qs}` : ':all'}`

    setLoading(true)
    setIsError(false)

    async function load() {
      let cached: BrowseProfileItem[] | null = null
      const fromCache = await dbGet('profiles', cacheKey, 3 * 60 * 1000)
      if (fromCache && !cancelled) {
        cached = fromCache
        setProfiles(fromCache)
        setLoading(false)
      }
      try {
        const fresh = await api.get<BrowseProfileItem[]>(`/api/profiles${qs ? `?${qs}` : ''}`).then(r => r.data)
        if (!cancelled) {
          setProfiles(fresh)
          setLoading(false)
          await dbSet('profiles', cacheKey, fresh)
        }
      } catch {
        if (!cancelled) {
          if (!cached) setIsError(true)
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [myStatus, appliedFilters, sortBy, refreshKey])

  const { data: todayLikesData, refetch: refetchTodayLikes } = useQuery({
    queryKey: ['today-likes'],
    queryFn: () => api.get<{ count: number }>('/api/likes/today-count').then(r => r.data),
    retry: false,
  })
  const todayLikeCount = todayLikesData?.count ?? 0

  if (!myProfile) {
    return (
      <Layout>
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 156px)' }}>
          <p className="font-mono text-gray-500 text-sm">探してます、ちょっと待って。</p>
        </div>
      </Layout>
    )
  }

  if (!myProfile.gender || !myProfile.onboarding_completed) {
    if (myProfile.profile_setup_completed) {
      return <Navigate to="/setup/optional" replace />
    }
    return <Navigate to="/setup/required" replace />
  }

  if (!myProfile.profile_setup_completed) {
    return <Navigate to="/setup/required" replace />
  }

  const isProfileIncomplete = myStatus === 'approved' && (!myProfile?.name || !myProfile?.faculty || !myProfile?.bio)

  const updateFilters = (newFilters: Filters) => {
    setFilters(newFilters)
    try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters)) } catch {}
  }

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters })
    try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters)) } catch {}
  }

  const handleResetFilters = () => {
    updateFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    try { localStorage.removeItem(FILTER_STORAGE_KEY) } catch {}
  }

  const handleGridLike = async (profile: BrowseProfileItem) => {
    if (profile.is_liked || localLikedIds.has(profile.id)) return
    // 楽観的更新: 即座に UI を「いいね済み」に
    setLocalLikedIds(prev => new Set([...prev, profile.id]))
    showToast(`${profile.name ?? '相手'}にいいねしました`)
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes/', { liked_id: profile.id })
      const likeCount = parseInt(localStorage.getItem('like-send-count') || '0')
      localStorage.setItem('like-send-count', String(likeCount + 1))
      refetchTodayLikes()
      if (res.data.is_match) {
        setMatchedUser({ name: profile.name, avatar_url: profile.avatar_url })
        setShowMatchModal(true)
      }
    } catch {
      // ロールバック
      setLocalLikedIds(prev => {
        const next = new Set(prev)
        next.delete(profile.id)
        return next
      })
    }
  }

  const hasActiveFilters = appliedFilters.year !== '' || appliedFilters.faculty !== ''
  const activeFilterCount = [appliedFilters.year, appliedFilters.faculty].filter(Boolean).length

  if (isProfileIncomplete) {
    return (
      <Layout>
        <div
          className="flex flex-col items-center justify-center px-6 text-center"
          style={{ minHeight: 'calc(100dvh - 156px)' }}
        >
          <p className="font-display text-3xl text-ink">プロフィールを完成させてから使えるよ。</p>
          <p className="text-gray-500 text-sm mt-4">名前・学部・自己紹介を設定して。</p>
          <Button variant="bold" className="mt-8 w-full" onClick={() => navigate('/settings')}>
            プロフィールを設定する
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <NotifyNudge />
      {myStatus !== 'approved' && (
        <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/30 flex items-center justify-center p-6">
          <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-sm w-full shadow-[8px_8px_0_0_#000]">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-yellow-300 border-4 border-black rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-3">
              {myStatus === 'rejected'
                ? '学生証の再提出が必要です'
                : '認証完了後に利用できます'}
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              {myStatus === 'rejected'
                ? '再申請して承認されると、みんなのプロフィールを見られるようになります。'
                : '学生証の審査が完了すると、みんなのプロフィールを見られるようになります。'}
            </p>
            {myStatus === 'rejected' ? (
              <button
                type="button"
                onClick={() => navigate('/setup/required?mode=reapply')}
                className="w-full bg-black text-white font-bold py-3 rounded-xl border-2 border-black"
              >
                再申請する →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full bg-yellow-300 text-black font-bold py-3 rounded-xl border-2 border-black"
              >
                ホームに戻る
              </button>
            )}
          </div>
        </div>
      )}

      {matchedUser && (
        <MatchModal
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          matchedUser={matchedUser}
        />
      )}

      <div className="px-4 pt-5 pb-4 space-y-4">
        {/* ページタイトル */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-end justify-between">
            <div className="space-y-1.5">
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
              {todayLikesData !== undefined && (
                <div
                  className="inline-flex font-mono font-bold text-xs px-2 py-0.5 border-2 border-ink"
                  style={todayLikeCount > 0 ? { background: '#DFFF1F', color: '#0A0A0A' } : { background: '#fff', color: '#666' }}
                >
                  TODAY'S LIKES: {todayLikeCount}
                </div>
              )}
            </div>

            {!loading && !isError && (
              <div
                className="font-mono font-bold text-xs px-3 py-1.5 rounded-full shrink-0"
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-bold border-2 border-ink rounded-lg px-2 h-8 bg-white shrink-0 cursor-pointer"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            <option value="">新着順</option>
            <option value="last_seen">オンライン順</option>
            <option value="year_asc">学年（低）</option>
            <option value="year_desc">学年（高）</option>
          </select>

          <div className="flex-1 overflow-x-auto flex gap-2 pb-1 scrollbar-hide">
            {YEAR_CHIPS.map((v) => (
              <button
                key={`y-${v}`}
                type="button"
                onClick={() => {
                  const next = { ...filters, year: filters.year === v ? '' : v }
                  updateFilters(next)
                  setAppliedFilters(next)
                }}
                className="tag-pill shrink-0 transition-colors"
                style={appliedFilters.year === v ? { background: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' } : {}}
              >
                {v}年
              </button>
            ))}
          </div>
          <div className="flex gap-1 shrink-0">
            {(hasActiveFilters || sortBy) && (
              <button
                type="button"
                onClick={() => { handleResetFilters(); setSortBy('') }}
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
              <Button size="sm" variant="bold" onClick={handleApplyFilters} className="flex-1">適用する</Button>
              <Button size="sm" variant="outline-bold" onClick={handleResetFilters} className="flex-1">リセット</Button>
            </div>
          </motion.div>
        )}

        {isError && <ErrorState message="うまく読み込めませんでした。" onRetry={refetch} />}

        {/* ローディング */}
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

        {/* グリッド */}
        {!loading && !isError && (
          <>
            {profiles.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="flex justify-center">
                  <Search className="w-16 h-16 text-gray-300" />
                </div>
                <div>
                  <p
                    className="font-display text-2xl text-ink"
                    style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
                  >
                    誰もいない。さみしい。
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    フィルターを変えてみるか、もう少し待ってみよう。
                  </p>
                </div>
                {(activeFilterCount > 0 || sortBy) && (
                  <Button
                    variant="outline-bold"
                    onClick={() => { handleResetFilters(); setSortBy('') }}
                    className="rounded-xl px-6"
                  >
                    フィルターをリセット
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {profiles.map((profile, index) => {
                  const isLiked = profile.is_liked || localLikedIds.has(profile.id)
                  return (
                    <div key={profile.id} className="relative">
                      <ColorfulCard
                        index={index}
                        user={{
                          id: profile.id,
                          name: profile.name,
                          year: profile.year,
                          faculty: profile.faculty,
                          department: profile.department,
                          bio: profile.bio,
                          avatar_url: profile.avatar_url,
                          interests: [],
                          clubs: profile.clubs ?? [],
                          status_message: profile.status_message,
                        }}
                      />
                      {isLiked ? (
                        <div className="absolute top-2 right-2 z-10 pointer-events-none bg-hot text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full leading-none border border-white/60">
                          ♥ 済み
                        </div>
                      ) : (
                        !isPending && (
                          <button
                            type="button"
                            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white border-2 border-ink flex items-center justify-center shadow-[2px_2px_0_0_#0A0A0A] hover:scale-110 active:scale-95 transition-all text-hot text-sm font-bold leading-none"
                            onClick={(e) => { e.stopPropagation(); handleGridLike(profile) }}
                            title="いいね"
                          >
                            ♥
                          </button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 空白の avatar placeholder（絵文字禁止対応） */}
      <div className="hidden"><User /></div>
    </Layout>
  )
}
