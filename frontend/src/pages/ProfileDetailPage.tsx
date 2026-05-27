import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ErrorState from '@/components/ErrorState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Button } from '@/components/ui/button'
import MatchModal from '@/components/MatchModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Camera, ChevronLeft, ChevronRight, Heart, MoreVertical, Search } from 'lucide-react'
import Layout from '@/components/Layout'
import CrocoIllust from '@/components/CrocoIllust'
import { getUserColor } from '@/components/ColorfulCard'
import { ActivityBadge } from '@/pages/BrowsePage'
import { getDefaultStatusMessage } from '@/lib/default-status-messages'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import api from '@/lib/api'

interface PhotoItem {
  id: string
  image_path: string
  display_order: number
  signed_url: string | null
  status?: string
}

interface ProfileDetail {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  department: string | null
  science_humanities: 'humanities' | 'sciences' | null
  bio: string | null
  created_at: string
  avatar_url: string | null
  is_liked: boolean
  photos: PhotoItem[]
  interests: string[]
  club: string | null
  clubs: string[]
  hometown: string | null
  last_seen_at: string | null
  show_online_status: boolean
  status_message: string | null
}

const REPORT_REASONS = ['不適切な写真', 'ハラスメント', 'なりすまし', 'スパム', 'その他'] as const
type ReportReason = (typeof REPORT_REASONS)[number]

function scienceHumanitiesLabel(sh: ProfileDetail['science_humanities']): string | null {
  if (sh === 'humanities') return '文系'
  if (sh === 'sciences') return '理系'
  return null
}

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromFootprint = searchParams.get('from') === 'footprint'
  const { user } = useAuth()

  const [isLiked, setIsLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [likeError, setLikeError] = useState<string | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [likeAnimation, setLikeAnimation] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('不適切な写真')
  const [reportDetail, setReportDetail] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  const isSelf = user?.id === id
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const { data: myProfileData } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<{ status: string }>('/api/profile/me').then(r => r.data),
    retry: false,
    enabled: !isSelf,
  })
  const isPending = myProfileData?.status === 'pending_review'

  const { data: profile, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.get<ProfileDetail>(`/api/profiles/${id}`).then(r => r.data),
    enabled: !!id,
    staleTime: 60 * 1000,
    retry: (failureCount, err: unknown) => {
      const s = (err as { response?: { status?: number } }).response?.status
      if (s === 404 || s === 403) return false
      return failureCount < 1
    },
  })

  const notFound = !!(queryError && (queryError as { response?: { status?: number } }).response?.status === 404)
  const error = queryError && !notFound ? 'プロフィールの取得に失敗しました' : null

  usePageTitle(profile?.name ?? 'プロフィール')

  useEffect(() => {
    if (profile) setIsLiked(profile.is_liked)
  }, [profile])

  const handleLike = async () => {
    if (!profile || isLiked || liking) return
    // 楽観的更新: 即座に UI を「いいね済み」に
    setIsLiked(true)
    setLikeAnimation(true)
    setTimeout(() => setLikeAnimation(false), 400)
    showToast(`${profile.name ?? '相手'}にいいねしました`)
    setLikeError(null)
    setLiking(true)
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes/', {
        liked_id: profile.id,
        via_footprint: fromFootprint,
      })
      if (res.data.is_match) {
        setShowMatchModal(true)
      }
    } catch {
      setIsLiked(false)
      setLikeError('いいねを送れませんでした。もう一度試してみて。')
    } finally {
      setLiking(false)
    }
  }

  const handleHide = async () => {
    if (!profile) return
    try {
      await api.post('/api/safety/hide', { hidden_id: profile.id })
      queryClient.invalidateQueries({ queryKey: ['safety-hides'] })
      navigate('/browse')
    } catch {
      alert('非表示の処理に失敗しました')
    }
  }

  const handleBlock = async () => {
    if (!profile) return
    if (!window.confirm(`${profile.name ?? 'このユーザー'}さんをブロックする？もう会えなくなるけど、いいの？`)) return
    try {
      await api.post('/api/safety/block', { blocked_id: profile.id })
      queryClient.invalidateQueries({ queryKey: ['safety-blocks'] })
      navigate('/browse')
    } catch {
      alert('ブロックの処理に失敗しました')
    }
  }

  const openReportModal = () => {
    setReportReason('不適切な写真')
    setReportDetail('')
    setReportDone(false)
    setReportOpen(true)
  }

  const handleReport = async () => {
    if (!profile || reporting) return
    setReporting(true)
    try {
      await api.post('/api/safety/report', {
        reported_id: profile.id,
        reason: reportReason,
        detail: reportDetail.trim() || undefined,
      })
      setReportDone(true)
    } catch {
      alert('通報の送信に失敗しました')
    } finally {
      setReporting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="px-4 pt-4 space-y-4">
          <Skeleton className="w-full aspect-square rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </Layout>
    )
  }

  if (notFound) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4 px-4">
          <Search className="w-12 h-12 text-ink/40" />
          <p className="text-lg font-bold">ユーザーが見つかりません</p>
          <Button variant="outline-bold" onClick={() => navigate('/browse')}>
            ← 一覧に戻る
          </Button>
        </div>
      </Layout>
    )
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="p-4">
          <ErrorState
            message={error ?? '予期しないエラーが発生しました'}
            onRetry={error ? refetch : undefined}
          />
          <div className="flex justify-center mt-2">
            <Button variant="outline-bold" onClick={() => navigate('/browse')}>
              ← 一覧に戻る
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  const registeredAt = new Date(profile.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const photos = profile.photos ?? []
  const heroColor = getUserColor(profile.id)
  const statusText = profile.status_message?.trim() || getDefaultStatusMessage(profile.id)
  const shLabel = scienceHumanitiesLabel(profile.science_humanities)
  const slideCount = Math.max(photos.length, 1)
  const currentIdx = Math.min(photoIdx, slideCount - 1)

  return (
    <Layout>
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedUser={{ name: profile.name, avatar_url: profile.avatar_url }}
      />

      {/* 通報モーダル */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">通報する</DialogTitle>
            <DialogDescription>
              {reportDone ? '通報を受け付けた。' : '理由を選んで'}
            </DialogDescription>
          </DialogHeader>
          {!reportDone ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reportReason === r}
                      onChange={() => setReportReason(r)}
                      className="accent-primary"
                    />
                    {r}
                  </label>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">詳細（任意・500文字以内）</label>
                <Textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="詳細があれば（任意）"
                  disabled={reporting}
                  className="border-2 border-ink focus-visible:ring-0"
                />
                <p className="text-xs text-muted-foreground text-right">{reportDetail.length} / 500</p>
              </div>
              <Button variant="bold" className="w-full" onClick={handleReport} disabled={reporting}>
                {reporting ? '送信中...' : '通報する'}
              </Button>
            </div>
          ) : (
            <DialogFooter>
              <Button variant="bold" className="w-full" onClick={() => setReportOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ページ全面: ユーザー固有カラー（PC では背景のみ全幅・コンテンツは 480px 維持） */}
      <div
        className="min-h-[calc(100dvh-92px)] pb-40 md:relative md:left-1/2 md:w-screen md:-translate-x-1/2"
        style={{ backgroundColor: heroColor }}
      >
        <div className="max-w-[480px] mx-auto">
        {/* トップバー: 戻る + プレビュー/メニュー */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="戻る"
            className="w-9 h-9 rounded-full bg-white border-2 border-ink flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#0A0A0A] transition-all"
          >
            ←
          </button>

          {isSelf ? (
            <span className="font-mono text-xs font-bold bg-acid border-2 border-ink px-2 py-1">
              PREVIEW MODE
            </span>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline-bold" size="sm" className="w-9 h-9 p-0 flex items-center justify-center">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleHide}>
                  非表示にする
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock} className="text-destructive focus:text-destructive">
                  ブロックする
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openReportModal} className="text-destructive focus:text-destructive">
                  通報する
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="px-4 space-y-4">
          {/* 写真カルーセル（メイン写真が先頭・写真ゼロは Croco） */}
          <div className="card-bold overflow-hidden bg-white">
            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${currentIdx * 100}%)` }}
                >
                  {photos.length > 0 ? (
                    photos.map((photo) => {
                      const photoStatus = photo.status ?? 'approved'
                      const showPending = isSelf && photoStatus === 'pending'
                      const showRejected = isSelf && photoStatus === 'rejected'
                      return (
                        <div key={photo.id} className="flex-none w-full aspect-square relative bg-muted">
                          {photo.signed_url ? (
                            <img src={photo.signed_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          {showPending && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="font-mono text-xs font-bold text-white uppercase tracking-widest">審査中</span>
                            </div>
                          )}
                          {showRejected && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.7)' }}>
                              <span className="font-mono text-xs font-bold text-white uppercase tracking-widest">承認不可</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div
                      className="flex-none w-full aspect-square flex flex-col items-center justify-center gap-3"
                      style={{ backgroundColor: heroColor }}
                    >
                      <CrocoIllust size={120} />
                      <p className="font-mono text-xs text-ink/60">写真はまだない。</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 左右矢印 */}
              {slideCount > 1 && (
                <>
                  {currentIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => setPhotoIdx(currentIdx - 1)}
                      aria-label="前の写真"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-2 border-ink flex items-center justify-center shadow-[2px_2px_0_0_#0A0A0A] active:translate-y-[calc(-50%+1px)] transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {currentIdx < slideCount - 1 && (
                    <button
                      type="button"
                      onClick={() => setPhotoIdx(currentIdx + 1)}
                      aria-label="次の写真"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-2 border-ink flex items-center justify-center shadow-[2px_2px_0_0_#0A0A0A] active:translate-y-[calc(-50%+1px)] transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ドット（枚数表示） */}
            {slideCount > 1 && (
              <div className="flex justify-center gap-1.5 py-2.5">
                {photos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setPhotoIdx(idx)}
                    aria-label={`${idx + 1}枚目`}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{ backgroundColor: idx === currentIdx ? '#0A0A0A' : 'rgba(10,10,10,0.25)' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 名前ブロック */}
          <div className="card-bold p-4 bg-white space-y-3">
            <div>
              <h1 className="font-display text-3xl text-ink leading-tight">
                {profile.name ?? '（未設定）'}
              </h1>
              <p className="font-mono text-sm italic text-gray-500 mt-1">
                "{statusText}"
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {profile.year != null && (
                <span className="tag-pill">{profile.year}年</span>
              )}
              {shLabel && (
                <span className="tag-pill">{shLabel}</span>
              )}
              {profile.hometown && (
                <span className="tag-pill">{profile.hometown}</span>
              )}
              <ActivityBadge lastSeenAt={profile.last_seen_at} showOnlineStatus={profile.show_online_status} />
            </div>
          </div>

          {/* 詳細ブロック */}
          <div className="card-bold p-4 bg-white space-y-4">
            {profile.bio && (
              <div>
                <p className="font-mono text-xs font-bold text-muted mb-2 uppercase tracking-wider">自己紹介</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-muted uppercase tracking-wider">登録日</span>
              <span className="font-mono text-xs text-gray-500">{registeredAt}</span>
            </div>
          </div>

          {likeError && (
            <Alert variant="destructive">
              <AlertDescription>{likeError}</AlertDescription>
            </Alert>
          )}

          {isSelf && (
            <p className="text-center text-sm text-ink/60 py-2">
              （自分のプロフィールです）
            </p>
          )}
        </div>
        </div>
      </div>

      {/* いいねボタン（横長・浮遊・自分以外/審査完了済み） */}
      {!isSelf && !isPending && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 flex justify-center px-6 pointer-events-none">
          {isLiked ? (
            <div className="pointer-events-auto w-full max-w-[420px] py-3.5 rounded-full bg-gray-200 border-2 border-gray-400 text-gray-500 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
              <Heart className="w-5 h-5" fill="currentColor" />
              <span>いいね済み</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLike}
              disabled={liking}
              className={`pointer-events-auto w-full max-w-[420px] py-3.5 rounded-full border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                !liking
                  ? 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A]'
                  : ''
              } ${likeAnimation ? 'scale-105' : ''}`}
              style={{ background: '#FF3B6B' }}
            >
              <Heart className="w-5 h-5 text-white" />
              <span>いいね</span>
            </button>
          )}
        </div>
      )}
    </Layout>
  )
}
