import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Lock, User } from 'lucide-react'
import Layout from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useProfile } from '@/hooks/useProfile'
import api from '@/lib/api'

interface NotificationItem {
  id: string
  type: 'match' | 'like' | 'view' | 'message'
  from_user_id: string | null
  from_user_name: string | null
  from_user_avatar: string | null
  match_id: string | null
  message_preview: string | null
  read_at: string | null
  created_at: string
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(date)
}

function getNotifMessage(n: NotificationItem): string {
  const name = n.from_user_name ?? 'だれか'
  switch (n.type) {
    case 'match': return `${name}さんとマッチした！`
    case 'like': return `${name}さんがいいねした`
    case 'view': return `${name}さんがプロフィールを見た`
    case 'message': return `${name}さんからメッセージ: ${n.message_preview ?? ''}`
    default: return '通知がある'
  }
}

function getNotifBg(type: NotificationItem['type']): string {
  switch (type) {
    case 'match': return 'bg-[color:var(--color-hot,#FF4D6D)]/10'
    case 'like': return 'bg-[color:var(--color-acid,#DFFF1F)]/30'
    case 'view': return 'bg-[#8AE8B5]/30'
    case 'message': return 'bg-white'
    default: return 'bg-white'
  }
}

export default function NotificationsPage() {
  usePageTitle('通知')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useProfile()

  const isApproved = profile?.status === 'approved'

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationItem[]>('/api/notifications/').then(r => r.data),
    refetchInterval: 30 * 1000,
    enabled: isApproved,
  })

  const handleReadAll = async () => {
    await api.post('/api/notifications/read-all')
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const handleClickNotif = async (n: NotificationItem) => {
    if (!n.read_at) {
      await api.post(`/api/notifications/${n.id}/read`).catch(() => {})
      await refetch()
    }
    if ((n.type === 'match' || n.type === 'message') && n.match_id) {
      navigate(`/chat/${n.match_id}`)
    } else if ((n.type === 'like' || n.type === 'view') && n.from_user_id) {
      navigate(`/profile/${n.from_user_id}`)
    }
  }

  const hasUnread = notifications.some(n => !n.read_at)

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

  return (
    <Layout>
      <div className="px-4 py-6 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink">通知</h1>
          {hasUnread && (
            <Button variant="outline-bold" size="sm" onClick={handleReadAll} className="text-xs h-8">
              全部既読にする
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="card-bold bg-white p-8 flex flex-col items-center gap-3">
            <Bell className="w-12 h-12 text-ink/20" />
            <p className="font-mono text-sm text-ink/50">まだ何もない。気にしてないふりしてる。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClickNotif(n)}
                className={`w-full text-left card-bold p-3 flex items-center gap-3 transition-colors hover:brightness-95 ${getNotifBg(n.type)} ${!n.read_at ? 'border-l-4 border-l-[color:var(--color-hot,#FF4D6D)]' : ''}`}
              >
                {/* アバター */}
                <div className="w-10 h-10 rounded-full border-2 border-ink overflow-hidden shrink-0 bg-muted">
                  {n.from_user_avatar ? (
                    <img
                      src={n.from_user_avatar}
                      alt={n.from_user_name ?? ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* テキスト */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink leading-snug text-left">
                    {getNotifMessage(n)}
                  </p>
                </div>

                {/* 時刻 */}
                <span className="font-mono text-xs text-ink/40 shrink-0">
                  {formatTime(n.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
