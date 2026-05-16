import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Heart, Mail, Pencil, Smartphone, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Layout from '@/components/Layout'
import ErrorState from '@/components/ErrorState'
import ColorfulCard from '@/components/ColorfulCard'
import { usePageTitle } from '@/hooks/usePageTitle'
import { usePWAInstall } from '@/hooks/usePWAInstall'
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
  liked_count: number
  interests: string[]
  club: string | null
  hometown: string | null
  looking_for: string | null
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
  { key: 'interests', label: '趣味・興味' },
  { key: 'club', label: 'サークル' },
  { key: 'hometown', label: '出身地' },
  { key: 'looking_for', label: '目的' },
  { key: 'profile_image_path', label: 'プロフィール写真' },
]

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

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { canInstall, install } = usePWAInstall()
  const [pwaDismissed, setPwaDismissed] = useState(
    () => localStorage.getItem('pwa-dismissed') === '1'
  )

  usePageTitle('ホーム')

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<Profile>('/api/profile/me').then(r => r.data),
  })

  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get<{ user_id: string }[]>('/api/matches/').then(r => r.data),
  })

  const { data: rankData } = useQuery({
    queryKey: ['completeness-rank'],
    queryFn: () =>
      api.get<{ score: number; rank: number; total: number; percentile: number }>('/api/profiles/completeness-rank').then(r => r.data),
    retry: false,
  })

  const { data: recommended = [] } = useQuery({
    queryKey: ['recommended'],
    queryFn: () => api.get<RecommendedUser[]>('/api/profiles/recommended').then(r => r.data),
    retry: false,
  })

  const avatarUrl = profile?.profile_image_path
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/${profile.profile_image_path}`
    : null

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('[HomePage] signOut error:', e)
    }
  }

  const unfilledItems = profile
    ? COMPLETION_ITEMS.filter((item) => !isFieldFilled(profile, item.key))
    : []
  const completedCount = COMPLETION_ITEMS.length - unfilledItems.length
  const completionPct = profile
    ? Math.round((completedCount / COMPLETION_ITEMS.length) * 100)
    : 0

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

  const handlePwaDismiss = () => {
    localStorage.setItem('pwa-dismissed', '1')
    setPwaDismissed(true)
  }

  return (
    <Layout headerRight={logoutBtn}>
      {/* PWA インストールバナー */}
      {canInstall && !pwaDismissed && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-ink text-white">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 shrink-0 text-acid" />
            <p className="text-xs font-bold truncate">ホーム画面に追加して、アプリとして使える。</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={install}
              className="text-xs font-bold px-3 py-1 rounded-lg border-2 border-acid text-acid hover:bg-acid hover:text-ink transition-colors"
            >
              追加する
            </button>
            <button
              type="button"
              onClick={handlePwaDismiss}
              className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ヒーローセクション */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: '60vw', maxHeight: 380, background: '#0A0A0A' }}
      >
        <div className="px-5 pt-8 pb-6 flex flex-col h-full">
          {/* ロゴ */}
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" animate="visible"
          >
            <span
              className="font-display text-7xl block"
              style={{ color: '#DFFF1F', fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.9 }}
            >
              Cro-co.
            </span>
          </motion.div>

          <motion.p
            custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="text-white font-bold text-lg mt-3 leading-snug"
          >
            キャンパスを越えて、<br />好きを見つけよう。
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
                style={{ border: '3px solid #DFFF1F' }}
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
                          style={{ color: '#DFFF1F' }}
                        >
                          {completionPct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#333' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${completionPct}%`, background: '#DFFF1F' }}
                        />
                      </div>
                      {completionPct < 100 && unfilledItems.length > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1 truncate">
                          未入力: {unfilledItems.map(i => i.label).join(', ')}
                        </p>
                      )}
                      {rankData && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          {rankData.score >= 9 ? (
                            <span className="font-mono text-[10px] font-bold bg-white text-ink px-2 py-0.5">
                              PERFECT
                            </span>
                          ) : (
                            <span
                              className="font-mono text-[10px] font-bold px-2 py-0.5"
                              style={{ background: '#DFFF1F', color: '#0A0A0A', border: '1.5px solid #0A0A0A' }}
                            >
                              上位 {rankData.percentile}%
                            </span>
                          )}
                          {rankData.score < 5 && (
                            <p className="text-[9px] text-gray-400">
                              充実させてランクアップ！
                            </p>
                          )}
                        </div>
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
            <Button asChild variant="acid" className="w-full h-12 text-base rounded-xl">
              <Link to="/browse">みんなを見る →</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 統計セクション */}
      <motion.section
        custom={4} variants={fadeUp} initial="hidden" animate="visible"
        className="px-4 py-5"
        style={{ background: '#FFFFFF' }}
      >
        <h2 className="font-mono font-bold text-xs text-gray-500 mb-3 tracking-widest">STATS</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'あなたへのいいね', value: profile?.liked_count ?? 0, Icon: Mail },
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
              <div className="text-xs text-gray-500 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* いいね CTA */}
      {!isLoading && profile && (profile.liked_count ?? 0) > 0 && (
        <motion.section
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mx-4 mb-4 rounded-2xl p-5"
          style={{ background: '#A8F0D1', border: '2px solid #0A0A0A', boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          <p className="font-bold text-ink text-base mb-3 flex items-center gap-1.5">
            <Mail className="w-4 h-4 shrink-0" />
            {profile.liked_count}人があなたにいいねしています
          </p>
          <Button asChild variant="bold" className="w-full h-11 rounded-xl">
            <Link to="/matches">マッチを見る →</Link>
          </Button>
        </motion.section>
      )}

      {/* おすすめセクション */}
      {recommended.length > 0 && (
        <motion.section
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="px-4 pb-4"
        >
          <h2
            className="font-display text-2xl text-ink mb-3"
            style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
          >
            おすすめ
          </h2>
          {recommended.every((r) => r.score === 0) ? (
            <p className="font-mono text-xs text-gray-500">
              プロフィールに趣味を追加するとおすすめが表示されます
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {recommended.map((rec, i) => (
                <div key={rec.id} className="shrink-0 w-40">
                  <ColorfulCard
                    index={i}
                    user={{
                      id: rec.id,
                      name: rec.name,
                      year: rec.year,
                      faculty: rec.faculty,
                      bio: rec.bio,
                      avatar_url: rec.avatar_url,
                      status_message: rec.status_message,
                    }}
                    scoreBadge={rec.score}
                  />
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* クイックアクション */}
      <motion.section
        custom={6} variants={fadeUp} initial="hidden" animate="visible"
        className="px-4 pb-6 grid grid-cols-2 gap-3"
      >
        <Button asChild variant="outline-bold" className="h-14 flex-col gap-1 rounded-2xl">
          <Link to="/profile/edit">
            <Pencil className="w-4 h-4" />
            <span className="text-xs font-bold">プロフィール編集</span>
          </Link>
        </Button>
        <Button asChild variant="bold" className="h-14 flex-col gap-1 rounded-2xl">
          <Link to="/matches">
            <Heart className="w-4 h-4" />
            <span className="text-xs font-bold">
              マッチ一覧{matches.length > 0 ? `（${matches.length}）` : ''}
            </span>
          </Link>
        </Button>
      </motion.section>

      <div className="text-center pb-4">
        <Link
          to="/debug"
          className="text-xs text-gray-400 underline underline-offset-4"
        >
          デバッグ
        </Link>
      </div>

      {isError && (
        <div className="px-4">
          <ErrorState message="プロフィールの取得に失敗しました" onRetry={refetch} />
        </div>
      )}
    </Layout>
  )
}
