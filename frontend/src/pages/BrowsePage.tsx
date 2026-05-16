import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { CreditCard, LayoutGrid, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Layout from '@/components/Layout'
import ErrorState from '@/components/ErrorState'
import ColorfulCard from '@/components/ColorfulCard'
import MatchModal from '@/components/MatchModal'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useSwipeable } from 'react-swipeable'
import api from '@/lib/api'

interface BrowseProfileItem {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  department: string | null
  bio: string | null
  avatar_url: string | null
  is_liked: boolean
  looking_for: string | null
  last_seen_at: string | null
  show_online_status: boolean
  status_message: string | null
  clubs?: string[]
}

export function ActivityBadge({ lastSeenAt, showOnlineStatus }: { lastSeenAt: string | null; showOnlineStatus: boolean }) {
  if (!showOnlineStatus || !lastSeenAt) return null
  const diffMs = Date.now() - new Date(lastSeenAt).getTime()
  const diffHours = diffMs / 3600000

  if (diffHours < 24) {
    return (
      <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block shrink-0" />
        アクティブ
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
const MODE_STORAGE_KEY = 'cro-co-browse-mode'
const HINT_STORAGE_KEY = 'cro-co-swipe-hint-shown'
const EMPTY_FILTERS: Filters = { year: '', faculty: '', looking_for: '' }

function loadSavedFilters(): Filters {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) return { ...EMPTY_FILTERS, ...JSON.parse(saved) }
  } catch {}
  return EMPTY_FILTERS
}

type BrowseMode = 'grid' | 'swipe'

const YEAR_CHIPS = ['', '1', '2', '3', '4', '5', '6']
const PURPOSE_CHIPS = ['', '恋愛', '友達', 'なんでも']

interface MatchedUserState {
  name: string | null
  avatar_url: string | null
}

export default function BrowsePage() {
  usePageTitle('みんなを見る')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const savedFilters = loadSavedFilters()
  const [filters, setFilters] = useState<Filters>(savedFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(savedFilters)
  const [sortBy, setSortBy] = useState('')

  const [browseMode, setBrowseMode] = useState<BrowseMode>(
    () => (localStorage.getItem(MODE_STORAGE_KEY) as BrowseMode) || 'grid'
  )
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0)
  const [swipeDelta, setSwipeDelta] = useState(0)
  const [showSwipeHint, setShowSwipeHint] = useState(!localStorage.getItem(HINT_STORAGE_KEY))
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedUser, setMatchedUser] = useState<MatchedUserState | null>(null)

  const { data: profiles = [], isLoading: loading, isError, refetch } = useQuery({
    queryKey: ['profiles', appliedFilters, sortBy],
    queryFn: () => {
      const params = new URLSearchParams()
      if (appliedFilters.year) params.set('year', appliedFilters.year)
      if (appliedFilters.faculty.trim()) params.set('faculty', appliedFilters.faculty.trim())
      if (appliedFilters.looking_for) params.set('looking_for', appliedFilters.looking_for)
      if (sortBy) params.set('sort_by', sortBy)
      const qs = params.toString()
      return api.get<BrowseProfileItem[]>(`/api/profiles${qs ? `?${qs}` : ''}`).then(r => r.data)
    },
  })

  const { data: todayLikesData, refetch: refetchTodayLikes } = useQuery({
    queryKey: ['today-likes'],
    queryFn: () => api.get<{ count: number }>('/api/likes/today-count').then(r => r.data),
    retry: false,
  })
  const todayLikeCount = todayLikesData?.count ?? 0

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

  const switchMode = (mode: BrowseMode) => {
    setBrowseMode(mode)
    setCurrentSwipeIndex(0)
    setSwipeDelta(0)
    try { localStorage.setItem(MODE_STORAGE_KEY, mode) } catch {}
  }

  const handleSwipeLike = async (profile: BrowseProfileItem) => {
    if (showSwipeHint) {
      setShowSwipeHint(false)
      try { localStorage.setItem(HINT_STORAGE_KEY, 'true') } catch {}
    }
    setCurrentSwipeIndex(i => i + 1)
    setSwipeDelta(0)
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes', { liked_id: profile.id })
      refetchTodayLikes()
      if (res.data.is_match) {
        setMatchedUser({ name: profile.name, avatar_url: profile.avatar_url })
        setShowMatchModal(true)
      }
    } catch {}
  }

  const handleSwipeSkip = () => {
    if (showSwipeHint) {
      setShowSwipeHint(false)
      try { localStorage.setItem(HINT_STORAGE_KEY, 'true') } catch {}
    }
    setCurrentSwipeIndex(i => i + 1)
    setSwipeDelta(0)
  }

  const currentProfile = profiles[currentSwipeIndex]
  const swipeFinished = !loading && !isError && currentSwipeIndex >= profiles.length

  const swipeHandlers = useSwipeable({
    onSwiping: ({ deltaX }) => setSwipeDelta(deltaX),
    onSwipedRight: () => { if (currentProfile) handleSwipeLike(currentProfile) },
    onSwipedLeft: () => handleSwipeSkip(),
    onSwiped: () => setSwipeDelta(0),
    trackMouse: true,
    delta: 50,
  })

  const hasActiveFilters = appliedFilters.year !== '' || appliedFilters.faculty !== '' || appliedFilters.looking_for !== ''
  const activeFilterCount = [appliedFilters.year, appliedFilters.faculty, appliedFilters.looking_for].filter(Boolean).length

  const tiltDeg = Math.min(Math.max(swipeDelta * 0.07, -10), 10)
  const translateX = swipeDelta * 0.25

  const ModeSwitcher = ({ current }: { current: BrowseMode }) => (
    <div className="flex border-2 border-ink rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => switchMode('grid')}
        className="p-1.5 transition-colors"
        style={current === 'grid' ? { background: '#0A0A0A', color: '#DFFF1F' } : { background: '#fff', color: '#0A0A0A' }}
        title="グリッドモード"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => switchMode('swipe')}
        className="p-1.5 transition-colors border-l-2 border-ink"
        style={current === 'swipe' ? { background: '#0A0A0A', color: '#DFFF1F' } : { background: '#fff', color: '#0A0A0A' }}
        title="スワイプモード"
      >
        <CreditCard className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <Layout>
      {matchedUser && (
        <MatchModal
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          matchedUser={matchedUser}
        />
      )}

      {browseMode === 'swipe' ? (
        /* ===== スワイプモード: 1画面レイアウト ===== */
        <div
          className="flex flex-col overflow-hidden"
          style={{ height: 'calc(100dvh - 156px)' }}
        >
          {/* コンパクトトップバー */}
          <div
            className="flex items-center justify-between px-4 h-10 shrink-0"
            style={{ borderBottom: '1px solid rgba(10,10,10,0.1)' }}
          >
            <span className="font-mono font-bold text-xs" style={{ color: 'rgba(10,10,10,0.4)' }}>
              {!loading && !isError ? `${profiles.length} USERS` : '---'}
            </span>
            <ModeSwitcher current="swipe" />
          </div>

          {/* エラー */}
          {isError && (
            <div className="p-4 flex-1">
              <ErrorState message="読み込めなかった。私のせいじゃない。" onRetry={refetch} />
            </div>
          )}

          {/* ローディング */}
          {!isError && loading && (
            <div className="flex-1 m-4 card-bold animate-pulse bg-gray-200" />
          )}

          {/* 全員チェック済み */}
          {!isError && !loading && (swipeFinished || !currentProfile) && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center space-y-4">
                <Search className="w-16 h-16 text-gray-300 mx-auto" />
                <p
                  className="font-display text-2xl text-ink"
                  style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
                >
                  全員チェック済み！
                </p>
                <p className="text-sm text-gray-500">また後で見てみましょう</p>
                <Button
                  variant="outline-bold"
                  onClick={() => { setCurrentSwipeIndex(0); refetch() }}
                >
                  もう一度見る
                </Button>
              </div>
            </div>
          )}

          {/* スワイプコンテンツ */}
          {!isError && !loading && !swipeFinished && currentProfile && (
            <div className="flex flex-col flex-1 min-h-0 px-4 pt-2 pb-3 gap-2">
              {/* 残り枚数 */}
              <div className="text-center shrink-0">
                <span className="font-mono text-xs" style={{ color: 'rgba(10,10,10,0.4)' }}>
                  {currentSwipeIndex + 1} / {profiles.length}
                </span>
              </div>

              {/* カードエリア */}
              <div className="relative flex-1 min-h-0">
                {/* 背景カード（次の人） */}
                {profiles[currentSwipeIndex + 1] && (
                  <div
                    className="absolute inset-0 card-bold overflow-hidden bg-gray-50"
                    style={{ transform: 'scale(0.96) translateY(8px)' }}
                  >
                    <div className="w-full h-full flex items-center justify-center" style={{ color: '#e5e7eb' }}>
                      <User className="w-16 h-16" />
                    </div>
                  </div>
                )}

                {/* メインカード */}
                <div
                  {...swipeHandlers}
                  className="absolute inset-0 card-bold overflow-hidden bg-white cursor-grab active:cursor-grabbing flex flex-col"
                  style={{
                    transform: `rotate(${tiltDeg}deg) translateX(${translateX}px)`,
                    transition: swipeDelta === 0 ? 'transform 0.25s ease-out' : 'none',
                    touchAction: 'none',
                  }}
                >
                  {/* 写真エリア */}
                  <div className="relative flex-1 min-h-0 overflow-hidden">
                    {currentProfile.avatar_url ? (
                      <img
                        src={currentProfile.avatar_url}
                        alt={currentProfile.name ?? ''}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <User className="w-20 h-20 text-gray-300" />
                      </div>
                    )}

                    {/* LIKE エフェクト */}
                    {swipeDelta > 20 && (
                      <>
                        <div
                          className="absolute inset-0"
                          style={{ background: 'rgba(255,59,107,0.15)' }}
                        />
                        <div
                          className="absolute top-6 left-5 px-4 py-2 rounded-xl"
                          style={{
                            border: '2px solid white',
                            background: '#FF3B6B',
                            transform: 'rotate(-15deg)',
                          }}
                        >
                          <span className="font-black text-2xl text-white">LIKE</span>
                        </div>
                      </>
                    )}

                    {/* SKIP エフェクト */}
                    {swipeDelta < -20 && (
                      <>
                        <div
                          className="absolute inset-0"
                          style={{ background: 'rgba(156,163,175,0.2)' }}
                        />
                        <div
                          className="absolute top-6 right-5 px-4 py-2 rounded-xl"
                          style={{
                            border: '2px solid white',
                            background: '#9CA3AF',
                            transform: 'rotate(15deg)',
                          }}
                        >
                          <span className="font-black text-2xl text-white">SKIP</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 情報エリア */}
                  <div className="shrink-0 p-5 space-y-1.5 border-t-2 border-ink bg-white">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-2xl font-black text-ink truncate">
                        {currentProfile.name ?? '（未設定）'}
                      </h2>
                      {currentProfile.year && (
                        <span className="font-mono text-sm shrink-0" style={{ color: 'rgba(10,10,10,0.5)' }}>
                          {currentProfile.year}年
                        </span>
                      )}
                    </div>
                    {currentProfile.faculty && (
                      <p className="text-sm truncate" style={{ color: 'rgba(10,10,10,0.6)' }}>
                        {currentProfile.faculty}
                      </p>
                    )}
                    {currentProfile.looking_for && (
                      <span className="tag-pill text-xs">{currentProfile.looking_for}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ヒント（初回のみ） */}
              {showSwipeHint && (
                <p
                  className="text-center font-mono text-xs tracking-wider shrink-0"
                  style={{ color: 'rgba(10,10,10,0.4)' }}
                >
                  ← SKIP　　LIKE →
                </p>
              )}

              {/* ボタン */}
              <div className="flex justify-center gap-6 shrink-0">
                <button
                  type="button"
                  onClick={handleSwipeSkip}
                  className="w-14 h-14 rounded-full bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] flex items-center justify-center font-bold text-xl hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                  title="スキップ"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => currentProfile && handleSwipeLike(currentProfile)}
                  className="w-16 h-16 rounded-full border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] flex items-center justify-center font-bold text-2xl hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                  style={{ background: '#FF7DA8' }}
                  title="いいね"
                >
                  ♥
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ===== グリッドモード ===== */
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

              <div className="flex items-center gap-2 shrink-0">
                {!loading && !isError && (
                  <div
                    className="font-mono font-bold text-xs px-3 py-1.5 rounded-full"
                    style={{ border: '2px solid #0A0A0A', background: '#FFFFFF', color: '#0A0A0A' }}
                  >
                    {profiles.length} USERS
                  </div>
                )}
                <ModeSwitcher current="grid" />
              </div>
            </div>
          </motion.div>

          {/* フィルターバー */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2"
          >
            {/* ソート */}
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
                  style={appliedFilters.year === v ? { background: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' } : {}}
                >
                  {v}年
                </button>
              ))}
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
                  style={appliedFilters.looking_for === v ? { background: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' } : {}}
                >
                  {v}
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

          {isError && <ErrorState message="読み込めなかった。私のせいじゃない。" onRetry={refetch} />}

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
                  {profiles.map((profile, index) => (
                    <ColorfulCard
                      key={profile.id}
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
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Layout>
  )
}
