import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Search, Heart, Settings, type LucideIcon } from 'lucide-react'
import api from '@/lib/api'
import MarqueeBar from '@/components/MarqueeBar'
import { useAuth } from '@/contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
  headerRight?: React.ReactNode
}

interface NavItem {
  label: string
  Icon: LucideIcon
  href: string
  patterns: string[]
  badge: 'matches' | 'messages' | null
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ホーム', Icon: Home, href: '/home', patterns: ['/home'], badge: null },
  { label: 'さがす', Icon: Search, href: '/browse', patterns: ['/browse', '/profile/'], badge: null },
  { label: 'マッチ', Icon: Heart, href: '/matches', patterns: ['/matches', '/chat/'], badge: 'matches' },
  { label: '設定', Icon: Settings, href: '/settings', patterns: ['/settings'], badge: null },
]

interface UnreadCounts {
  matches: number
  messages: number
}

export default function Layout({ children, headerRight }: LayoutProps) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [counts, setCounts] = useState<UnreadCounts>({ matches: 0, messages: 0 })
  const prevMsgCountRef = useRef<number>(0)

  useEffect(() => {
    if (!user) return
    const ping = () => { api.post('/api/profile/ping').catch(() => {}) }
    ping()
    const id = setInterval(ping, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get<{ unread_messages: number; unread_matches: number }>(
          '/api/matches/unread-count'
        )
        const { unread_messages, unread_matches } = res.data

        if (
          unread_messages > prevMsgCountRef.current &&
          !document.hasFocus() &&
          localStorage.getItem('notification-enabled') === 'true' &&
          Notification.permission === 'granted'
        ) {
          new Notification('Cro-co', { body: '新しいメッセージが届いています' })
        }
        prevMsgCountRef.current = unread_messages

        setCounts(prev =>
          prev.matches === unread_matches && prev.messages === unread_messages
            ? prev
            : { matches: unread_matches, messages: unread_messages }
        )
      } catch {
        // approved でない場合など無視
      }
    }
    fetchUnreadCount()
    const id = setInterval(fetchUnreadCount, 30 * 1000)
    return () => clearInterval(id)
  }, [user?.id])

  const isActive = (patterns: readonly string[]) =>
    patterns.some((p) => pathname === p || pathname.startsWith(p))

  const formatBadge = (n: number) => (n > 99 ? '99+' : String(n))

  return (
    <div className="min-h-dvh" style={{ backgroundColor: '#FFFFFF' }}>
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

      <main className="max-w-[480px] mx-auto pb-20">
        {children}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-ink border-t-2 border-ink">
        <div className="max-w-[480px] mx-auto grid grid-cols-4 h-16">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.patterns)
            const badgeCount = item.badge ? counts[item.badge] : 0
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'bg-acid text-ink'
                    : 'text-white hover:text-gray-200'
                }`}
              >
                <div className="relative">
                  <div className={`w-7 h-7 flex items-center justify-center ${active ? 'bg-ink rounded-full' : ''}`}>
                    <item.Icon className={`w-4 h-4 ${active ? 'text-acid' : 'text-white'}`} />
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
