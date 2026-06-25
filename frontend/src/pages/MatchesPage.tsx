// 解説: このファイルはマッチ一覧ページを定義する。
// 解説: マッチ済みリスト（会話一覧）のみを表示する。いいね受信処理は通知タブに移設済み（CC指示⑧）
// 解説: unreadCount = タイトルバーに未読数を出すために 10秒間隔でポーリングする
// 解説: confirmedRef = マッチタブ開封時に自分側の未確認マッチを1回だけ既読化する
import { useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { Heart, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'
import { MatchListCard } from '@/components/MatchListCard'
import type { MatchListItem } from '@/components/MatchListCard'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getYearLabel } from '@/lib/utils'
import api from '@/lib/api'
import type { MatchedUser } from '@/lib/db'

export default function MatchesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: myProfile } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<{ name: string | null; faculty: string | null; bio: string | null; profile_setup_completed: boolean; status: string }>('/api/profile/me').then(r => r.data),
    retry: false,
  })

  const isProfileIncomplete = myProfile !== undefined && (!myProfile?.name || !myProfile?.faculty || !myProfile?.bio)

  const isApproved = myProfile?.status === 'approved'

  // マッチタブ開封時に自分側の未確認マッチを既読化（FootprintsPage と同パターン）
  const confirmedRef = useRef(false)
  useEffect(() => {
    if (!isApproved || confirmedRef.current) return
    confirmedRef.current = true
    queryClient.setQueryData(['unread-count'], (o: any) => (o ? { ...o, unread_matches: 0 } : o))
    api.post('/api/matches/confirm')
      .then(() => queryClient.invalidateQueries({ queryKey: ['unread-count'] }))
      .catch(() => {})
  }, [isApproved, queryClient])

  const {
    data: matches = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get<MatchedUser[]>('/api/matches/').then(r => r.data),
    enabled: isApproved,
    staleTime: 15 * 1000,
  })

  const { data: unreadData } = useUnreadCount(isApproved, { refetchInterval: 30_000 })
  const unreadCount = (unreadData?.unread_messages ?? 0) + (unreadData?.unread_matches ?? 0)
  usePageTitle(unreadCount > 0 ? `マッチ (${unreadCount})` : 'マッチ')

  if (myProfile && !myProfile.profile_setup_completed) {
    return <Navigate to="/setup/required" replace />
  }

  if (myProfile && myProfile.status !== 'approved') {
    return (
      <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/30 flex items-center justify-center p-6">
          <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-sm w-full shadow-[8px_8px_0_0_#000]">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-brand border-4 border-black rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            {/* @copy CRO-heading-matches-locked-01 Lv0 */}
            <h2 className="text-xl font-bold text-center mb-3">
              {myProfile.status === 'rejected'
                ? '学生証の再提出が必要です'
                : 'マッチ機能は認証完了後に利用できます'}
            </h2>
            {/* @copy CRO-onboarding-matches-locked-01 Lv0 */}
            <p className="text-sm text-ink/60 text-center mb-6">
              {myProfile.status === 'rejected'
                ? '再申請して承認されると、マッチ機能が使えるようになります。'
                : '学生証の審査が完了すると、マッチ機能が使えるようになります。'}
            </p>
            {myProfile.status === 'rejected' ? (
              <button
                type="button"
                onClick={() => navigate('/setup/required?mode=reapply')}
                className="w-full bg-black text-white font-bold py-3 rounded-xl border-2 border-black"
              >
                {/* @copy CRO-button-matches-01 Lv0 */}
                再申請する →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full bg-brand text-black font-bold py-3 rounded-xl border-2 border-black"
              >
                {/* @copy CRO-button-matches-02 Lv1 */}
                ホームに戻る
              </button>
            )}
          </div>
        </div>
    )
  }

  if (isProfileIncomplete) {
    return (
      <div
          className="flex flex-col items-center justify-center px-6 text-center"
          style={{ minHeight: 'calc(100dvh - 156px)' }}
        >
          {/* @copy CRO-heading-matches-incomplete-01 Lv1 */}
          <p className="font-display text-3xl text-ink">プロフィールを完成させてからご利用いただけます。</p>
          {/* @copy CRO-label-matches-incomplete-01 Lv1 */}
          <p className="text-ink/60 text-sm mt-4">名前・学部・自己紹介を設定してください。</p>
          <Button variant="bold" className="mt-8 w-full" onClick={() => navigate('/settings')}>
            {/* @copy CRO-button-matches-03 Lv1 */}
            プロフィールを設定する
          </Button>
        </div>
    )
  }

  if (loading && matches.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100dvh - 156px)' }}>
          {/* @copy CRO-label-matches-loading-01 Lv1 */}
          <p className="font-mono text-ink/60 text-sm">読み込んでいます。少しお待ちください。</p>
        </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-baseline justify-between gap-3">
        {/* @copy CRO-heading-matches-01 Lv1 */}
        <h1 className="font-display text-4xl text-ink">マッチ</h1>
        {!loading && !isError && matches.length > 0 && (
          <span className="font-mono text-sm font-bold border-2 border-ink px-2 py-0.5">
            {matches.length} MATCHES
          </span>
        )}
      </div>

      {/* @copy CRO-error-matches-01 Lv1 */}
      {isError && <ErrorState message="読み込めませんでした。" onRetry={refetch} />}

      {/* マッチリスト区切り */}
      {!loading && !isError && (
        <div className="flex items-center gap-2 -mx-4 px-4 py-2 bg-brand border-y-2 border-ink">
          {/* @copy CRO-heading-matches-03 Lv1 */}
          <h2 className="font-display text-xl text-ink">マッチ</h2>
          {matches.length > 0 && (
            <span className="font-mono text-xs font-bold bg-ink text-white px-1.5 py-0.5">{matches.length}</span>
          )}
        </div>
      )}

      {/* 空状態 */}
      {/* @copy CRO-empty-matches-02 Lv1 (title/description/actionLabel) */}
      {!loading && !isError && matches.length === 0 && (
        <EmptyState
          icon={<Heart className="w-16 h-16 text-ink/20" />}
          title="まだ誰ともマッチしていません。"
          description="いいねを送ってみましょう。"
          actionLabel="みんなを見る"
          onAction={() => navigate('/browse')}
          buttonVariant="bold"
        />
      )}

      {/* マッチリスト */}
      {!loading && !isError && matches.length > 0 && (
        <div className="space-y-2.5">
          {matches.map((m) => {
            const item: MatchListItem = {
              matchId: m.match_id,
              user: {
                id: m.user_id,
                nickname: m.name ?? '（名前未設定）',
                faculty: m.faculty ?? '（未設定）',
                year: getYearLabel(m.year) ?? '（未設定）',
                avatarUrl: m.avatar_url ?? null,
                isDeleted: m.is_deleted ?? false,
              },
              lastMessage: m.last_message
                ? {
                    content: m.last_message.content,
                    createdAt: m.last_message.created_at,
                    isMine: m.last_message.is_mine,
                  }
                : null,
              lastActivityAt: m.last_activity_at ?? m.matched_at,
              unreadCount: m.unread_count ?? 0,
            }
            return (
              <MatchListCard
                key={m.match_id}
                item={item}
                onOpenChat={(matchId) => navigate(`/chat/${matchId}`)}
                onOpenProfile={(userId) => navigate(`/profile/${userId}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
