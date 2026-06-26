// 解説: このファイルは全ページ共通のレイアウトコンポーネントを定義する。
// 解説: 含まれる要素: PWAUpdateBanner / sticky ヘッダー / MarqueeBar / 審査状態バナー / main コンテンツ / ボトムナビ
// 解説: 呼ばれる場所: App.tsx の各 ProtectedRoute で <Layout> を wrap している
// 解説: 未読バッジ数は useUnreadCount（TanStack Query・refetchInterval 30s）でナビと全ページが同一キャッシュを共有する
import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Home, Search, Heart, Bell, Settings, Clock, AlertCircle, type LucideIcon } from 'lucide-react'
import api from '@/lib/api'
import MarqueeBar from '@/components/MarqueeBar'
import PWAUpdateBanner from '@/components/PWAUpdateBanner'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { useRealtimeSignals } from '@/hooks/useRealtimeSignals'

interface LayoutProps {
  children: React.ReactNode
  headerRight?: React.ReactNode
}

// 解説: NavItem = ボトムナビの各タブ定義（label・アイコン・遷移先・アクティブ判定パターン・バッジ種別）
interface NavItem {
  label: string
  Icon: LucideIcon
  href: string
  patterns: string[]
  badge: 'matches' | 'messages' | 'notifications' | null
}

const NAV_ITEMS: NavItem[] = [
  // @copy CRO-label-layout-01 Lv1
  { label: 'ホーム', Icon: Home, href: '/home', patterns: ['/home'], badge: null },
  // @copy CRO-label-layout-02 Lv1
  { label: 'さがす', Icon: Search, href: '/browse', patterns: ['/browse', '/profile/'], badge: null },
  // @copy CRO-label-layout-03 Lv1
  { label: 'マッチ', Icon: Heart, href: '/matches', patterns: ['/matches', '/chat/'], badge: 'matches' },
  // @copy CRO-label-layout-04 Lv1
  { label: '通知', Icon: Bell, href: '/notifications', patterns: ['/notifications', '/footprints', '/likes/'], badge: 'notifications' },
  // @copy CRO-label-layout-05 Lv1
  { label: '設定', Icon: Settings, href: '/settings', patterns: ['/settings'], badge: null },
]

export default function Layout({ children, headerRight }: LayoutProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const isSetupPage = pathname.startsWith('/setup/')
  useRealtimeSignals(user?.id)
  const { data: raw } = useUnreadCount(!!user, { refetchInterval: 30_000 })
  const counts = {
    matches: raw?.unread_matches ?? 0,
    messages: raw?.unread_messages ?? 0,
    views: raw?.unread_views ?? 0,
    likes_received: raw?.unread_likes_received ?? 0,
  }

  const { data: announcementRaw } = useQuery({
    queryKey: ['announcement-unread-count'],
    queryFn: () =>
      api.get<{ unread_count: number }>('/api/announcements/unread-count')
        .then((r) => r.data)
        .catch(() => ({ unread_count: 0 })),
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 30_000,
  })
  const announcementUnread = announcementRaw?.unread_count ?? 0

  // 前回の未読メッセージ数を保持してデスクトップ通知の重複表示を防ぐ
  const prevMsgCountRef = useRef<number>(0)
  useEffect(() => {
    const unread_messages = raw?.unread_messages ?? 0
    if (
      unread_messages > prevMsgCountRef.current &&
      !document.hasFocus() &&
      localStorage.getItem('notification-enabled') === 'true' &&
      Notification.permission === 'granted'
    ) {
      // @copy CRO-push-layout-01 Lv1
      new Notification('Cro-co', { body: '新しいメッセージが届いています' })
    }
    prevMsgCountRef.current = unread_messages
  }, [raw?.unread_messages])

  useEffect(() => {
    if (!user) return

    // 解説: prefetchQuery = ページ表示前にバックグラウンドで API データを取得して遷移を高速化する
    // 主要データを先読みしてページ遷移を高速化
    queryClient.prefetchQuery({
      queryKey: ['profile-me'],
      queryFn: () => api.get('/api/profile/me').then((r) => r.data),
      staleTime: 30 * 1000,
    })
    queryClient.prefetchQuery({
      queryKey: ['matches'],
      queryFn: () => api.get('/api/matches/').then((r) => r.data),
      staleTime: 15 * 1000,
    })

    // 解説: ping = 5分ごとに /api/profile/ping を叩き「最終アクセス日時」を更新する（オンライン状態の把握）
    const ping = () => { api.post('/api/profile/ping').catch(() => {}) }
    ping()
    const id = setInterval(ping, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [user?.id])


  // 解説: isActive = 現在の pathname がパターン配列のいずれかにマッチするときアクティブ判定する
  const isActive = (patterns: readonly string[]) =>
    patterns.some((p) => pathname === p || pathname.startsWith(p))

  // 解説: formatBadge = 100件以上のバッジは '99+' に省略して表示崩れを防ぐ
  const formatBadge = (n: number) => (n > 99 ? '99+' : String(n))

  return (
    <div className="min-h-dvh" style={{ backgroundColor: '#FFFFFF' }}>
      <PWAUpdateBanner />
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-display text-2xl text-ink" style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900, letterSpacing: '-0.02em' }}>
            Cro-co.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/notifications?tab=announcements')}
              aria-label="お知らせ"
              className="relative w-8 h-8 flex items-center justify-center"
            >
              <Bell className="w-5 h-5 text-ink" />
              {announcementUnread > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-hot border border-white" />
              )}
            </button>
            {headerRight}
          </div>
        </div>
      </header>

      {/* マーキーバー */}
      <div className="sticky top-14 z-30 bg-ink">
        <MarqueeBar />
      </div>

      {/* 審査状態バナー */}
      {!isSetupPage && profile?.status === 'pending_review' && (
        <div
          className="max-w-[480px] mx-auto px-4 py-2.5 flex items-center gap-2"
          style={{ background: 'var(--color-warning)', borderBottom: '2px solid #0A0A0A' }}
        >
          <Clock className="w-4 h-4 shrink-0 text-ink" />
          {/* @copy CRO-banner-layout-01 Lv0 */}
          <p className="text-xs font-bold text-ink flex-1">
            現在審査中です。順番に確認していますので、もうしばらくお待ちください。
          </p>
        </div>
      )}
      {!isSetupPage && profile?.status === 'rejected' && (
        <div
          className="max-w-[480px] mx-auto px-4 py-2.5 flex items-center gap-2"
          style={{ background: 'var(--color-danger)', borderBottom: '2px solid #0A0A0A' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          {/* @copy CRO-banner-layout-02 Lv0 */}
          <p className="text-xs font-bold text-white flex-1">審査の結果、承認されませんでした。</p>
          <button
            type="button"
            onClick={() => navigate('/setup/required?mode=reapply')}
            className="text-xs font-bold px-3 py-1 border-2 border-white text-white shrink-0"
            style={{ borderRadius: 6 }}
          >
            {/* @copy CRO-button-layout-01 Lv0 */}
            再申請する
          </button>
        </div>
      )}

      <main className="max-w-[480px] mx-auto pb-nav">
        {children}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-ink border-t-2 border-ink" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-[480px] mx-auto grid grid-cols-5 h-16">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.patterns)
            const badgeCount = item.badge === 'matches'
              ? counts.matches + counts.messages
              : item.badge === 'notifications'
                ? counts.views + counts.likes_received + announcementUnread
                : 0
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'bg-brand text-ink'
                    : 'text-white hover:text-gray-200'
                }`}
              >
                <div className="relative">
                  <div className={`w-7 h-7 flex items-center justify-center ${active ? 'bg-ink rounded-full' : ''}`}>
                    <item.Icon className={`w-4 h-4 ${active ? 'text-brand' : 'text-white'}`} />
                  </div>
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-hot text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {formatBadge(badgeCount)}
                    </span>
                  )}
                </div>
                <span className={`text-[13px] font-bold ${active ? 'text-ink' : 'text-white'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
