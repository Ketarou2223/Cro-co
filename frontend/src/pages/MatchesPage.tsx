import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Layout from '@/components/Layout'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'
import MatchModal from '@/components/MatchModal'
import { usePageTitle } from '@/hooks/usePageTitle'
import api from '@/lib/api'

interface MatchedUser {
  match_id: string
  user_id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  avatar_url: string | null
  matched_at: string
}

interface LikerItem {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  avatar_url: string | null
}

interface ProfileViewItem {
  viewer_id: string
  name: string | null
  year: number | null
  faculty: string | null
  avatar_url: string | null
  viewed_at: string
}

const formatMatchedAt = (dateStr: string) =>
  new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric' }).format(new Date(dateStr))

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diffMs / 3600000)
  if (h < 1) return '1時間以内'
  if (h < 24) return `${h}時間前`
  const d = Math.floor(h / 24)
  return `${d}日前`
}

export default function MatchesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // いいね → マッチモーダル
  const [matchModalUser, setMatchModalUser] = useState<{ name: string | null; avatar_url: string | null } | null>(null)
  // 「今はいい」で非表示にした liker ids（セッションのみ）
  const [dismissedLikerIds, setDismissedLikerIds] = useState<Set<string>>(new Set())
  const [liking, setLiking] = useState<string | null>(null)

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get<{ unread_messages: number; unread_matches: number }>('/api/matches/unread-count').then(r => r.data),
  })
  const unreadCount = (unreadData?.unread_messages ?? 0) + (unreadData?.unread_matches ?? 0)
  usePageTitle(unreadCount > 0 ? `マッチ (${unreadCount})` : 'マッチ')

  const { data: matches = [], isLoading: loading, isError, refetch } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get<MatchedUser[]>('/api/matches/').then(r => r.data),
  })

  const { data: likers = [], refetch: refetchLikers } = useQuery({
    queryKey: ['likes-received'],
    queryFn: () => api.get<LikerItem[]>('/api/likes/received').then(r => r.data),
  })

  const { data: profileViews = [] } = useQuery({
    queryKey: ['profile-views'],
    queryFn: () => api.get<ProfileViewItem[]>('/api/profiles/views').then(r => r.data),
  })

  const handleHide = async (userId: string, matchId: string) => {
    try {
      await api.post('/api/safety/hide', { hidden_id: userId })
      queryClient.setQueryData<MatchedUser[]>(['matches'], (old = []) =>
        old.filter((m) => m.match_id !== matchId)
      )
    } catch {}
  }

  const handleLikeLiker = async (liker: LikerItem) => {
    if (liking) return
    setLiking(liker.id)
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes', { liked_id: liker.id })
      // いいね一覧から削除
      queryClient.setQueryData<LikerItem[]>(['likes-received'], (old = []) =>
        old.filter((l) => l.id !== liker.id)
      )
      if (res.data.is_match) {
        setMatchModalUser({ name: liker.name, avatar_url: liker.avatar_url })
        // マッチ一覧を再取得
        queryClient.invalidateQueries({ queryKey: ['matches'] })
      }
    } catch {} finally {
      setLiking(null)
    }
  }

  const handleDismissLiker = (id: string) => {
    setDismissedLikerIds(prev => new Set([...prev, id]))
  }

  const visibleLikers = likers.filter(l => !dismissedLikerIds.has(l.id))

  return (
    <Layout>
      {matchModalUser && (
        <MatchModal
          isOpen={!!matchModalUser}
          onClose={() => setMatchModalUser(null)}
          matchedUser={matchModalUser}
        />
      )}

      <div className="px-4 py-5 space-y-4">
        {/* ヘッダー */}
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-4xl text-ink">マッチ</h1>
          {!loading && !isError && matches.length > 0 && (
            <span className="font-mono text-sm font-bold border-2 border-ink px-2 py-0.5">
              {matches.length} MATCHES
            </span>
          )}
        </div>

        {/* あなたへのいいね（縦リスト） */}
        {visibleLikers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 -mx-4 px-4 py-2 border-y-2 border-ink" style={{ background: '#FF3B6B' }}>
              <h2 className="font-display text-xl text-white">あなたへのいいね</h2>
              <span className="font-mono text-xs font-bold bg-white text-hot px-1.5 py-0.5">{visibleLikers.length}</span>
            </div>
            <div className="space-y-3">
              {visibleLikers.map((liker) => (
                <div key={liker.id} className="card-bold bg-white p-3 flex items-center gap-3">
                  {/* アバター */}
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${liker.id}`)}
                    className="shrink-0"
                  >
                    <div className="w-14 h-14 rounded-full bg-muted overflow-hidden border-2 border-ink shadow-[2px_2px_0_0_#0A0A0A]">
                      {liker.avatar_url ? (
                        <img src={liker.avatar_url} alt={liker.name ?? ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink truncate">{liker.name ?? '（名前未設定）'}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {[liker.year != null ? `${liker.year}年` : null, liker.faculty].filter(Boolean).join(' · ') || '（未設定）'}
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLikeLiker(liker)}
                      disabled={liking === liker.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-ink font-bold text-xs text-white shadow-[2px_2px_0_0_#0A0A0A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                      style={{ background: '#FF3B6B' }}
                    >
                      {liking === liker.id ? '送信中...' : <>いいね <Heart className="w-3 h-3 inline" /></>}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissLiker(liker.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                    >
                      今はいい
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* いいね0件 */}
        {likers.length === 0 && !loading && (
          <div className="card-bold bg-white p-5">
            <p className="text-sm font-bold text-ink">まだいいねがない。気にしてないふりしてる。</p>
          </div>
        )}

        {/* 足跡 */}
        {profileViews.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 -mx-4 px-4 py-2 bg-mint border-y-2 border-ink">
              <h2 className="font-display text-xl text-ink">足跡</h2>
              <span className="font-mono text-xs font-bold bg-ink text-white px-1.5 py-0.5">{profileViews.length}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {profileViews.map((view) => (
                <button
                  key={view.viewer_id}
                  type="button"
                  onClick={() => navigate(`/profile/${view.viewer_id}`)}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className="w-14 h-14 rounded-full bg-muted overflow-hidden border-2 border-ink shadow-[2px_2px_0_0_#0A0A0A]">
                    {view.avatar_url ? (
                      <img src={view.avatar_url} alt={view.name ?? ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold truncate w-14 text-center text-ink">{view.name ?? '?'}</p>
                  <p className="font-mono text-[10px] text-ink/50">{formatTimeAgo(view.viewed_at)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {isError && <ErrorState message="読み込めなかった。" onRetry={refetch} />}

        {/* ローディング */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-bold p-4 flex gap-4">
                <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* マッチリスト区切り */}
        {!loading && !isError && (
          <div className="flex items-center gap-2 -mx-4 px-4 py-2 bg-acid border-y-2 border-ink">
            <h2 className="font-display text-xl text-ink">マッチ</h2>
            {matches.length > 0 && (
              <span className="font-mono text-xs font-bold bg-ink text-white px-1.5 py-0.5">{matches.length}</span>
            )}
          </div>
        )}

        {/* 空状態 */}
        {!loading && !isError && matches.length === 0 && (
          <EmptyState
            icon={<Heart className="w-16 h-16 text-gray-300" />}
            title="まだマッチがいない。"
            description="いいねを送ってみよう。待ってるだけじゃ始まらない。"
            actionLabel="みんなを見る"
            onAction={() => navigate('/browse')}
            buttonVariant="bold"
          />
        )}

        {/* マッチリスト */}
        {!loading && !isError && matches.length > 0 && (
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.user_id} className="card-bold p-4 bg-white">
                <div className="flex gap-4 items-center">
                  <button
                    type="button"
                    onClick={() => { window.location.href = `/profile/${m.user_id}` }}
                    className="shrink-0"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted overflow-hidden border-2 border-ink shadow-[2px_2px_0_0_#0A0A0A]">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.name ?? '相手'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold truncate text-ink">{m.name ?? '（名前未設定）'}</h2>
                    <p className="font-mono text-xs text-ink/50">
                      {[m.year != null ? `${m.year}年` : null, m.faculty ?? null].filter(Boolean).join(' · ') || '（未設定）'}
                    </p>
                    <p className="font-mono text-xs text-ink/40 mt-0.5">{formatMatchedAt(m.matched_at)} マッチ</p>
                  </div>
                  <Button size="sm" variant="bold" className="shrink-0" onClick={() => navigate(`/chat/${m.match_id}`)}>
                    チャット →
                  </Button>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="font-mono text-xs text-ink/30 hover:text-ink/60 transition-colors"
                    onClick={() => handleHide(m.user_id, m.match_id)}
                  >
                    非表示
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
