import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye, Heart, Lock, MessageCircle } from 'lucide-react'
import Layout from '@/components/Layout'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useProfile } from '@/hooks/useProfile'
import api from '@/lib/api'

interface UnreadCounts {
  unread_messages: number
  unread_matches: number
  unread_views: number
  unread_likes_received: number
}

export default function NotificationsPage() {
  usePageTitle('通知')
  const navigate = useNavigate()
  const { profile } = useProfile()

  const isApproved = profile?.status === 'approved'

  const { data: counts } = useQuery({
    queryKey: ['unread-count-notif'],
    queryFn: () => api.get<UnreadCounts>('/api/matches/unread-count').then(r => r.data),
    refetchInterval: 30 * 1000,
    enabled: isApproved,
  })

  if (profile && profile.status !== 'approved') {
    return (
      <Layout>
        <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/30 flex items-center justify-center p-6">
          <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-sm w-full shadow-[8px_8px_0_0_#000]">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-yellow-300 border-4 border-black rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-3">
              {profile.status === 'rejected'
                ? '学生証の再提出が必要です'
                : '通知は認証完了後に利用できます'}
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              {profile.status === 'rejected'
                ? '再申請して承認されると、通知機能が使えるようになります。'
                : '学生証の審査が完了すると、通知機能が使えるようになります。'}
            </p>
            {profile.status === 'rejected' ? (
              <button
                type="button"
                onClick={() => navigate('/setup/required?mode=reapply')}
                className="w-full bg-black text-white font-bold py-3 rounded-xl border-2 border-black"
              >
                再申請する →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full bg-yellow-300 text-black font-bold py-3 rounded-xl border-2 border-black"
              >
                ホームに戻る
              </button>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  const sections = [
    {
      key: 'footprints',
      label: 'あなたを見た人',
      sublabel: 'プロフィールを閲覧した人',
      href: '/footprints',
      Icon: Eye,
      count: counts?.unread_views ?? 0,
      bg: '#8AE8B5',
    },
    {
      key: 'likes',
      label: 'あなたへのいいね',
      sublabel: 'いいねを返してマッチしよう',
      href: '/likes/received',
      Icon: Heart,
      count: counts?.unread_likes_received ?? 0,
      bg: '#FF7DA8',
    },
    {
      key: 'matches',
      label: '新しいマッチ',
      sublabel: 'マッチした相手とチャット',
      href: '/matches',
      Icon: MessageCircle,
      count: counts?.unread_matches ?? 0,
      bg: '#6BB5FF',
    },
  ]

  return (
    <Layout>
      <div className="px-4 pt-5 pb-6 space-y-4">
        <h1
          className="font-display text-3xl text-ink"
          style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
        >
          通知
        </h1>

        <div className="space-y-3">
          {sections.map(({ key, label, sublabel, href, Icon, count, bg }) => (
            <button
              key={key}
              type="button"
              className="w-full card-bold p-4 flex items-center gap-4 text-left hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] transition-all"
              style={{ backgroundColor: bg }}
              onClick={() => navigate(href)}
            >
              <div className="w-12 h-12 rounded-full bg-white border-2 border-ink flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-ink" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-base leading-snug">{label}</p>
                <p className="text-xs text-muted mt-0.5">{sublabel}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {count > 0 && (
                  <span className="min-w-[24px] h-6 bg-hot text-white font-mono font-bold text-xs rounded-full flex items-center justify-center px-1.5 leading-none border-2 border-ink">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
                <span className="text-ink font-bold text-lg leading-none">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  )
}
