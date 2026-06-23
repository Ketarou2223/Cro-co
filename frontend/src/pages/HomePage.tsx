// 解説: このファイルはログイン済みユーザーのホームページを定義する。
// 解説: 機能: アバター + プロフィール完成度バー / STATS / おすすめカード / いいね CTA / クイックアクション
// 解説: heroLine = JST 日付ベースで HERO_LINES を毎日ローテーション（全ユーザー共通・固定）
// 解説: completionPct = COMPLETION_ITEMS（9項目）のうち埋まっているものの割合（%）
// 解説: quota = いいね受信枠（女性向け・LIKE_QUOTA_ENABLED フラグ ON 時のみ表示）
// 解説: likeStock = いいね在庫数（男性向け・LIKE_STOCK_ENABLED フラグ ON 時のみ表示）
import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Bell, Heart, Mail, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { RootOutletCtx } from '@/components/RootLayout'
import ErrorState from '@/components/ErrorState'
import ColorfulCard from '@/components/ColorfulCard'
import PWAInstallBanner from '@/components/PWAInstallBanner'
import { usePageTitle } from '@/hooks/usePageTitle'
import api from '@/lib/api'
import { clearAllDB, clearSensitiveStorage } from '@/lib/db'

interface Profile {
  id: string
  email: string
  created_at: string
  updated_at: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  profile_image_path: string | null
  avatar_url: string | null
  liked_count: number
  interests: string[]
  club: string | null
  clubs?: string[] | null
  hometown: string | null
  gender: string | null
  interest_in: string | null
  profile_setup_completed: boolean
  onboarding_completed: boolean
  student_id_submitted: boolean
  status: 'pending_review' | 'approved' | 'rejected'
}

interface RecommendedUser {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  avatar_url: string | null
  status_message: string | null
  score: number
}

const COMPLETION_ITEMS: { key: keyof Profile; label: string }[] = [
  { key: 'name', label: '名前' },
  { key: 'bio', label: '自己紹介' },
  { key: 'faculty', label: '学部' },
  { key: 'year', label: '学年' },
  { key: 'club', label: 'サークル' },
  { key: 'hometown', label: '出身地' },
  { key: 'profile_image_path', label: 'プロフィール写真' },
  { key: 'gender', label: '性別' },
  { key: 'interest_in', label: '恋愛対象' },
]

// 解説: isFieldFilled = プロフィール項目が入力済みかを判定する（配列は length > 0・数値は != null）
function isFieldFilled(profile: Profile, key: keyof Profile): boolean {
  const v = profile[key]
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'number') return v != null
  return !!v
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.1 },
  }),
}

const HERO_LINES = [
  // @copy CRO-heading-home-hero-01 Lv2
  'キャンパスを越えて、好きを見つけよう。',
  // @copy CRO-heading-home-hero-02 Lv2
  '同じキャンパスに、まだ知らない人。',
  // @copy CRO-heading-home-hero-03 Lv2
  'すれ違ってたかもしれない人へ。',
  // @copy CRO-heading-home-hero-04 Lv2
  '隣の学部に、気になる人がいるかも。',
  // @copy CRO-heading-home-hero-05 Lv2
  '講義の合間に、出会いを。',
  // @copy CRO-heading-home-hero-06 Lv2
  '好きになる準備、できてますか。',
  // @copy CRO-heading-home-hero-07 Lv2
  '気になるあの人、たぶんここにいます。',
  // @copy CRO-heading-home-hero-08 Lv3
  '出会いは運。でも、母数なら増やせます。',
  // @copy CRO-heading-home-hero-09 Lv3
  'どうせ、もう気になってるんでしょう。',
  // @copy CRO-heading-home-hero-10 Lv2
  '今日の一周目で、見つかるかもです。',
] as const

// 解説: JST_OFFSET_MS を足すことで UTC+9 のカレンダー日付を基準にして全ユーザー共通の見出しを決める
// JST (+9h) 基準で UTC 日付インデックスを計算（全ユーザー共通の今日の見出し）
const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const heroLine = HERO_LINES[Math.floor((Date.now() + JST_OFFSET_MS) / 86400000) % HERO_LINES.length]

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { setHeaderRight } = useOutletContext<RootOutletCtx>()

  usePageTitle('ホーム')

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<Profile>('/api/profile/me').then(r => r.data),
    staleTime: 30 * 1000,
  })

  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get<{ user_id: string }[]>('/api/matches/').then(r => r.data),
    staleTime: 15 * 1000,
  })

  const { data: announcementCount } = useQuery({
    queryKey: ['announcement-unread-count'],
    queryFn: () => api.get<{ unread_count: number }>('/api/announcements/unread-count').then(r => r.data),
    retry: false,
    staleTime: 60 * 1000,
  })

  const { data: recommended = [] } = useQuery({
    queryKey: ['recommended'],
    queryFn: () => api.get<RecommendedUser[]>('/api/profiles/recommended').then(r => r.data),
    retry: false,
    staleTime: 60 * 1000,
  })

  const { data: quota } = useQuery({
    queryKey: ['likes-quota'],
    queryFn: () => api.get<{
      is_target: boolean
      opens_at: string | null
      used_count: number
      max_count: number
      is_open: boolean
      is_full: boolean
    }>('/api/likes/quota').then(r => r.data),
    retry: false,
    staleTime: 60 * 1000,
  })

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

  const { data: pendingLikes } = useQuery({
    queryKey: ['likes-pending-count'],
    queryFn: () => api.get<{ count: number }>('/api/likes/pending-count').then(r => r.data),
    retry: false,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })

  const handleLogout = async () => {
    try {
      clearSensitiveStorage()
      await clearAllDB()
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[HomePage] signOut error:', e)
    }
  }

  const logoutBtn = (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="text-ink text-xs h-8 px-3 font-bold"
    >
      ログアウト
    </Button>
  )

  useEffect(() => {
    setHeaderRight(logoutBtn)
    return () => setHeaderRight(null)
  }, [setHeaderRight])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 156px)' }}>
        {/* @copy CRO-label-home-loading-01 Lv1 */}
        <p className="font-mono text-ink/60 text-sm">おすすめを探しています。少しお待ちください。</p>
      </div>
    )
  }

  if (profile && (!profile.gender || !profile.onboarding_completed)) {
    if (profile.profile_setup_completed) {
      return <Navigate to="/setup/optional" replace />
    }
    return <Navigate to="/setup/required" replace />
  }

  const avatarUrl = profile?.avatar_url ?? null

  const unfilledItems = profile
    ? COMPLETION_ITEMS.filter((item) => {
        if (item.key === 'club') {
          return !profile.club && (!profile.clubs || profile.clubs.length === 0)
        }
        return !isFieldFilled(profile, item.key)
      })
    : []
  const completedCount = COMPLETION_ITEMS.length - unfilledItems.length
  const completionPct = profile
    ? Math.round((completedCount / COMPLETION_ITEMS.length) * 100)
    : 0

  return (
    <>
      <PWAInstallBanner />

      {/* 学生証提出バナー */}
      {profile && !profile.student_id_submitted && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-warning border-b-2 border-ink">
          {/* @copy CRO-banner-home-student-id-01 Lv0 */}
          <p className="text-xs font-bold text-ink">チャットをするには、学生証の提出が必要です。</p>
          <button
            type="button"
            onClick={() => navigate('/upload-student-id')}
            className="text-xs font-bold px-3 py-1.5 bg-ink text-white shrink-0"
          >
            {/* @copy CRO-button-home-01 Lv0 */}
            提出する →
          </button>
        </div>
      )}

      {/* ヒーローセクション */}
      <section
        className="relative overflow-hidden min-h-[60vw] max-h-[380px] md:min-h-0 md:max-h-none"
        style={{ background: '#0A0A0A' }}
      >
        <div className="px-5 pt-8 pb-6 flex flex-col h-full">
          {/* ロゴ */}
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" animate="visible"
          >
            <span
              className="font-display text-7xl block"
              style={{ color: 'var(--color-brand)', fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.9 }}
            >
              Cro-co.
            </span>
          </motion.div>

          {/* @copy CRO-heading-home-hero-01〜10 Lv2/Lv3 — 日替わりローテ（JST日付ベース・全員共通） */}
          <motion.p
            custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="text-white font-bold text-lg mt-3 leading-snug"
          >
            {heroLine}
          </motion.p>

          {/* アバター + プロフィール完成度 */}
          <motion.div
            custom={2} variants={fadeUp} initial="hidden" animate="visible"
            className="mt-5 flex items-end gap-4"
          >
            {isLoading ? (
              <Skeleton className="w-20 h-20 rounded-full" style={{ borderRadius: '50%' }} />
            ) : (
              <div
                className="w-20 h-20 rounded-full overflow-hidden shrink-0"
                style={{ border: '3px solid var(--color-brand)' }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="アバター" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-24 rounded mb-2 bg-gray-700" />
                  <Skeleton className="h-3 w-full rounded bg-gray-700" />
                </>
              ) : (
                <>
                  <p className="text-white font-bold truncate text-base">{profile?.name ?? '（名前未設定）'}</p>
                  <p className="text-gray-400 text-xs truncate">{profile?.email ?? user?.email}</p>
                  {profile && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono text-gray-400">PROFILE</span>
                        <span
                          className="text-[13px] font-mono font-bold"
                          style={{ color: 'var(--color-brand)' }}
                        >
                          {completionPct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#333' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${completionPct}%`, background: 'var(--color-brand)' }}
                        />
                      </div>
                      {completionPct < 100 && unfilledItems.length > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1 truncate">
                          未入力: {unfilledItems.map(i => i.label).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* CTA ボタン */}
          <motion.div
            custom={3} variants={fadeUp} initial="hidden" animate="visible"
            className="mt-5"
          >
            <Button asChild variant="brand" className="w-full h-12 text-base rounded-xl">
              {/* @copy CRO-button-home-02 Lv1 */}
              <Link to="/browse">みんなを見る →</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* お知らせ導線 */}
      <motion.section
        custom={3.5} variants={fadeUp} initial="hidden" animate="visible"
        className="px-4 pt-4 pb-2"
        style={{ background: '#FFFFFF' }}
      >
        <button
          type="button"
          onClick={() => navigate('/notifications?tab=announcements')}
          className="w-full card-bold p-4 flex items-center gap-3 text-left bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-brand/10 border-2 border-ink flex items-center justify-center">
              <Bell className="w-5 h-5 text-ink" />
            </div>
            {(announcementCount?.unread_count ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-hot border border-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {/* @copy CRO-label-home-announcement-01 Lv1 */}
            <p className="font-bold text-sm text-ink">運営からのお知らせ</p>
            <p className="text-xs text-ink/60">
              {(announcementCount?.unread_count ?? 0) > 0
                ? `${announcementCount!.unread_count}件の未読があります`
                : '最新のお知らせを確認できます'}
            </p>
          </div>
          <span className="text-ink font-bold text-lg">→</span>
        </button>
      </motion.section>

      {/* 統計セクション */}
      <motion.section
        custom={4} variants={fadeUp} initial="hidden" animate="visible"
        className="px-4 py-5"
        style={{ background: '#FFFFFF' }}
      >
        <h2 className="font-mono font-bold text-xs text-ink/60 mb-3 tracking-widest">STATS</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* @copy CRO-label-home-stats-01〜02 Lv1 */}
          {[
            { label: '未処理のいいね', value: pendingLikes?.count ?? 0, Icon: Mail },
            { label: 'マッチ数', value: matches.length, Icon: Heart },
          ].map(({ label, value, Icon }) => (
            <div
              key={label}
              className="card-bold bg-white p-4"
            >
              <div className="mb-1">
                <Icon className="w-6 h-6 text-hot" />
              </div>
              <div
                className="font-mono font-bold leading-none mb-1"
                style={{ fontSize: '2.5rem', color: '#0A0A0A' }}
              >
                {isLoading ? '–' : value}
              </div>
              <div className="text-xs text-ink/60 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 受信枠カード（女性向け・LIKE_QUOTA_ENABLED=true 時のみ表示） */}
      {quota?.is_target && (
        <motion.section
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mx-4 mb-4 card-bold p-4"
          style={{ background: 'var(--color-brand)' }}
        >
          <div className="flex items-center justify-between mb-2">
            {/* @copy CRO-heading-home-quota-01 Lv1 */}
            <h3 className="font-bold text-ink text-sm">本日の受信枠</h3>
            <span className="font-mono text-xs font-bold text-ink">
              {quota.used_count} / {quota.max_count}
            </span>
          </div>

          {!quota.is_open ? (
            <p className="text-xs text-ink/70 leading-relaxed">
              {/* @copy CRO-label-home-quota-01 Lv1 */}
              まだ解放されていません。<br />
              8時〜18時のあいだのランダムな時刻に解放されます。
            </p>
          ) : (
            <>
              <div className="w-full bg-white border-2 border-ink rounded-full h-2.5 overflow-hidden mb-2">
                <div
                  className="bg-ink h-full transition-all duration-500"
                  style={{ width: `${(quota.used_count / quota.max_count) * 100}%` }}
                />
              </div>
              {/* @copy CRO-label-home-quota-02〜03 Lv1 — 保留: 「受け取れます」は禁止「〜できます」類似・オーナー確認待ち */}
              <p className="text-xs text-ink/70">
                {quota.is_full
                  ? '本日の受信上限に達しました。明日また新しい出会いが届きます。'
                  : `あと${quota.max_count - quota.used_count}人受け取れます。上限に達すると男性のタイムラインから一時的に非表示になります。`
                }
              </p>
            </>
          )}
        </motion.section>
      )}

      {/* アイテム管理セクション（男性のみ・在庫表示） */}
      {likeStock?.is_applicable && (
        <motion.section
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mx-4 mb-4"
        >
          <h2 className="font-mono font-bold text-xs text-ink/60 mb-2 tracking-widest">ITEMS</h2>
          <div className="card-bold bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-hot" />
                {/* @copy CRO-heading-home-stock-01 Lv1 */}
                <span className="font-bold text-ink text-sm">いいねストック</span>
              </div>
              <span className="font-mono text-2xl font-bold text-ink leading-none">
                {likeStock.quantity}
              </span>
            </div>
            {/* @copy CRO-label-home-stock-01 Lv1 */}
            <p className="text-xs text-ink/60">
              いいねを送ると1つ減ります。毎日ログインで +{likeStock.daily_grant} 補充されます。
            </p>
          </div>
        </motion.section>
      )}

      {/* いいね CTA */}
      {!isLoading && (pendingLikes?.count ?? 0) > 0 && (
        <motion.section
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mx-4 mb-4 rounded-2xl p-5"
          style={{ background: 'rgba(61,220,151,0.15)', border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          {/* @copy CRO-label-home-like-cta-01 Lv1 */}
          <p className="font-bold text-ink text-base mb-3 flex items-center gap-1.5">
            <Mail className="w-4 h-4 shrink-0" />
            {pendingLikes!.count}人からいいねが届いています。
          </p>
          <Button asChild variant="bold" className="w-full h-11 rounded-xl">
            {/* @copy CRO-button-home-03 Lv1 */}
            <Link to="/matches">マッチを見る →</Link>
          </Button>
        </motion.section>
      )}

      {/* おすすめセクション */}
      {recommended.some((r) => r.score > 0) && (
        <motion.section
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="px-4 pb-4"
        >
          {/* @copy CRO-heading-home-recommend-01 Lv1 */}
          <h2
            className="font-display text-2xl text-ink mb-3"
            style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
          >
            おすすめ
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {recommended.map((rec, i) => (
              <div key={rec.id} className="shrink-0 w-40">
                <ColorfulCard
                  index={i}
                  user={{
                    id: rec.id,
                    name: rec.name,
                    year: rec.year,
                    avatar_url: rec.avatar_url,
                    status_message: rec.status_message,
                  }}
                  scoreBadge={rec.score}
                />
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* クイックアクション */}
      <motion.section
        custom={6} variants={fadeUp} initial="hidden" animate="visible"
        className="px-4 pb-6 grid grid-cols-2 gap-3"
      >
        <Button
          variant="outline-bold"
          className="h-14 flex-col gap-1 rounded-2xl"
          onClick={() => profile && navigate(`/profile/${profile.id}`)}
          disabled={!profile}
        >
          <User className="w-4 h-4" />
          {/* @copy CRO-button-home-04 Lv1 */}
          <span className="text-xs font-bold">プロフィールを確認する →</span>
        </Button>
        <Button asChild variant="bold" className="h-14 flex-col gap-1 rounded-2xl">
          <Link to="/matches">
            <Heart className="w-4 h-4" />
            {/* @copy CRO-button-home-05 Lv1 */}
            <span className="text-xs font-bold">
              マッチ一覧{matches.length > 0 ? `（${matches.length}）` : ''}
            </span>
          </Link>
        </Button>
      </motion.section>

      {isError && (
        <div className="px-4">
          {/* @copy CRO-error-home-01 Lv1 */}
          <ErrorState message="プロフィールの取得に失敗しました" onRetry={refetch} />
        </div>
      )}
    </>
  )
}
