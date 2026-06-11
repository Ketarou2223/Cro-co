import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, User } from 'lucide-react'
import Layout from '@/components/Layout'
import MatchModal from '@/components/MatchModal'
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

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedUser, setMatchedUser] = useState<{ name: string | null; avatar_url: string | null } | null>(null)

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
      queryClient.invalidateQueries({ queryKey: ['profile-views'] })
    }
  }, [data, queryClient])

  const handleConfirmAll = async () => {
    await api.post('/api/profiles/views/confirm').catch(() => {})
    queryClient.invalidateQueries({ queryKey: ['profile-views'] })
  }

  const handleLike = async (view: ProfileViewItem) => {
    if (likedIds.has(view.viewer_id)) return
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes/', {
        liked_id: view.viewer_id,
        via_footprint: true,
      })
      setLikedIds(prev => new Set([...prev, view.viewer_id]))
      if (res.data.is_match) {
        setMatchedUser({ name: view.name, avatar_url: view.avatar_url })
        setShowMatchModal(true)
      }
    } catch {}
  }

  const views = data?.views ?? []
  const unreadCount = data?.unread_count ?? 0

  return (
    <Layout>
      {matchedUser && (
        <MatchModal
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          matchedUser={matchedUser}
        />
      )}

      <div className="px-4 pt-5 pb-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="flex items-center gap-1 font-mono text-sm font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          通知に戻る
        </button>

        <div className="flex items-center justify-between">
          <h1
            className="font-display text-3xl text-ink"
            style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
          >
            あなたを見た人
          </h1>
          {unreadCount > 0 && (
            <Button variant="outline-bold" size="sm" className="text-xs h-8" onClick={handleConfirmAll}>
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
            <p className="font-mono text-sm text-muted">まだ誰も見ていないようです。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {views.map((view) => {
              const isLiked = likedIds.has(view.viewer_id)
              return (
                <div
                  key={view.viewer_id}
                  className="card-bold bg-white flex items-center gap-3 p-3"
                >
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => navigate(`/profile/${view.viewer_id}?from=footprint`)}
                  >
                    <div className="w-11 h-11 rounded-full border-2 border-ink overflow-hidden shrink-0">
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
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-ink truncate">
                        {view.name ?? '（未設定）'}
                      </p>
                      {view.faculty && (
                        <p className="text-xs text-ink/60 truncate">{view.faculty}</p>
                      )}
                      <p className="font-mono text-xs text-ink/40">{formatTime(view.viewed_at)}</p>
                    </div>
                  </button>

                  {isLiked ? (
                    <div
                      className="w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center shrink-0 opacity-60"
                      style={{ background: 'var(--color-like)' }}
                    >
                      <span className="text-white text-sm font-bold leading-none">♥</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#0A0A0A] transition-all text-white font-bold text-sm"
                      style={{ background: '#FF3B6B' }}
                      onClick={() => handleLike(view)}
                      title="いいね"
                    >
                      ♥
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
