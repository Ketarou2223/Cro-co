import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, User } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Layout from '@/components/Layout'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'
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
  new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))

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
  const [unmatchTargetId, setUnmatchTargetId] = useState<string | null>(null)
  const [unmatching, setUnmatching] = useState(false)
  const [unmatchError, setUnmatchError] = useState<string | null>(null)

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

  const { data: likers = [] } = useQuery({
    queryKey: ['likes-received'],
    queryFn: () => api.get<LikerItem[]>('/api/likes/received').then(r => r.data),
  })

  const { data: profileViews = [] } = useQuery({
    queryKey: ['profile-views'],
    queryFn: () => api.get<ProfileViewItem[]>('/api/profiles/views').then(r => r.data),
  })

  const handleUnmatch = async () => {
    if (!unmatchTargetId) return
    setUnmatching(true)
    try {
      await api.delete(`/api/matches/${unmatchTargetId}`)
      queryClient.setQueryData<MatchedUser[]>(['matches'], (old = []) =>
        old.filter((m) => m.match_id !== unmatchTargetId)
      )
      setUnmatchTargetId(null)
    } catch {
      setUnmatchError('うまくいかなかった。もう一度試してみて。')
    } finally {
      setUnmatching(false)
    }
  }

  return (
    <Layout>
      {/* アンマッチ確認ダイアログ */}
      <AlertDialog open={!!unmatchTargetId} onOpenChange={(open) => { if (!open) { setUnmatchTargetId(null); setUnmatchError(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当にアンマッチする？</AlertDialogTitle>
            <AlertDialogDescription>
              メッセージも全部消える。{'\n'}...後悔しても知らない。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {unmatchError && (
            <p className="text-sm text-hot font-medium px-1">{unmatchError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleUnmatch}
              disabled={unmatching}
            >
              {unmatching ? '処理中...' : 'アンマッチ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

        {/* いいねしてくれた人 */}
        {likers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 -mx-4 px-4 py-2 bg-acid border-y-2 border-ink">
              <h2 className="font-display text-xl text-ink">あなたへのいいね</h2>
              <span className="font-mono text-xs font-bold bg-ink text-white px-1.5 py-0.5">{likers.length}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {likers.map((liker) => (
                <button
                  key={liker.id}
                  type="button"
                  onClick={() => navigate(`/profile/${liker.id}`)}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className="w-14 h-14 rounded-full bg-muted overflow-hidden border-2 border-ink shadow-[2px_2px_0_0_#0A0A0A]">
                    {liker.avatar_url ? (
                      <img
                        src={liker.avatar_url}
                        alt={liker.name ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold truncate w-14 text-center text-ink">
                    {liker.name ?? '?'}
                  </p>
                  {liker.year && (
                    <p className="font-mono text-[10px] text-ink/50">{liker.year}年</p>
                  )}
                </button>
              ))}
            </div>
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
                      <img
                        src={view.avatar_url}
                        alt={view.name ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold truncate w-14 text-center text-ink">
                    {view.name ?? '?'}
                  </p>
                  <p className="font-mono text-[10px] text-ink/50">{formatTimeAgo(view.viewed_at)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {isError && (
          <ErrorState message="読み込めなかった。" onRetry={refetch} />
        )}

        {/* ローディング */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-bold p-4 flex gap-4">
                <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                  <Skeleton className="h-8 w-28 rounded-lg mt-2" />
                </div>
              </div>
            ))}
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
              <div
                key={m.user_id}
                className="card-bold p-4 bg-white"
              >
                <div className="flex gap-4 items-center">
                  {/* アバター */}
                  <button
                    type="button"
                    onClick={() => { window.location.href = `/profile/${m.user_id}` }}
                    className="shrink-0"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted overflow-hidden border-2 border-ink shadow-[2px_2px_0_0_#0A0A0A]">
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt={m.name ?? '相手'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold truncate text-ink">
                      {m.name ?? '（名前未設定）'}
                    </h2>
                    <p className="font-mono text-xs text-ink/50">
                      {[
                        m.year != null ? `${m.year}年` : null,
                        m.faculty ?? null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '（未設定）'}
                    </p>
                    <p className="font-mono text-xs text-ink/40 mt-0.5">
                      {formatMatchedAt(m.matched_at)} マッチ
                    </p>
                  </div>

                  {/* チャットボタン */}
                  <Button
                    size="sm"
                    variant="bold"
                    className="shrink-0"
                    onClick={() => navigate(`/chat/${m.match_id}`)}
                  >
                    チャット →
                  </Button>
                </div>

                {/* アンマッチ */}
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-ink/40 px-2 h-7 hover:text-destructive"
                    onClick={() => setUnmatchTargetId(m.match_id)}
                  >
                    アンマッチ
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
