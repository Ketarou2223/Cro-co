// 解説: このファイルは「あなたへのいいね」一覧ページを定義する（/notifications から遷移）。
// 解説: is_new = 前回確認以降に届いた新着いいね（赤バッジ + "NEW" タグで強調表示）
// 解説: confirmedRef = マウント時に1回だけ /api/likes/received/confirm を呼んで未読をクリアする
// 解説: handleLikeback = 返いいね送信。マッチ成立なら MatchModal を表示する
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, Heart, User } from 'lucide-react'
import MatchModal from '@/components/MatchModal'
import { hashId } from '@/components/ColorfulCard'
import { blurStock } from '@/assets/blur'
import { usePageTitle } from '@/hooks/usePageTitle'
import api from '@/lib/api'

interface LikerItem {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  avatar_url: string | null
  is_new: boolean
  is_deleted?: boolean
  blurred?: boolean
}

export default function LikesReceivedPage() {
  usePageTitle('あなたへのいいね')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [likedBackIds, setLikedBackIds] = useState<Set<string>>(new Set())
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedUser, setMatchedUser] = useState<{ name: string | null; avatar_url: string | null } | null>(null)

  const { data: likers = [], isLoading } = useQuery({
    queryKey: ['likes-received'],
    queryFn: () => api.get<LikerItem[]>('/api/likes/received').then(r => r.data),
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  })

  // 表示後に自動既読
  const confirmedRef = useRef(false)
  useEffect(() => {
    if (!isLoading && !confirmedRef.current) {
      confirmedRef.current = true
      api.post('/api/likes/received/confirm').catch(() => {})
      queryClient.setQueryData(['unread-count'], (o: any) => (o ? { ...o, unread_likes_received: 0 } : o))
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['likes-received'] })
    }
  }, [isLoading, queryClient])

  const handleLikeback = async (liker: LikerItem) => {
    if (likedBackIds.has(liker.id)) return
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes/', { liked_id: liker.id, via_footprint: true })
      setLikedBackIds(prev => new Set([...prev, liker.id]))
      if (res.data.is_match) {
        setMatchedUser({ name: liker.name, avatar_url: liker.avatar_url })
        setShowMatchModal(true)
      }
    } catch {}
  }

  return (
    <>
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
          {/* @copy CRO-button-likes-received-01 Lv1 */}
          通知に戻る
        </button>

        {/* @copy CRO-heading-likes-received-01 Lv1 */}
        <h1
          className="font-display text-3xl text-ink"
          style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
        >
          あなたへのいいね
        </h1>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-bold bg-gray-100 h-16 animate-pulse" />
            ))}
          </div>
        ) : likers.length === 0 ? (
          <div className="card-bold bg-white p-8 flex flex-col items-center gap-3">
            <Heart className="w-12 h-12 text-ink/20" />
            {/* @copy CRO-empty-likes-received-01 Lv1 */}
            <p className="font-mono text-sm text-muted">まだいいねは届いていません。気になる人に送ってみましょう。</p>
          </div>
        ) : (
          <>
            {/* ボカし告知（blurred なライカーが1人以上いる場合） */}
            {likers.some(l => l.blurred) && (
              <div
                className="p-3 rounded-[18px] flex items-start gap-2 mb-2"
                style={{ border: '2px solid var(--color-danger)', background: 'var(--color-paper)' }}
              >
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                {/* @copy CRO-label-likes-received-blur-notice-01 Lv1 */}
                <p className="text-sm font-bold text-ink leading-snug">
                  プロフィールを80%まで埋めると、いいねをくれた人の写真を見ることができます。
                </p>
              </div>
            )}
          <div className="space-y-2">
            {likers.map((liker) => {
              const likedBack = likedBackIds.has(liker.id)
              return (
                <div
                  key={liker.id}
                  className="card-bold bg-white flex items-center gap-3 p-3"
                >
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => { if (!liker.is_deleted && !liker.blurred) navigate(`/profile/${liker.id}`) }}
                  >
                    <div className="relative w-11 h-11 shrink-0">
                      <div className="w-full h-full rounded-full border-2 border-ink overflow-hidden">
                        {liker.blurred ? (
                          <div className="w-full h-full relative">
                            <img
                              src={blurStock[hashId(liker.id) % 5]}
                              alt=""
                              aria-hidden="true"
                              className="w-full h-full object-cover"
                              style={{ filter: 'blur(16px)' }}
                            />
                            <div
                              className="absolute inset-0"
                              style={{ background: 'rgba(255,255,255,0.22)' }}
                            />
                          </div>
                        ) : liker.avatar_url ? (
                          <img
                            src={liker.avatar_url}
                            alt={liker.name ?? ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <User className="w-5 h-5 text-ink/40" />
                          </div>
                        )}
                      </div>
                      {liker.is_new && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-hot rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {/* @copy CRO-label-likes-received-deleted-01 Lv1 */}
                        <p className={`font-bold text-sm truncate ${liker.is_deleted ? 'text-ink/40 italic' : 'text-ink'}`}>
                          {liker.is_deleted ? '退会済み' : (liker.name ?? '（名前未設定）')}
                        </p>
                        {liker.is_new && (
                          <span className="font-mono text-[9px] font-bold bg-hot text-white px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                            NEW
                          </span>
                        )}
                      </div>
                      {!liker.is_deleted && liker.faculty && (
                        <p className="text-xs text-ink/60 truncate">{liker.faculty}</p>
                      )}
                      {!liker.is_deleted && liker.year && (
                        <p className="font-mono text-xs text-ink/40">{liker.year}年</p>
                      )}
                    </div>
                  </button>

                  {likedBack ? (
                    <div
                      className="px-3 h-9 rounded-full border-2 border-ink flex items-center justify-center shrink-0 opacity-60 font-mono font-bold text-xs text-white"
                      style={{ background: 'var(--color-like)' }}
                    >
                      {/* @copy CRO-label-likes-received-01 Lv1 */}
                      ♥ 済み
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="px-3 h-9 rounded-full border-2 border-ink flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#0A0A0A] transition-all font-mono font-bold text-xs text-white"
                      style={{ background: '#FF3B6B' }}
                      onClick={() => handleLikeback(liker)}
                    >
                      {/* @copy CRO-button-likes-received-02 Lv1 */}
                      ♥ 返す
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>
    </>
  )
}
