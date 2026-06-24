// 解説: このファイルは「みんなを見る」一覧ページを定義する。
// 解説: 機能: プロフィール一覧グリッド / キーワード+詳細フィルタ検索 / グリッド上からいいね送信
// 解説: applied（確定条件）と draft（詳細パネル内の未確定条件）を分離し「適用する」で applied に反映する
// 解説: dbGet/dbSet キャッシュ（3分）: キャッシュがあれば先に表示し、バックグラウンドで最新データを取得する（stale-while-revalidate 的な動作）
// 解説: localLikedIds = 楽観的更新用のローカル Set（API 成功前にいいね済み表示にする）
// 解説: ActivityBadge = lastSeenAt から「オンライン/今日/今週/今月」を表示するコンポーネント
import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Clock, Lock, Search, SlidersHorizontal, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ErrorState from '@/components/ErrorState'
import NotifyNudge from '@/components/NotifyNudge'
import ColorfulCard from '@/components/ColorfulCard'
import MatchModal from '@/components/MatchModal'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/contexts/ToastContext'
import { PREFECTURES } from '@/lib/osaka-u-data'
import api from '@/lib/api'
import { dbGet, dbSet } from '@/lib/db'
import type { BrowseProfileItem } from '@/lib/db'
import { trackEvent } from '@/lib/analytics'

export function ActivityBadge({ lastSeenAt, showOnlineStatus }: { lastSeenAt: string | null; showOnlineStatus: boolean }) {
  if (!showOnlineStatus || !lastSeenAt) return null
  const diffMs = Date.now() - new Date(lastSeenAt).getTime()
  const diffHours = diffMs / 3600000

  if (diffHours < 1) {
    return (
      <span className="text-[10px] font-medium text-success flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-success inline-block shrink-0" />
        オンライン
      </span>
    )
  }
  if (diffHours < 24) {
    return (
      <span className="text-[10px] font-medium text-warning flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-warning inline-block shrink-0" />
        今日アクティブ
      </span>
    )
  }
  if (diffHours < 168) {
    return (
      <span className="text-[10px] text-ink/60 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-ink/40 inline-block shrink-0" />
        今週アクティブ
      </span>
    )
  }
  if (diffHours < 720) {
    return (
      <span className="text-[10px] text-ink/40 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-ink/20 inline-block shrink-0" />
        今月アクティブ
      </span>
    )
  }
  return null
}

type ScienceHumanities = '' | 'humanities' | 'sciences'

interface BrowseCriteria {
  keyword: string
  groups: string[]
  scienceHumanities: ScienceHumanities
  hometowns: string[]
  sortBy: string
}

const EMPTY_CRITERIA: BrowseCriteria = {
  keyword: '',
  groups: [],
  scienceHumanities: '',
  hometowns: [],
  sortBy: '',
}

const HISTORY_KEY = 'crocoBrowseHistory'
const HISTORY_MAX = 5

const GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'u1', label: '1年' },
  { value: 'u2', label: '2年' },
  { value: 'u3', label: '3年' },
  { value: 'u4plus', label: '4年以上(学部)' },
  { value: 'master', label: '修士' },
  { value: 'doctor', label: '博士' },
]

const SH_OPTIONS: { value: ScienceHumanities; label: string }[] = [
  { value: '', label: '不問' },
  { value: 'humanities', label: '文系' },
  { value: 'sciences', label: '理系' },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '新着順' },
  { value: 'last_seen', label: '最終ログイン順' },
  { value: 'year_asc', label: '学年（低い順）' },
  { value: 'year_desc', label: '学年（高い順）' },
]

// 解説: loadHistory = localStorage から検索履歴を読む（旧 years 形式との互換を含む）
function loadHistory(): BrowseCriteria[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return (parsed as Array<Record<string, unknown>>).map(h => ({
          keyword: typeof h.keyword === 'string' ? h.keyword : '',
          groups: Array.isArray(h.groups) ? (h.groups as string[]) : [],
          scienceHumanities: (h.scienceHumanities ?? '') as ScienceHumanities,
          hometowns: Array.isArray(h.hometowns) ? (h.hometowns as string[]) : [],
          sortBy: typeof h.sortBy === 'string' ? h.sortBy : '',
        }))
      }
    }
  } catch {}
  return []
}

function isEmptyCriteria(c: BrowseCriteria): boolean {
  return (
    !c.keyword.trim() &&
    c.groups.length === 0 &&
    !c.scienceHumanities &&
    c.hometowns.length === 0 &&
    !c.sortBy
  )
}

function sameCriteria(a: BrowseCriteria, b: BrowseCriteria): boolean {
  return (
    a.keyword.trim() === b.keyword.trim() &&
    a.scienceHumanities === b.scienceHumanities &&
    a.sortBy === b.sortBy &&
    [...a.groups].sort().join(',') === [...b.groups].sort().join(',') &&
    [...a.hometowns].sort().join(',') === [...b.hometowns].sort().join(',')
  )
}

function groupLabel(g: string): string {
  return GROUP_OPTIONS.find(o => o.value === g)?.label ?? g
}

function shLabel(sh: ScienceHumanities): string {
  return sh === 'humanities' ? '文系' : sh === 'sciences' ? '理系' : ''
}

function summarizeCriteria(c: BrowseCriteria): string {
  const parts: string[] = []
  if (c.keyword.trim()) parts.push(`"${c.keyword.trim()}"`)
  if (c.groups.length > 0) parts.push([...c.groups].map(groupLabel).join('・'))
  if (c.scienceHumanities) parts.push(shLabel(c.scienceHumanities))
  if (c.hometowns.length > 0) parts.push(c.hometowns.join('・'))
  const sort = SORT_OPTIONS.find(o => o.value === c.sortBy)
  if (c.sortBy && sort) parts.push(sort.label)
  return parts.join(' / ') || 'すべて'
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

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

  const [detailOpen, setDetailOpen] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [applied, setApplied] = useState<BrowseCriteria>(EMPTY_CRITERIA)
  const [history, setHistory] = useState<BrowseCriteria[]>(loadHistory)

  // 解説: draft 系 state = 詳細パネル内の編集中の値。「適用する」ボタンで applied に反映する二段階構造
  // 詳細検索パネル内のドラフト（「適用する」まで applied に反映しない）
  const [draftGroups, setDraftGroups] = useState<string[]>([])
  const [draftSH, setDraftSH] = useState<ScienceHumanities>('')
  const [draftHometowns, setDraftHometowns] = useState<string[]>([])
  const [draftSort, setDraftSort] = useState('')

  const [localLikedIds, setLocalLikedIds] = useState<Set<string>>(new Set())
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedUser, setMatchedUser] = useState<MatchedUserState | null>(null)

  const [profiles, setProfiles] = useState<BrowseProfileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])
  // @copy CRO-empty-browse-01〜03 Lv1
  const [emptyStateTitle] = useState(() =>
    pickRandom([
      '今はおすすめできる人がいないようです。',
      '今日はご紹介できる人がいませんでした。',
      'いまはお相手が見つかりませんでした。',
    ])
  )

  // 出身地候補（実際に登録のある都道府県のみ・正準順に整列）
  const { data: usedHometowns } = useQuery({
    queryKey: ['used-hometowns'],
    queryFn: () => api.get<string[]>('/api/profiles/hometowns').then(r => r.data),
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  const hometownSet = new Set(usedHometowns ?? [])
  const hometownOptions = [
    ...PREFECTURES.filter(p => hometownSet.has(p)),
    ...(usedHometowns ?? []).filter(h => !(PREFECTURES as readonly string[]).includes(h)),
  ]

  useEffect(() => {
    if (myStatus !== 'approved') return
    let cancelled = false

    const params = new URLSearchParams()
    applied.groups.forEach(g => params.append('groups', g))
    if (applied.scienceHumanities) params.set('science_humanities', applied.scienceHumanities)
    applied.hometowns.forEach(h => params.append('hometowns', h))
    if (applied.keyword.trim()) params.set('bio_keyword', applied.keyword.trim())
    if (applied.sortBy) params.set('sort_by', applied.sortBy)
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
  }, [myStatus, applied, refreshKey])

  const { data: likeStock, refetch: refetchLikeStock } = useQuery({
    queryKey: ['likes-stock'],
    queryFn: () => api.get<{
      is_applicable: boolean
      quantity: number
      initial: number
      daily_grant: number
      cap: number
    }>('/api/likes/stock').then(r => r.data),
    retry: false,
    staleTime: 60 * 1000,
  })
  const isStockApplicable = likeStock?.is_applicable === true
  const likeStockQty = likeStock?.quantity ?? 0

  if (!myProfile) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 156px)' }}>
          {/* @copy CRO-label-browse-loading-01 Lv1 */}
          <p className="font-mono text-ink/60 text-sm">読み込んでいます。少しお待ちください。</p>
        </div>
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

  const pushHistory = (c: BrowseCriteria) => {
    if (isEmptyCriteria(c)) return
    setHistory(prev => {
      const next = [c, ...prev.filter(h => !sameCriteria(h, c))].slice(0, HISTORY_MAX)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const applyCriteria = (c: BrowseCriteria) => {
    setApplied(c)
    setKeywordInput(c.keyword)
    pushHistory(c)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyCriteria({ ...applied, keyword: keywordInput })
  }

  const openDetail = () => {
    setDraftGroups(applied.groups)
    setDraftSH(applied.scienceHumanities)
    setDraftHometowns(applied.hometowns)
    setDraftSort(applied.sortBy)
    setDetailOpen(true)
  }

  const handleApplyDetail = () => {
    applyCriteria({
      ...applied,
      keyword: keywordInput,
      groups: draftGroups,
      scienceHumanities: draftSH,
      hometowns: draftHometowns,
      sortBy: draftSort,
    })
    setDetailOpen(false)
  }

  const handleResetDetail = () => {
    setDraftGroups([])
    setDraftSH('')
    setDraftHometowns([])
    setDraftSort('')
  }

  const handleResetAll = () => {
    setApplied(EMPTY_CRITERIA)
    setKeywordInput('')
    handleResetDetail()
  }

  const removeChip = (kind: 'keyword' | 'groups' | 'sh' | 'hometowns' | 'sort') => {
    const next = { ...applied }
    if (kind === 'keyword') { next.keyword = ''; setKeywordInput('') }
    if (kind === 'groups') { next.groups = []; if (detailOpen) setDraftGroups([]) }
    if (kind === 'sh') { next.scienceHumanities = ''; if (detailOpen) setDraftSH('') }
    if (kind === 'hometowns') { next.hometowns = []; if (detailOpen) setDraftHometowns([]) }
    if (kind === 'sort') { next.sortBy = ''; if (detailOpen) setDraftSort('') }
    setApplied(next)
  }

  const toggleDraftGroup = (g: string) => {
    setDraftGroups(prev => prev.includes(g) ? prev.filter(v => v !== g) : [...prev, g])
  }
  const toggleDraftHometown = (h: string) => {
    setDraftHometowns(prev => prev.includes(h) ? prev.filter(v => v !== h) : [...prev, h])
  }

  const handleGridLike = async (profile: BrowseProfileItem) => {
    if (profile.is_liked || localLikedIds.has(profile.id)) return
    // 解説: isStockApplicable = いいね在庫機能が有効（男性のみ対象）。在庫ゼロならトーストのみ表示してリターン
    // 男性で在庫切れなら送信せずトーストのみ
    if (isStockApplicable && likeStockQty <= 0) {
      // @copy CRO-toast-browse-01〜03 Lv1
      showToast(pickRandom([
        '今日のいいねは使い切りました。また明日、補充されます。',
        '今日のいいねはおしまいです。明日また増えるので楽しみにしていてください。',
        '今日のいいねを使い切りました。続きはまた明日になりますね。',
      ]))
      return
    }
    // 解説: 楽観的更新 = localLikedIds に追加して即座に UI を「いいね済み」にする。API 失敗時にはロールバック
    // 楽観的更新: 即座に UI を「いいね済み」に
    setLocalLikedIds(prev => new Set([...prev, profile.id]))
    const _likedName = profile.name ?? '相手'
    // @copy CRO-toast-browse-04〜06 Lv1 — 保留: 「待ってみましょう」は「〜しよう」禁止類似・オーナー確認待ち
    showToast(pickRandom([
      `${_likedName}さんにいいねを送りました。届くといいですね。`,
      `${_likedName}さんにいいねを送りました。よいお返事があるといいですね。`,
      `${_likedName}さんにいいねを送りました。あとはのんびり待ってみましょう。`,
    ]))
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes/', { liked_id: profile.id })
      const likeCount = parseInt(localStorage.getItem('like-send-count') || '0')
      localStorage.setItem('like-send-count', String(likeCount + 1))
      if (likeCount === 0) trackEvent('first_like_sent')
      refetchLikeStock()
      if (res.data.is_match) {
        setMatchedUser({ name: profile.name, avatar_url: profile.avatar_url })
        setShowMatchModal(true)
        trackEvent('match_established')
      }
    } catch (err: unknown) {
      // ロールバック
      setLocalLikedIds(prev => {
        const next = new Set(prev)
        next.delete(profile.id)
        return next
      })
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      if (e?.response?.status === 400 && typeof e?.response?.data?.detail === 'string') {
        showToast(e.response.data.detail)
      }
      refetchLikeStock()
    }
  }

  const hasActiveCriteria = !isEmptyCriteria(applied)
  const detailCount =
    (applied.groups.length > 0 ? 1 : 0) +
    (applied.scienceHumanities ? 1 : 0) +
    (applied.hometowns.length > 0 ? 1 : 0) +
    (applied.sortBy ? 1 : 0)

  if (isProfileIncomplete) {
    return (
      <div
          className="flex flex-col items-center justify-center px-6 text-center"
          style={{ minHeight: 'calc(100dvh - 156px)' }}
        >
          {/* @copy CRO-heading-browse-profile-incomplete-01 Lv1 */}
          <p className="font-display text-3xl text-ink">プロフィールを完成させると、おすすめが届きます。</p>
          {/* @copy CRO-label-browse-profile-incomplete-01 Lv0 */}
          <p className="text-ink/60 text-sm mt-4">表示名・アイコン・自己紹介を設定してください。</p>
          <Button variant="bold" className="mt-8 w-full" onClick={() => navigate('/settings')}>
            {/* @copy CRO-button-browse-01 Lv1 */}
            プロフィールを設定する
          </Button>
        </div>
    )
  }

  return (
    <>
      <NotifyNudge />
      {myStatus !== 'approved' && (
        <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/30 flex items-center justify-center p-6">
          <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-sm w-full shadow-[8px_8px_0_0_#000]">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-brand border-4 border-black rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            {/* @copy CRO-heading-browse-locked-01 Lv0 — 保留: 「利用できます」は禁止「〜できます」・オーナー確認待ち */}
            <h2 className="text-xl font-bold text-center mb-3">
              {myStatus === 'rejected'
                ? '学生証の再提出が必要です'
                : '認証完了後に利用できます'}
            </h2>
            {/* @copy CRO-onboarding-browse-locked-01 Lv0 */}
            <p className="text-sm text-ink/60 text-center mb-6">
              {myStatus === 'rejected'
                ? '再申請して承認されると、他の人のプロフィールを見られるようになります。'
                : '学生証の審査が完了すると、他の人のプロフィールを見られるようになります。'}
            </p>
            {myStatus === 'rejected' ? (
              <button
                type="button"
                onClick={() => navigate('/setup/required?mode=reapply')}
                className="w-full bg-black text-white font-bold py-3 rounded-xl border-2 border-black"
              >
                {/* @copy CRO-button-browse-02 Lv0 */}
                再申請する →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full bg-brand text-black font-bold py-3 rounded-xl border-2 border-black"
              >
                {/* @copy CRO-button-browse-03 Lv1 */}
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
                {/* @copy CRO-heading-browse-01 Lv1 */}
                今日キャンパスに<br />いる、誰か。
              </h1>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {!loading && !isError && (
                <div
                  className="font-mono font-bold text-xs px-3 py-1.5 rounded-full"
                  style={{ border: '2px solid #0A0A0A', background: '#FFFFFF', color: '#0A0A0A' }}
                >
                  {profiles.length} USERS
                </div>
              )}
              {isStockApplicable && (
                <div
                  className="font-mono font-bold text-sm px-3 py-1"
                  style={{
                    border: '2px solid #0A0A0A',
                    background: likeStockQty > 0 ? '#FFFFFF' : 'var(--color-warning)',
                    color: '#0A0A0A',
                  }}
                  title="いいね在庫"
                >
                  ♡×{likeStockQty}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 検索バー + 詳細検索 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none" />
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                // @copy CRO-placeholder-browse-01 Lv1
                placeholder="自己紹介から探す"
                maxLength={100}
                className="w-full h-10 pl-9 pr-3 text-sm border-2 border-ink rounded-lg bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
              />
            </form>
            <button
              type="button"
              onClick={() => (detailOpen ? setDetailOpen(false) : openDetail())}
              // @copy CRO-label-browse-aria-01 Lv1
              aria-label="詳細検索"
              className="h-10 px-3 shrink-0 rounded-lg border-2 border-ink font-bold text-sm flex items-center gap-1.5 shadow-[2px_2px_0_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              style={detailOpen || detailCount > 0 ? { background: '#0A0A0A', color: '#FFFFFF' } : { background: '#FFFFFF', color: '#0A0A0A' }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {/* @copy CRO-button-browse-04 Lv1 */}
              {detailCount > 0 ? detailCount : '詳細'}
            </button>
          </div>

          {/* 検索履歴 */}
          {!detailOpen && history.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Clock className="w-3.5 h-3.5 text-ink/40 shrink-0" />
              {history.map((h, i) => (
                <button
                  key={`h-${i}`}
                  type="button"
                  onClick={() => applyCriteria(h)}
                  className="tag-pill shrink-0 max-w-[200px] truncate"
                  title={summarizeCriteria(h)}
                >
                  {summarizeCriteria(h)}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* 設定中の条件チップ */}
        {hasActiveCriteria && !detailOpen && (
          <div className="flex flex-wrap gap-1.5">
            {applied.keyword.trim() && (
              <button type="button" onClick={() => removeChip('keyword')} className="tag-pill flex items-center gap-1">
                「{applied.keyword.trim()}」<X className="w-3 h-3" />
              </button>
            )}
            {applied.groups.length > 0 && (
              <button type="button" onClick={() => removeChip('groups')} className="tag-pill flex items-center gap-1">
                {[...applied.groups].map(groupLabel).join('・')}<X className="w-3 h-3" />
              </button>
            )}
            {applied.scienceHumanities && (
              <button type="button" onClick={() => removeChip('sh')} className="tag-pill flex items-center gap-1">
                {shLabel(applied.scienceHumanities)}<X className="w-3 h-3" />
              </button>
            )}
            {applied.hometowns.length > 0 && (
              <button type="button" onClick={() => removeChip('hometowns')} className="tag-pill flex items-center gap-1">
                {applied.hometowns.join('・')}<X className="w-3 h-3" />
              </button>
            )}
            {applied.sortBy && (
              <button type="button" onClick={() => removeChip('sort')} className="tag-pill flex items-center gap-1">
                {SORT_OPTIONS.find(o => o.value === applied.sortBy)?.label}<X className="w-3 h-3" />
              </button>
            )}
            <button type="button" onClick={handleResetAll} className="text-xs text-ink/60 underline underline-offset-2 px-1">
              {/* @copy CRO-button-browse-05 Lv1 */}
              全て解除
            </button>
          </div>
        )}

        {/* 詳細検索パネル */}
        {detailOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-bold bg-white p-4 space-y-4"
          >
            {/* 学年・身分 */}
            <div className="space-y-2">
              {/* @copy CRO-label-browse-filter-01 Lv1 */}
              <p className="font-mono text-xs font-bold text-ink/60 uppercase">学年</p>
              <div className="grid grid-cols-2 gap-2">
                {GROUP_OPTIONS.map((o) => {
                  const checked = draftGroups.includes(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleDraftGroup(o.value)}
                      className="flex items-center gap-2 border-2 border-ink rounded-lg px-3 h-10 text-sm font-bold transition-colors"
                      style={checked ? { background: 'var(--color-brand)' } : { background: '#FFFFFF' }}
                    >
                      <span
                        className="w-4 h-4 border-2 border-ink rounded-sm flex items-center justify-center shrink-0"
                        style={checked ? { background: '#0A0A0A' } : {}}
                      >
                        {checked && <span className="w-2 h-2 bg-brand" />}
                      </span>
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 文理 */}
            <div className="space-y-2">
              {/* @copy CRO-label-browse-filter-02 Lv1 */}
              <p className="font-mono text-xs font-bold text-ink/60 uppercase">文理</p>
              <div className="flex gap-2">
                {SH_OPTIONS.map((o) => (
                  <button
                    key={o.value || 'any'}
                    type="button"
                    onClick={() => setDraftSH(o.value)}
                    className="flex-1 border-2 border-ink rounded-lg h-10 text-sm font-bold transition-colors"
                    style={draftSH === o.value ? { background: '#0A0A0A', color: '#FFFFFF' } : { background: '#FFFFFF', color: '#0A0A0A' }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 出身地 */}
            <div className="space-y-2">
              {/* @copy CRO-label-browse-filter-03 Lv1 */}
              <p className="font-mono text-xs font-bold text-ink/60 uppercase">出身地</p>
              {hometownOptions.length === 0 ? (
                // @copy CRO-empty-browse-hometown-01 Lv1
                <p className="text-xs text-ink/40">まだ登録された出身地がありません。</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {hometownOptions.map((h) => {
                    const checked = draftHometowns.includes(h)
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => toggleDraftHometown(h)}
                        className="tag-pill transition-colors"
                        style={checked ? { background: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' } : {}}
                      >
                        {h}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 並び替え */}
            <div className="space-y-2">
              {/* @copy CRO-label-browse-filter-04 Lv1 */}
              <p className="font-mono text-xs font-bold text-ink/60 uppercase">並び替え</p>
              <select
                value={draftSort}
                onChange={(e) => setDraftSort(e.target.value)}
                className="w-full h-10 border-2 border-ink rounded-lg bg-white px-3 text-sm font-bold focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A]"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value || 'default'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              {/* @copy CRO-button-browse-06〜07 Lv1 */}
              <Button size="sm" variant="bold" onClick={handleApplyDetail} className="flex-1">適用する</Button>
              <Button size="sm" variant="outline-bold" onClick={handleResetDetail} className="flex-1">クリア</Button>
            </div>
          </motion.div>
        )}

        {/* @copy CRO-error-browse-01 Lv1 */}
        {isError && <ErrorState message="うまく読み込めませんでした。もう一度お試しください。" onRetry={refetch} />}

        {/* ローディング */}
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-bold overflow-hidden bg-gray-100">
                <div className="w-full aspect-square bg-gray-200" />
                <div className="px-3 py-2 space-y-1.5 bg-white border-t-2 border-ink">
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
                  <Search className="w-16 h-16 text-ink/20" />
                </div>
                <div>
                  <p
                    className="font-display text-2xl text-ink"
                    style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
                  >
                    {emptyStateTitle}
                  </p>
                  {/* @copy CRO-empty-browse-sub-01 Lv1 */}
                  <p className="text-sm text-ink/60 mt-1">
                    フィルターを変えるか、少し時間をおいてのぞいてみてください。
                  </p>
                </div>
                {hasActiveCriteria && (
                  <Button
                    variant="outline-bold"
                    onClick={handleResetAll}
                    className="rounded-xl px-6"
                  >
                    {/* @copy CRO-button-browse-08 Lv1 */}
                    条件をリセット
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
                          avatar_url: profile.avatar_url,
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
                            // @copy CRO-label-browse-like-01 Lv1
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
    </>
  )
}
