// 解説: このファイルは「あなたを見た人（足跡）」ページを定義する。
// 解説: /api/profiles/views からプロフィール閲覧者一覧を取得して表示する
// 解説: confirmedRef = 自動既読 POST が二重に発火しないよう一度だけ呼ぶためのフラグ
// 解説: handleLike = 足跡経由でいいねを送る。マッチ成立なら MatchModal を表示する
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/usePageTitle'
import api from '@/lib/api'

interface ProfileViewItem {
  viewer_id: string
  name: string | null
  year: number | null
  faculty: string | null
  avatar_url: string | null
  viewed_at: string
  is_new: boolean
  is_liked: boolean
}

interface ProfileViewsResponse {
  views: ProfileViewItem[]
  unread_count: number
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(date)
}

export default function FootprintsPage() {
  usePageTitle('あなたを見た人')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['profile-views'],
    queryFn: () => api.get<ProfileViewsResponse>('/api/profiles/views').then(r => r.data),
    staleTime: 30 * 1000,
  })

  // 表示後に自動既読
  const confirmedRef = useRef(false)
  useEffect(() => {
    if (data !== undefined && !confirmedRef.current) {
      confirmedRef.current = true
      api.post('/api/profiles/views/confirm').catch(() => {})
      queryClient.setQueryData(['unread-count'], (o: any) => (o ? { ...o, unread_views: 0 } : o))
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['profile-views'] })
    }
  }, [data, queryClient])

  const handleConfirmAll = async () => {
    await api.post('/api/profiles/views/confirm').catch(() => {})
    queryClient.setQueryData(['unread-count'], (o: any) => (o ? { ...o, unread_views: 0 } : o))
    queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    queryClient.invalidateQueries({ queryKey: ['profile-views'] })
  }

  const views = data?.views ?? []
  const unreadCount = data?.unread_count ?? 0

  return (
    <>
      <div className="px-4 pt-5 pb-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="flex items-center gap-1 text-sm font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {/* @copy CRO-button-footprints-01 Lv1 */}
          通知に戻る
        </button>

        <div className="flex items-center justify-between">
          {/* @copy CRO-heading-footprints-01 Lv1 */}
          <h1
            className="font-display text-3xl text-ink"
            style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
          >
            あなたを見た人
          </h1>
          {unreadCount > 0 && (
            <Button variant="outline-bold" size="sm" className="text-xs h-8" onClick={handleConfirmAll}>
              {/* @copy CRO-button-footprints-02 Lv1 */}
              全員既読にする
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-bold bg-gray-100 h-16 animate-pulse" />
            ))}
          </div>
        ) : views.length === 0 ? (
          <div className="card-bold bg-white p-8 flex flex-col items-center gap-3">
            <Eye className="w-12 h-12 text-ink/20" />
            {/* @copy CRO-empty-footprints-01 Lv1 */}
            <p className="text-sm text-muted">まだ誰も見ていないようです。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {views.map((view) => (
              <button
                key={view.viewer_id}
                type="button"
                className="card-bold bg-white flex items-center gap-3 p-3 w-full text-left"
                onClick={() => navigate(`/profile/${view.viewer_id}?from=footprint`)}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full border-2 border-ink overflow-hidden">
                    {view.avatar_url ? (
                      <img
                        src={view.avatar_url}
                        alt={view.name ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <User className="w-5 h-5 text-ink/40" />
                      </div>
                    )}
                  </div>
                  {view.is_new && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{ background: 'var(--color-like)' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-ink truncate">
                    {view.name ?? '（未設定）'}
                  </p>
                  {view.faculty && (
                    <p className="text-xs text-ink/60 truncate">{view.faculty}</p>
                  )}
                  <p className="font-accent font-bold text-xs text-ink/40">{formatTime(view.viewed_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
