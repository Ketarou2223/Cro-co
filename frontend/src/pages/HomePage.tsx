// 解説: このファイルはログイン済みユーザーのホームページを定義する。
// 解説: 機能: アバター + プロフィール完成度バー / STATS / おすすめカード / いいね CTA / クイックアクション
// 解説: heroLine = JST 日付ベースで HERO_LINES を毎日ローテーション（全ユーザー共通・固定）
// 解説: profileScore = likeStock.score（バックエンド計算の充実度 0-100）を表示
// 解説: quota = いいね受信枠（女性向け・LIKE_QUOTA_ENABLED フラグ ON 時のみ表示）
// 解説: likeStock = いいね在庫数（男性向け・LIKE_STOCK_ENABLED フラグ ON 時のみ表示）
import { useEffect } from 'react'
import { sendRegime, MALE_BONUS_THRESHOLD, SAME_SEX_UNLOCK } from '@/lib/completeness'
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { AlertCircle, Heart, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { RootOutletCtx } from '@/components/RootLayout'
import ErrorState from '@/components/ErrorState'
import ColorfulCard from '@/components/ColorfulCard'
import PWAInstallBanner from '@/components/PWAInstallBanner'
import DailyQuestionCard from '@/components/DailyQuestionCard'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import api from '@/lib/api'

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
  blurred?: boolean
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
  '今日で、見つかるかもです。',
] as const

// 解説: JST_OFFSET_MS を足すことで UTC+9 のカレンダー日付を基準にして全ユーザー共通の見出しを決める
// JST (+9h) 基準で UTC 日付インデックスを計算（全ユーザー共通の今日の見出し）
const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const heroLine = HERO_LINES[Math.floor((Date.now() + JST_OFFSET_MS) / 86400000) % HERO_LINES.length]

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setHeaderRight } = useOutletContext<RootOutletCtx>()

  usePageTitle('ホーム')

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<Profile>('/api/profile/me').then(r => r.data),
    staleTime: 30 * 1000,
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
    queryKey: ['like-stock'],
    queryFn: () => api.get<{
      is_applicable: boolean
      is_unlimited: boolean
      regime: string
      score: number
      quantity: number | null
      recovery_per_day: number
      initial: number
      cap: number
    }>('/api/likes/stock').then(r => r.data),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // 未読新着いいね数（receiver_read_at IS NULL の件数）- unread-count API を再利用
  const { data: unreadCounts } = useUnreadCount(profile?.status === 'approved', { refetchInterval: 30_000 })
  const unreadLikesCount = unreadCounts?.unread_likes_received ?? 0

  useEffect(() => {
    setHeaderRight(null)
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

  // 充実度スコア: バックエンド計算値（likeStock.score）を利用
  const profileScore = likeStock?.score ?? null
  // 無制限判定: female_unlimited は常時・same_sex は SAME_SEX_UNLOCK 以上で解放
  const stockUnlimited = likeStock != null && (
    likeStock.regime === 'female_unlimited' ||
    (likeStock.regime === 'same_sex' && (likeStock.score ?? 0) >= SAME_SEX_UNLOCK)
  )
  const profileRegime = profile ? sendRegime(profile.gender, profile.interest_in) : 'female_unlimited'
  let profileRegimeComment = ''
  if (profileScore !== null) {
    if (profileRegime === 'male_hetero') {
      if (profileScore < MALE_BONUS_THRESHOLD) {
        const rem = (MALE_BONUS_THRESHOLD - profileScore).toFixed(1).replace(/\.0$/, '')
        profileRegimeComment = `あと${rem}%でいいね回復が解放されます。`
      } else {
        profileRegimeComment = 'いいね回復が解放されています。'
      }
    } else if (profileRegime === 'same_sex') {
      if (profileScore < SAME_SEX_UNLOCK) {
        const rem = (SAME_SEX_UNLOCK - profileScore).toFixed(1).replace(/\.0$/, '')
        profileRegimeComment = `あと${rem}%でいいねが送り放題になります。`
      } else {
        profileRegimeComment = 'いいねが送り放題です。'
      }
    } else {
      if (profileScore < MALE_BONUS_THRESHOLD) {
        const rem = (MALE_BONUS_THRESHOLD - profileScore).toFixed(1).replace(/\.0$/, '')
        profileRegimeComment = `あと${rem}%でいいねをくれた相手が見られます。`
      } else {
        profileRegimeComment = 'いいねをくれた相手が見られます。'
      }
    }
  }

  return (
    <>
      {/* PWAバナー: 下のhero黒ブロックと一体化するためbg-inkで囲む（白い隙間を消す） */}
      <div style={{ background: '#0A0A0A' }}>
        <PWAInstallBanner wrapperClassName="mx-4" />
      </div>

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
                          {profileScore !== null ? `${profileScore.toFixed(1).replace(/\.0$/, '')}%` : '–'}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#333' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${profileScore ?? 0}%`, background: 'var(--color-brand)' }}
                        />
                      </div>
                      {profileRegimeComment && (
                        <p className="text-[10px] text-gray-500 mt-1 truncate">{profileRegimeComment}</p>
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

      <DailyQuestionCard />

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

      {/* 男性向け告知（充実度 < 100 のとき表示） */}
      {likeStock?.regime === 'male_hetero' && (likeStock?.score ?? 100) < 100 && (
        <motion.div
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mx-4 mb-3 p-3 rounded-[18px] flex items-start gap-2"
          style={{ border: '2px solid var(--color-ink)', background: 'var(--color-paper)' }}
        >
          <AlertCircle className="w-4 h-4 text-ink/60 shrink-0 mt-0.5" />
          {/* @copy CRO-label-home-male-notice-01 Lv1 */}
          <p className="text-xs font-bold text-ink leading-snug">
            プロフィールを埋めると、送れるいいねが増えます。80%でログイン回復、100%で回復が2倍に。
          </p>
        </motion.div>
      )}

      {/* 同性向け告知（送り放題未解放のとき表示） */}
      {likeStock?.regime === 'same_sex' && !likeStock.is_unlimited && (
        <motion.div
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mx-4 mb-3 p-3 rounded-[18px] flex items-start gap-2"
          style={{ border: '2px solid var(--color-ink)', background: 'var(--color-paper)' }}
        >
          <AlertCircle className="w-4 h-4 text-ink/60 shrink-0 mt-0.5" />
          {/* @copy CRO-label-home-samesex-notice-01 Lv1 */}
          <p className="text-xs font-bold text-ink leading-snug">
            プロフィールを70%まで埋めると、いいねが送り放題になります。
          </p>
        </motion.div>
      )}

      {/* アイテム管理セクション（在庫制ユーザーのみ・is_applicable=true） */}
      {likeStock != null && (
        <motion.section
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mx-4 mb-4"
        >
          <h2 className="font-mono font-bold text-xs text-ink/60 mb-2 tracking-widest">ITEMS</h2>
          <div className="card-bold bg-white p-4 flex items-center gap-4">
            {/* pill badge: heart + 数 or ∞ */}
            <div
              className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-full border-2 border-ink"
              style={{
                background: stockUnlimited ? 'var(--color-brand)' : 'var(--color-bone)',
                boxShadow: '3px 3px 0 0 #0A0A0A',
              }}
            >
              <Heart
                className="w-5 h-5"
                style={{ color: 'var(--color-like)', fill: 'var(--color-like)' }}
              />
              <span className="font-mono text-3xl font-bold text-ink leading-none">
                {/* @copy CRO-heading-home-stock-01 Lv1 */}
                {stockUnlimited ? '∞' : likeStock.quantity}
              </span>
            </div>
            {/* text */}
            <div className="flex-1 min-w-0">
              <span className="font-bold text-ink text-sm block mb-1">いいねストック</span>
              {/* @copy CRO-label-home-stock-01 Lv1 */}
              <p className="text-xs text-ink/60 leading-snug">
                {stockUnlimited
                  ? 'いいねは送り放題です。'
                  : likeStock.regime === 'male_hetero'
                  ? `毎日ログインで +${likeStock.recovery_per_day} 補充されます。`
                  : `充実度${SAME_SEX_UNLOCK}%で送り放題になります。`
                }
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {/* いいね CTA */}
      {!isLoading && unreadLikesCount > 0 && (
        <motion.section
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mx-4 mb-4 rounded-2xl p-5"
          style={{ background: 'rgba(61,220,151,0.15)', border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          {/* @copy CRO-label-home-like-cta-01 Lv1 */}
          <p className="font-bold text-ink text-base mb-3 flex items-center gap-1.5">
            <Heart className="w-4 h-4 shrink-0 text-hot" />
            {unreadLikesCount}件の新着いいねが届いています。
          </p>
          <Button asChild variant="bold" className="w-full h-11 rounded-xl">
            {/* @copy CRO-button-home-03 Lv1 */}
            <Link to="/notifications">確認する →</Link>
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
            {profile?.gender === 'female' && (likeStock?.score ?? 100) < 80 && (
              <div
                className="shrink-0 w-full mb-1 p-3 rounded-[18px] flex items-start gap-2"
                style={{ border: '2px solid var(--color-danger)', background: 'var(--color-paper)' }}
              >
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                {/* @copy CRO-label-home-blur-notice-01 Lv1 */}
                <p className="text-xs font-bold text-ink leading-snug">
                  プロフィールを80%まで埋めると、いいねをくれた人の写真を見ることができます。
                </p>
              </div>
            )}
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
                    blurred: rec.blurred,
                  }}
                  scoreBadge={rec.score}
                />
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {isError && (
        <div className="px-4">
          {/* @copy CRO-error-home-01 Lv1 */}
          <ErrorState message="プロフィールの取得に失敗しました" onRetry={refetch} />
        </div>
      )}
    </>
  )
}
