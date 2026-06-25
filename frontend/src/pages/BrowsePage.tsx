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
import { ChevronDown, ChevronUp, Clock, Lock, Search, SlidersHorizontal, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ErrorState from '@/components/ErrorState'
import NotifyNudge from '@/components/NotifyNudge'
import ColorfulCard from '@/components/ColorfulCard'
import SelectModal from '@/components/SelectModal'
import { usePageTitle } from '@/hooks/usePageTitle'
import { PREFECTURES } from '@/lib/osaka-u-data'
import { DETAIL_FIELDS, HEIGHT_MIN, HEIGHT_MAX, ZODIAC_LABELS } from '@/constants/profileDetailFields'
import api from '@/lib/api'
import { dbGet, dbSet } from '@/lib/db'
import type { BrowseProfileItem } from '@/lib/db'

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
  height: [number | null, number | null]
  body_type: string
  blood_type: string
  zodiac: string
  sibling_rank: string
  campus: string
  housing: string
  commute_time: string
  second_lang: string
  relationship_goal: string
  marriage_intent: string
  preferred_age_band: string
  drinking: string
  smoking: string
  mbti: string
  languages: string[]
  commute_means: string[]
}

const EMPTY_CRITERIA: BrowseCriteria = {
  keyword: '',
  groups: [],
  scienceHumanities: '',
  hometowns: [],
  sortBy: '',
  height: [null, null],
  body_type: '',
  blood_type: '',
  zodiac: '',
  sibling_rank: '',
  campus: '',
  housing: '',
  commute_time: '',
  second_lang: '',
  relationship_goal: '',
  marriage_intent: '',
  preferred_age_band: '',
  drinking: '',
  smoking: '',
  mbti: '',
  languages: [],
  commute_means: [],
}

const HISTORY_KEY = 'crocoBrowseHistory'
const APPLIED_KEY = 'crocoBrowseApplied'
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

// 並び替え — '' = デフォルト（ログイン順）。'last_seen' は legacy compat 用（deserializeCriteria で '' に正規化）
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'ログイン順' },
  { value: 'created_desc', label: '新着順' },
  { value: 'year_asc', label: '学年（低い順）' },
  { value: 'year_desc', label: '学年（高い順）' },
]
// SelectModal に渡す選択肢（'' は「未選択」として扱うため除外）
const SORT_MODAL_OPTIONS = SORT_OPTIONS.filter(o => o.value !== '')

// 星座オプション（ZODIAC_LABELS は profileDetailFields の SSoT）
const ZODIAC_OPTIONS = Object.entries(ZODIAC_LABELS).map(([v, l]) => ({ value: v, label: l }))

// 「もっと絞り込む」単一選択フィールドの表示順
const MORE_SINGLE_KEYS = [
  'body_type', 'blood_type', 'zodiac', 'campus', 'housing',
  'commute_time', 'mbti', 'drinking', 'smoking',
  'relationship_goal', 'marriage_intent', 'preferred_age_band', 'second_lang',
] as const

// 「もっと絞り込む」複数選択フィールド
const MORE_MULTI_FIELDS = [
  { key: 'languages', maxItems: 8 },
  { key: 'commute_means', maxItems: 6 },
] as const

function getFieldLabel(key: string): string {
  if (key === 'zodiac') return '星座'
  return DETAIL_FIELDS.find(f => f.key === key)?.label ?? key
}

function getFieldOptions(key: string): Array<{ value: string; label: string }> {
  if (key === 'zodiac') return ZODIAC_OPTIONS
  return DETAIL_FIELDS.find(f => f.key === key)?.options ?? []
}

function getStringVal(c: BrowseCriteria, key: string): string {
  return (c as Record<string, unknown>)[key] as string ?? ''
}

function getArrayVal(c: BrowseCriteria, key: string): string[] {
  return (c as Record<string, unknown>)[key] as string[] ?? []
}

// 解説: deserializeCriteria = JSON.parse 済みオブジェクトから BrowseCriteria を安全に復元（旧フォーマット互換・新キーをデフォルト補完）
function deserializeCriteria(h: Record<string, unknown>): BrowseCriteria {
  const sortByRaw = typeof h.sortBy === 'string' ? h.sortBy : ''
  return {
    keyword: typeof h.keyword === 'string' ? h.keyword : '',
    groups: Array.isArray(h.groups) ? (h.groups as string[]) : [],
    scienceHumanities: (h.scienceHumanities ?? '') as ScienceHumanities,
    hometowns: Array.isArray(h.hometowns) ? (h.hometowns as string[]) : [],
    // 旧 'last_seen' → '' に正規化（デフォルトと同義のため）
    sortBy: sortByRaw === 'last_seen' ? '' : sortByRaw,
    height: Array.isArray(h.height) && h.height.length === 2
      ? [typeof h.height[0] === 'number' ? h.height[0] : null, typeof h.height[1] === 'number' ? h.height[1] : null]
      : [null, null],
    body_type: typeof h.body_type === 'string' ? h.body_type : '',
    blood_type: typeof h.blood_type === 'string' ? h.blood_type : '',
    zodiac: typeof h.zodiac === 'string' ? h.zodiac : '',
    sibling_rank: typeof h.sibling_rank === 'string' ? h.sibling_rank : '',
    campus: typeof h.campus === 'string' ? h.campus : '',
    housing: typeof h.housing === 'string' ? h.housing : '',
    commute_time: typeof h.commute_time === 'string' ? h.commute_time : '',
    second_lang: typeof h.second_lang === 'string' ? h.second_lang : '',
    relationship_goal: typeof h.relationship_goal === 'string' ? h.relationship_goal : '',
    marriage_intent: typeof h.marriage_intent === 'string' ? h.marriage_intent : '',
    preferred_age_band: typeof h.preferred_age_band === 'string' ? h.preferred_age_band : '',
    drinking: typeof h.drinking === 'string' ? h.drinking : '',
    smoking: typeof h.smoking === 'string' ? h.smoking : '',
    mbti: typeof h.mbti === 'string' ? h.mbti : '',
    languages: Array.isArray(h.languages) ? (h.languages as string[]) : [],
    commute_means: Array.isArray(h.commute_means) ? (h.commute_means as string[]) : [],
  }
}

function loadHistory(): BrowseCriteria[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return (parsed as Array<Record<string, unknown>>).map(deserializeCriteria)
      }
    }
  } catch {}
  return []
}

function loadApplied(): BrowseCriteria {
  try {
    const raw = localStorage.getItem(APPLIED_KEY)
    if (raw) return deserializeCriteria(JSON.parse(raw) as Record<string, unknown>)
  } catch {}
  return EMPTY_CRITERIA
}

function isEmptyCriteria(c: BrowseCriteria): boolean {
  return (
    !c.keyword.trim() &&
    c.groups.length === 0 &&
    !c.scienceHumanities &&
    c.hometowns.length === 0 &&
    !c.sortBy &&
    c.height[0] === null && c.height[1] === null &&
    !c.body_type && !c.blood_type && !c.zodiac && !c.sibling_rank && !c.campus &&
    !c.housing && !c.commute_time && !c.second_lang && !c.relationship_goal &&
    !c.marriage_intent && !c.preferred_age_band && !c.drinking && !c.smoking &&
    !c.mbti &&
    c.languages.length === 0 &&
    c.commute_means.length === 0
  )
}

function sameCriteria(a: BrowseCriteria, b: BrowseCriteria): boolean {
  return (
    a.keyword.trim() === b.keyword.trim() &&
    a.scienceHumanities === b.scienceHumanities &&
    a.sortBy === b.sortBy &&
    a.zodiac === b.zodiac &&
    [...a.groups].sort().join(',') === [...b.groups].sort().join(',') &&
    [...a.hometowns].sort().join(',') === [...b.hometowns].sort().join(',') &&
    a.height[0] === b.height[0] && a.height[1] === b.height[1] &&
    a.body_type === b.body_type && a.blood_type === b.blood_type &&
    a.sibling_rank === b.sibling_rank && a.campus === b.campus &&
    a.housing === b.housing && a.commute_time === b.commute_time &&
    a.second_lang === b.second_lang && a.relationship_goal === b.relationship_goal &&
    a.marriage_intent === b.marriage_intent && a.preferred_age_band === b.preferred_age_band &&
    a.drinking === b.drinking && a.smoking === b.smoking && a.mbti === b.mbti &&
    [...a.languages].sort().join(',') === [...b.languages].sort().join(',') &&
    [...a.commute_means].sort().join(',') === [...b.commute_means].sort().join(',')
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
  if (c.height[0] !== null || c.height[1] !== null) {
    parts.push(`${c.height[0] ?? HEIGHT_MIN}〜${c.height[1] ?? HEIGHT_MAX}cm`)
  }
  if (c.zodiac) parts.push(ZODIAC_LABELS[c.zodiac] ?? c.zodiac)
  const singleVals: Record<string, string> = {
    body_type: c.body_type, blood_type: c.blood_type, sibling_rank: c.sibling_rank,
    campus: c.campus, housing: c.housing, commute_time: c.commute_time,
    second_lang: c.second_lang, relationship_goal: c.relationship_goal,
    marriage_intent: c.marriage_intent, preferred_age_band: c.preferred_age_band,
    drinking: c.drinking, smoking: c.smoking, mbti: c.mbti,
  }
  const multiVals: Record<string, string[]> = { languages: c.languages, commute_means: c.commute_means }
  for (const f of DETAIL_FIELDS) {
    if (f.control === 'single') {
      const val = singleVals[f.key]
      if (val) parts.push(f.options?.find(o => o.value === val)?.label ?? val)
    } else if (f.control === 'multi') {
      const vals = multiVals[f.key]
      if (vals?.length) parts.push(vals.map(v => f.options?.find(o => o.value === v)?.label ?? v).join('・'))
    }
  }
  return parts.join(' / ') || 'すべて'
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

// ─── FilterBanner ────────────────────────────────────────────────────────────
// バナー形式のフィルタ行（2段: ラベル + 現在値）。クリックで SelectModal を開く
function FilterBanner({
  label,
  displayValue,
  hasValue,
  onClick,
}: {
  label: string
  displayValue: string
  hasValue: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left border-2 border-ink rounded-xl px-3 py-2.5 bg-white transition-all active:translate-x-px active:translate-y-px active:shadow-none"
      style={{ boxShadow: '2px 2px 0 0 #0A0A0A' }}
    >
      <p className="font-mono text-[10px] text-ink/50 uppercase tracking-wider leading-none">{label}</p>
      <p
        className="text-sm mt-1 leading-tight"
        style={{ fontWeight: hasValue ? 700 : 400, color: hasValue ? '#0A0A0A' : 'rgba(10,10,10,0.4)' }}
      >
        {hasValue ? displayValue : '指定なし'}
      </p>
    </button>
  )
}

// ─── HeightRangeSlider ───────────────────────────────────────────────────────
// デュアルスライダー（min/max を 2 枚の透明 input[range] で実現）
function HeightRangeSlider({
  value,
  onChange,
}: {
  value: [number | null, number | null]
  onChange: (v: [number | null, number | null]) => void
}) {
  const lo = value[0] ?? HEIGHT_MIN
  const hi = value[1] ?? HEIGHT_MAX
  const range = HEIGHT_MAX - HEIGHT_MIN
  const loPct = ((lo - HEIGHT_MIN) / range) * 100
  const hiPct = ((hi - HEIGHT_MIN) / range) * 100
  // min サムが max に近い or 超えた場合は min を前面に（手動でドラッグできるよう z-index スワップ）
  const minOnTop = lo >= hi - 3

  return (
    <div className="relative" style={{ height: 28 }}>
      {/* グレートラック */}
      <div
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded"
        style={{ height: 4, background: 'rgba(10,10,10,0.12)' }}
      >
        {/* 塗りつぶし範囲 */}
        <div
          className="absolute h-full rounded bg-ink"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />
      </div>
      {/* min input（透明・前面 or 背面） */}
      <input
        type="range"
        min={HEIGHT_MIN}
        max={HEIGHT_MAX}
        value={lo}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: minOnTop ? 5 : 3 }}
        onChange={e => {
          const v = Number(e.target.value)
          onChange([v, Math.max(v, hi)])
        }}
      />
      {/* max input（透明） */}
      <input
        type="range"
        min={HEIGHT_MIN}
        max={HEIGHT_MAX}
        value={hi}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: minOnTop ? 3 : 5 }}
        onChange={e => {
          const v = Number(e.target.value)
          onChange([Math.min(lo, v), v])
        }}
      />
      {/* ビジュアルサム（pointer-events:none で input を邪魔しない） */}
      {[loPct, hiPct].map((pct, i) => (
        <div
          key={i}
          className="absolute top-1/2 pointer-events-none"
          style={{
            left: `calc(${pct}% - 10px)`,
            transform: 'translateY(-50%)',
            width: 20,
            height: 20,
            background: '#FFFFFF',
            border: '2px solid #0A0A0A',
            borderRadius: '50%',
            boxShadow: '1px 1px 0 0 #0A0A0A',
          }}
        />
      ))}
    </div>
  )
}

// ─── BrowsePage ──────────────────────────────────────────────────────────────

export default function BrowsePage() {
  usePageTitle('みんなを見る')
  const navigate = useNavigate()
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

  const [detailOpen, setDetailOpen] = useState(false)
  const [keywordInput, setKeywordInput] = useState(() => loadApplied().keyword)
  const [applied, setApplied] = useState<BrowseCriteria>(loadApplied)
  const [history, setHistory] = useState<BrowseCriteria[]>(loadHistory)

  // 解説: draft = 詳細パネル内の編集中条件。「適用する」で applied に反映する二段階構造
  const [draft, setDraft] = useState<BrowseCriteria>(EMPTY_CRITERIA)
  // どの SelectModal が開いているか（フィールドキー or null）
  const [activeModal, setActiveModal] = useState<string | null>(null)
  // 「もっと絞り込む」展開状態
  const [expandMore, setExpandMore] = useState(false)

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
    // 基本フィルタ
    applied.groups.forEach(g => params.append('groups', g))
    if (applied.scienceHumanities) params.set('science_humanities', applied.scienceHumanities)
    applied.hometowns.forEach(h => params.append('hometowns', h))
    if (applied.keyword.trim()) params.set('bio_keyword', applied.keyword.trim())
    if (applied.sortBy) params.set('sort_by', applied.sortBy)
    // 指示24: 新パラメータ
    if (applied.height[0] !== null) params.set('height_min', String(applied.height[0]))
    if (applied.height[1] !== null) params.set('height_max', String(applied.height[1]))
    if (applied.body_type) params.set('body_type', applied.body_type)
    if (applied.blood_type) params.set('blood_type', applied.blood_type)
    if (applied.zodiac) params.set('zodiac', applied.zodiac)
    if (applied.campus) params.set('campus', applied.campus)
    if (applied.housing) params.set('housing', applied.housing)
    if (applied.commute_time) params.set('commute_time', applied.commute_time)
    if (applied.mbti) params.set('mbti', applied.mbti)
    if (applied.drinking) params.set('drinking', applied.drinking)
    if (applied.smoking) params.set('smoking', applied.smoking)
    if (applied.relationship_goal) params.set('relationship_goal', applied.relationship_goal)
    if (applied.marriage_intent) params.set('marriage_intent', applied.marriage_intent)
    if (applied.preferred_age_band) params.set('preferred_age_band', applied.preferred_age_band)
    if (applied.second_lang) params.set('second_lang', applied.second_lang)
    // overlap 配列（重複キーで送信 = OR マッチ）
    applied.languages.forEach(l => params.append('languages', l))
    applied.commute_means.forEach(m => params.append('commute_means', m))

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

  const { data: likeStock } = useQuery({
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
    try { localStorage.setItem(APPLIED_KEY, JSON.stringify(c)) } catch {}
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyCriteria({ ...applied, keyword: keywordInput })
  }

  const openDetail = () => {
    setDraft({ ...applied })
    setExpandMore(false)
    setDetailOpen(true)
  }

  const handleApplyDetail = () => {
    applyCriteria({ ...draft, keyword: keywordInput })
    setDetailOpen(false)
    setActiveModal(null)
    setExpandMore(false)
  }

  const handleResetDetail = () => {
    setDraft({ ...EMPTY_CRITERIA })
  }

  const handleResetAll = () => {
    setApplied(EMPTY_CRITERIA)
    setKeywordInput('')
    try { localStorage.setItem(APPLIED_KEY, JSON.stringify(EMPTY_CRITERIA)) } catch {}
  }

  const removeChip = (kind: 'keyword' | 'groups' | 'sh' | 'hometowns' | 'sort') => {
    const next = { ...applied }
    if (kind === 'keyword') { next.keyword = ''; setKeywordInput('') }
    if (kind === 'groups') { next.groups = []; if (detailOpen) setDraft(d => ({ ...d, groups: [] })) }
    if (kind === 'sh') { next.scienceHumanities = '' as ScienceHumanities; if (detailOpen) setDraft(d => ({ ...d, scienceHumanities: '' })) }
    if (kind === 'hometowns') { next.hometowns = []; if (detailOpen) setDraft(d => ({ ...d, hometowns: [] })) }
    if (kind === 'sort') { next.sortBy = ''; if (detailOpen) setDraft(d => ({ ...d, sortBy: '' })) }
    setApplied(next)
    try { localStorage.setItem(APPLIED_KEY, JSON.stringify(next)) } catch {}
  }

  const clearExtraFilters = () => {
    const next: BrowseCriteria = {
      ...applied,
      height: [null, null],
      body_type: '', blood_type: '', zodiac: '', campus: '', housing: '',
      commute_time: '', mbti: '', drinking: '', smoking: '',
      relationship_goal: '', marriage_intent: '', preferred_age_band: '',
      second_lang: '', languages: [], commute_means: [],
    }
    setApplied(next)
    if (detailOpen) setDraft(d => ({ ...d, ...next }))
    try { localStorage.setItem(APPLIED_KEY, JSON.stringify(next)) } catch {}
  }

  const hasActiveCriteria = !isEmptyCriteria(applied)

  // 詳細ボタンのバッジ数（全フィルタ種類のカウント）
  const detailCount =
    (applied.groups.length > 0 ? 1 : 0) +
    (applied.scienceHumanities ? 1 : 0) +
    (applied.hometowns.length > 0 ? 1 : 0) +
    (applied.sortBy ? 1 : 0) +
    (applied.height[0] !== null || applied.height[1] !== null ? 1 : 0) +
    (applied.body_type ? 1 : 0) +
    (applied.blood_type ? 1 : 0) +
    (applied.zodiac ? 1 : 0) +
    (applied.campus ? 1 : 0) +
    (applied.housing ? 1 : 0) +
    (applied.commute_time ? 1 : 0) +
    (applied.mbti ? 1 : 0) +
    (applied.drinking ? 1 : 0) +
    (applied.smoking ? 1 : 0) +
    (applied.relationship_goal ? 1 : 0) +
    (applied.marriage_intent ? 1 : 0) +
    (applied.preferred_age_band ? 1 : 0) +
    (applied.second_lang ? 1 : 0) +
    (applied.languages.length > 0 ? 1 : 0) +
    (applied.commute_means.length > 0 ? 1 : 0)

  // 「もっと絞り込む」セクションの有効フィルタ数（チップ表示用）
  const extraFilterCount =
    (applied.height[0] !== null || applied.height[1] !== null ? 1 : 0) +
    (applied.body_type ? 1 : 0) +
    (applied.blood_type ? 1 : 0) +
    (applied.zodiac ? 1 : 0) +
    (applied.campus ? 1 : 0) +
    (applied.housing ? 1 : 0) +
    (applied.commute_time ? 1 : 0) +
    (applied.mbti ? 1 : 0) +
    (applied.drinking ? 1 : 0) +
    (applied.smoking ? 1 : 0) +
    (applied.relationship_goal ? 1 : 0) +
    (applied.marriage_intent ? 1 : 0) +
    (applied.preferred_age_band ? 1 : 0) +
    (applied.second_lang ? 1 : 0) +
    (applied.languages.length > 0 ? 1 : 0) +
    (applied.commute_means.length > 0 ? 1 : 0)

  // フィールドのラベルと現在値から SelectModal 用のラベル文字列を返す
  const getSelectedLabel = (key: string): string => {
    const val = getStringVal(applied, key)
    if (!val) return ''
    return getFieldOptions(key).find(o => o.value === val)?.label ?? val
  }

  const getSelectedArrayLabel = (key: string): string => {
    const vals = getArrayVal(applied, key)
    if (!vals.length) return ''
    return vals.map(v => getFieldOptions(key).find(o => o.value === v)?.label ?? v).join('・')
  }

  // draft 内での同じ取得関数
  const getDraftSelectedLabel = (key: string): string => {
    const val = getStringVal(draft, key)
    if (!val) return ''
    return getFieldOptions(key).find(o => o.value === val)?.label ?? val
  }

  const getDraftArrayLabel = (key: string): string => {
    const vals = getArrayVal(draft, key)
    if (!vals.length) return ''
    return vals.map(v => getFieldOptions(key).find(o => o.value === v)?.label ?? v).join('・')
  }

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
            {/* @copy CRO-heading-browse-locked-01 Lv0 */}
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

        {/* 検索バー + 詳細検索ボタン */}
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
                {SORT_OPTIONS.find(o => o.value === applied.sortBy)?.label ?? applied.sortBy}<X className="w-3 h-3" />
              </button>
            )}
            {extraFilterCount > 0 && (
              <button type="button" onClick={clearExtraFilters} className="tag-pill flex items-center gap-1">
                詳細+{extraFilterCount}<X className="w-3 h-3" />
              </button>
            )}
            <button type="button" onClick={handleResetAll} className="text-xs text-ink/60 underline underline-offset-2 px-1">
              {/* @copy CRO-button-browse-05 Lv1 */}
              全て解除
            </button>
          </div>
        )}

        {/* ═══ 詳細検索パネル ═══ */}
        {detailOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-bold bg-white p-4 space-y-4"
          >
            {/* パネルヘッダー */}
            <div className="flex items-center justify-between pb-1">
              <p className="font-display font-black text-base text-ink">絞り込む</p>
              <button
                type="button"
                onClick={() => { setDetailOpen(false); setActiveModal(null) }}
                className="p-1 text-ink/50 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── 学年 ── */}
            <div className="space-y-2">
              {/* @copy CRO-label-browse-filter-01 Lv1 */}
              <p className="font-mono text-xs font-bold text-ink/60 uppercase">学年</p>
              <div className="grid grid-cols-2 gap-2">
                {GROUP_OPTIONS.map((o) => {
                  const checked = draft.groups.includes(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        setDraft(d => ({
                          ...d,
                          groups: d.groups.includes(o.value)
                            ? d.groups.filter(v => v !== o.value)
                            : [...d.groups, o.value],
                        }))
                      }
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

            {/* ── 文理 ── */}
            <div className="space-y-2">
              {/* @copy CRO-label-browse-filter-02 Lv1 */}
              <p className="font-mono text-xs font-bold text-ink/60 uppercase">文理</p>
              <div className="flex gap-2">
                {SH_OPTIONS.map((o) => (
                  <button
                    key={o.value || 'any'}
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, scienceHumanities: o.value }))}
                    className="flex-1 border-2 border-ink rounded-lg h-10 text-sm font-bold transition-colors"
                    style={draft.scienceHumanities === o.value ? { background: '#0A0A0A', color: '#FFFFFF' } : { background: '#FFFFFF', color: '#0A0A0A' }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 身長レンジ ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {/* @copy CRO-label-browse-filter-height-01 Lv1 */}
                <p className="font-mono text-xs font-bold text-ink/60 uppercase">身長</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-ink">
                    {draft.height[0] !== null || draft.height[1] !== null
                      ? `${draft.height[0] ?? HEIGHT_MIN}〜${draft.height[1] ?? HEIGHT_MAX}cm`
                      : '指定なし'}
                  </p>
                  {(draft.height[0] !== null || draft.height[1] !== null) && (
                    <button
                      type="button"
                      onClick={() => setDraft(d => ({ ...d, height: [null, null] }))}
                      className="text-xs text-ink/40 underline"
                    >
                      解除
                    </button>
                  )}
                </div>
              </div>
              <HeightRangeSlider
                value={draft.height}
                onChange={h => setDraft(d => ({ ...d, height: h }))}
              />
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-ink/40">{HEIGHT_MIN}cm</span>
                <span className="font-mono text-[10px] text-ink/40">{HEIGHT_MAX}cm</span>
              </div>
            </div>

            {/* ── 出身地（バナー → SelectModal multi） ── */}
            <FilterBanner
              label="出身地"
              hasValue={draft.hometowns.length > 0}
              displayValue={draft.hometowns.join('・')}
              onClick={() => setActiveModal('hometowns')}
            />

            {/* ── 並び替え（バナー → SelectModal single） ── */}
            <FilterBanner
              label="並び替え"
              hasValue={!!draft.sortBy}
              displayValue={SORT_OPTIONS.find(o => o.value === draft.sortBy)?.label ?? ''}
              onClick={() => setActiveModal('sortBy')}
            />

            {/* ── もっと絞り込む（展開トグル） ── */}
            <button
              type="button"
              onClick={() => setExpandMore(e => !e)}
              className="w-full flex items-center justify-between border-2 border-ink/30 rounded-xl px-3 py-2.5 text-sm font-bold text-ink/70 bg-bone"
            >
              <span>もっと絞り込む</span>
              {expandMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expandMore && (
              <div className="space-y-3 pt-1">
                {/* 単一選択 13 種（指示25の定義順） */}
                {MORE_SINGLE_KEYS.map(key => {
                  const val = getStringVal(draft, key)
                  const label = getDraftSelectedLabel(key)
                  return (
                    <FilterBanner
                      key={key}
                      label={getFieldLabel(key)}
                      hasValue={!!val}
                      displayValue={label}
                      onClick={() => setActiveModal(key)}
                    />
                  )
                })}

                {/* 複数選択 2 種 */}
                {MORE_MULTI_FIELDS.map(({ key }) => {
                  const vals = getArrayVal(draft, key)
                  const label = getDraftArrayLabel(key)
                  return (
                    <FilterBanner
                      key={key}
                      label={getFieldLabel(key)}
                      hasValue={vals.length > 0}
                      displayValue={label}
                      onClick={() => setActiveModal(key)}
                    />
                  )
                })}
              </div>
            )}

            {/* パネルフッター */}
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
                {profiles.map((profile, index) => (
                  <ColorfulCard
                    key={profile.id}
                    index={index}
                    user={{
                      id: profile.id,
                      name: profile.name,
                      year: profile.year,
                      avatar_url: profile.avatar_url,
                      status_message: profile.status_message,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 空白の avatar placeholder（絵文字禁止対応） */}
      <div className="hidden"><User /></div>

      {/* ═══ SelectModal 群（フィルタパネル上に重畳） ═══ */}

      {/* 出身地（multi） */}
      <SelectModal
        open={activeModal === 'hometowns'}
        mode="multi"
        title="出身地"
        options={hometownOptions.map(h => ({ value: h, label: h }))}
        value={draft.hometowns}
        compact
        onConfirm={v => { setDraft(d => ({ ...d, hometowns: v as string[] })); setActiveModal(null) }}
        onClose={() => setActiveModal(null)}
      />

      {/* 並び替え（single） */}
      <SelectModal
        open={activeModal === 'sortBy'}
        mode="single"
        title="並び替え"
        options={SORT_MODAL_OPTIONS}
        value={draft.sortBy || null}
        compact
        onConfirm={v => { setDraft(d => ({ ...d, sortBy: (v as string | null) ?? '' })); setActiveModal(null) }}
        onClose={() => setActiveModal(null)}
      />

      {/* 単一選択 13 フィールド */}
      {MORE_SINGLE_KEYS.map(key => (
        <SelectModal
          key={key}
          open={activeModal === key}
          mode="single"
          title={getFieldLabel(key)}
          options={getFieldOptions(key)}
          value={getStringVal(draft, key) || null}
          compact
          onConfirm={v => { setDraft(d => ({ ...d, [key]: (v as string | null) ?? '' })); setActiveModal(null) }}
          onClose={() => setActiveModal(null)}
        />
      ))}

      {/* 複数選択 2 フィールド */}
      {MORE_MULTI_FIELDS.map(({ key, maxItems }) => (
        <SelectModal
          key={key}
          open={activeModal === key}
          mode="multi"
          title={getFieldLabel(key)}
          options={getFieldOptions(key)}
          value={getArrayVal(draft, key)}
          maxItems={maxItems}
          compact
          onConfirm={v => { setDraft(d => ({ ...d, [key]: v as string[] })); setActiveModal(null) }}
          onClose={() => setActiveModal(null)}
        />
      ))}
    </>
  )
}
