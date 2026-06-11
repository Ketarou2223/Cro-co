import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Home, Search, Heart, Bell, Settings, Clock, AlertCircle, type LucideIcon } from 'lucide-react'
import api from '@/lib/api'
import MarqueeBar from '@/components/MarqueeBar'
import PWAUpdateBanner from '@/components/PWAUpdateBanner'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { dbGet, dbSet } from '@/lib/db'
import type { UnreadCounts } from '@/lib/db'

interface LayoutProps {
  children: React.ReactNode
  headerRight?: React.ReactNode
}

interface NavItem {
  label: string
  Icon: LucideIcon
  href: string
  patterns: string[]
  badge: 'matches' | 'messages' | 'notifications' | null
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ホーム', Icon: Home, href: '/home', patterns: ['/home'], badge: null },
  { label: 'さがす', Icon: Search, href: '/browse', patterns: ['/browse', '/profile/'], badge: null },
  { label: 'マッチ', Icon: Heart, href: '/matches', patterns: ['/matches', '/chat/'], badge: 'matches' },
  { label: '通知', Icon: Bell, href: '/notifications', patterns: ['/notifications', '/footprints', '/likes/'], badge: 'notifications' },
  { label: '設定', Icon: Settings, href: '/settings', patterns: ['/settings'], badge: null },
]

export default function Layout({ children, headerRight }: LayoutProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const isSetupPage = pathname.startsWith('/setup/')
  const [counts, setCounts] = useState<UnreadCounts>({ matches: 0, messages: 0, views: 0, likes_received: 0 })
  const prevMsgCountRef = useRef<number>(0)

  useEffect(() => {
    if (!user) return

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

    const ping = () => { api.post('/api/profile/ping').catch(() => {}) }
    ping()
    const id = setInterval(ping, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [user?.id])

  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      // 1. キャッシュがあれば即時表示（TTL: 30秒）
      const cached = await dbGet('unread', 'count', 30 * 1000)
      if (cached) setCounts(cached)

      // 2. バックグラウンドで最新データを取得
      try {
        const res = await api.get<{ unread_messages: number; unread_matches: number; unread_views: number; unread_likes_received: number }>(
          '/api/matches/unread-count'
        )
        const { unread_messages, unread_matches, unread_views, unread_likes_received } = res.data

        if (
          unread_messages > prevMsgCountRef.current &&
          !document.hasFocus() &&
          localStorage.getItem('notification-enabled') === 'true' &&
          Notification.permission === 'granted'
        ) {
          new Notification('Cro-co', { body: '新しいメッセージが届いています' })
        }
        prevMsgCountRef.current = unread_messages

        const next: UnreadCounts = {
          matches: unread_matches,
          messages: unread_messages,
          views: unread_views ?? 0,
          likes_received: unread_likes_received ?? 0,
        }
        setCounts(prev =>
          prev.matches === next.matches && prev.messages === next.messages && prev.views === next.views && prev.likes_received === next.likes_received
            ? prev
            : next
        )
        await dbSet('unread', 'count', next)
      } catch {
        // approved でない場合など無視
      }
    }

    fetchUnreadCount()
    const id = setInterval(fetchUnreadCount, 30 * 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchUnreadCount()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id])

  const isActive = (patterns: readonly string[]) =>
    patterns.some((p) => pathname === p || pathname.startsWith(p))

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
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      </header>

      {/* マーキーバー */}
      <div className="sticky top-14 z-30">
        <MarqueeBar />
      </div>

      {/* 審査状態バナー */}
      {!isSetupPage && profile?.status === 'pending_review' && (
        <div
          className="max-w-[480px] mx-auto px-4 py-2.5 flex items-center gap-2"
          style={{ background: 'var(--color-warning)', borderBottom: '2px solid #0A0A0A' }}
        >
          <Clock className="w-4 h-4 shrink-0 text-ink" />
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
          <p className="text-xs font-bold text-white flex-1">審査の結果、承認されませんでした。</p>
          <button
            type="button"
            onClick={() => navigate('/setup/required?mode=reapply')}
            className="text-xs font-bold px-3 py-1 border-2 border-white text-white shrink-0"
            style={{ borderRadius: 6 }}
          >
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
                ? counts.views + counts.likes_received
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
                <span className={`text-[10px] font-bold ${active ? 'text-ink' : 'text-white'}`}>
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
