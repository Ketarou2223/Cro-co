import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
  headerRight?: React.ReactNode
}

const NAV_ITEMS = [
  { label: 'ホーム', emoji: '🏠', href: '/home', patterns: ['/home'] },
  { label: 'さがす', emoji: '🔍', href: '/browse', patterns: ['/browse', '/profile/'] },
  { label: 'マッチ', emoji: '💕', href: '/matches', patterns: ['/matches'] },
  { label: 'チャット', emoji: '💬', href: '/matches', patterns: ['/chat/'] },
  { label: '設定', emoji: '⚙️', href: '/home', patterns: [] },
] as const

export default function Layout({ children, headerRight }: LayoutProps) {
  const { pathname } = useLocation()

  const isActive = (patterns: readonly string[]) =>
    patterns.some((p) => pathname === p || pathname.startsWith(p))

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-xl font-bold text-primary tracking-tight">Cro-co</span>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      </header>

      <main className="max-w-[480px] mx-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-[480px] mx-auto grid grid-cols-5 h-14">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.patterns)
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-[18px] leading-none">{item.emoji}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
