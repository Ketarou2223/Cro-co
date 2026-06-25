// 解説: このファイルは他ユーザーのプロフィール詳細ページを定義する（自分も「PREVIEW MODE」で閲覧可能）。
// 解説: isSelf = URL の :id が自分の userId と一致する場合はプレビューモード表示（いいねボタン非表示）
// 解説: heroColor = getUserColor(profile.id) でユーザー固有の背景色を決定する
// 解説: 写真カルーセル = photos 配列を translateX でスライドし、ドットで枚数表示する
// 解説: ブロック・通報・非表示の安全機能を含む（ブロックは CLAUDE.md §9 に従い取り消し不可）
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { trackEvent } from '@/lib/analytics'
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
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, Heart, MoreVertical, Search } from 'lucide-react'
import CrocoIllust from '@/components/CrocoIllust'
import DailyStatsBar from '@/components/DailyStatsBar'
import FreeSlotGrid, { isValidFreeSlots } from '@/components/FreeSlotGrid'
import { hashId, getUserColor } from '@/components/ColorfulCard'
import { blurStock } from '@/assets/blur'
import { ActivityBadge } from '@/pages/BrowsePage'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import api from '@/lib/api'
import { getDailyStatusMessage } from '@/lib/default-status-messages'
import { getYearLabel } from '@/lib/utils'
import { DETAIL_FIELDS, ZODIAC_LABELS } from '@/constants/profileDetailFields'

interface PhotoItem {
  id: string
  image_path: string
  display_order: number
  signed_url: string | null
  status?: string
}

interface DailyOption {
  key: string
  label: string
}

interface DailyStats {
  total: number
  counts: Record<string, number>
  percentages: Record<string, number>
}

interface DailyTodayForProfile {
  question: { id: string; body: string; options: DailyOption[] } | null
  their_choice: string | null
  answered: boolean
  stats: DailyStats | null
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
  free_slots: string | null
  height_cm: number | null
  body_type: string | null
  blood_type: string | null
  sibling_rank: string | null
  languages: string[] | null
  campus: string | null
  housing: string | null
  commute_time: string | null
  commute_means: string[] | null
  second_lang: string | null
  relationship_goal: string | null
  marriage_intent: string | null
  preferred_age_band: string | null
  drinking: string | null
  smoking: string | null
  mbti: string | null
  love_type: string | null
  zodiac: string | null
  daily_today: DailyTodayForProfile | null
  blurred?: boolean
}

// @copy CRO-label-profile-report-reasons-01〜05 Lv0
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

  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blockConfirmError, setBlockConfirmError] = useState<string | null>(null)
  const [blocking, setBlocking] = useState(false)

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
    // 在庫バッジを楽観的に -1（via_footprint 経由は在庫消費なし）
    type StockSnap = { is_applicable: boolean; is_unlimited: boolean; quantity: number | null }
    const prevStock = !fromFootprint
      ? queryClient.getQueryData<StockSnap>(['like-stock'])
      : undefined
    if (prevStock?.is_applicable && !prevStock.is_unlimited && (prevStock.quantity ?? 0) > 0) {
      queryClient.setQueryData<StockSnap>(['like-stock'], (old) =>
        old ? { ...old, quantity: (old.quantity ?? 0) - 1 } : old
      )
    }
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes/', {
        liked_id: profile.id,
        via_footprint: fromFootprint,
      })
      const likeCount = parseInt(localStorage.getItem('like-send-count') || '0')
      localStorage.setItem('like-send-count', String(likeCount + 1))
      if (likeCount === 0) trackEvent('first_like_sent')
      if (res.data.is_match) {
        setShowMatchModal(true)
        trackEvent('match_established')
      }
    } catch {
      setIsLiked(false)
      // @copy CRO-error-profile-like-01 Lv1
      setLikeError('いいねを送れませんでした。もう一度お試しください。')
      // 楽観的更新ロールバック
      if (prevStock !== undefined) {
        queryClient.setQueryData(['like-stock'], prevStock)
      }
    } finally {
      setLiking(false)
    }
  }

  const handleHide = async () => {
    if (!profile) return
    try {
      const hiddenId = profile.id
      queryClient.setQueryData<{ user_id: string }[]>(['matches'], (old) =>
        old ? old.filter((m) => m.user_id !== hiddenId) : old
      )
      await api.post('/api/safety/hide', { hidden_id: hiddenId })
      queryClient.invalidateQueries({ queryKey: ['safety-hides'] })
      navigate('/browse')
    } catch {
      // @copy CRO-error-profile-hide-01 Lv1
      showToast('うまくいきませんでした。もう一度お試しください。')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    }
  }

  const openBlockConfirm = () => {
    setBlockConfirmError(null)
    setShowBlockConfirm(true)
  }

  const handleBlockConfirm = async () => {
    if (!profile || blocking) return
    setBlocking(true)
    setBlockConfirmError(null)
    try {
      const blockedId = profile.id
      queryClient.setQueryData<{ user_id: string }[]>(['matches'], (old) =>
        old ? old.filter((m) => m.user_id !== blockedId) : old
      )
      await api.post('/api/safety/block', { blocked_id: blockedId })
      queryClient.invalidateQueries({ queryKey: ['safety-blocks'] })
      navigate('/browse')
    } catch {
      // @copy CRO-error-profile-block-01 Lv1
      setBlockConfirmError('うまくいきませんでした。もう一度お試しください。')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setBlocking(false)
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
      // @copy CRO-error-profile-report-01 Lv1
      alert('通報の送信に失敗しました')
    } finally {
      setReporting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-4">
          <Skeleton className="w-full aspect-square rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 px-4">
          <Search className="w-12 h-12 text-ink/40" />
          {/* @copy CRO-error-profile-notfound-01 Lv1 */}
          <p className="text-lg font-bold">ユーザーが見つかりません</p>
          <Button variant="outline-bold" onClick={() => navigate('/browse')}>
            {/* @copy CRO-button-profile-back-01 Lv1 */}
            ← 一覧に戻る
          </Button>
        </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-4">
          <ErrorState
            // @copy CRO-error-profile-generic-01 Lv1
            message={error ?? 'うまくいきませんでした。もう一度お試しください。'}
            onRetry={error ? refetch : undefined}
          />
          <div className="flex justify-center mt-2">
            <Button variant="outline-bold" onClick={() => navigate('/browse')}>
              ← 一覧に戻る
            </Button>
          </div>
        </div>
    )
  }

  const registeredAt = new Date(profile.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const photos = profile.photos ?? []
  const heroColor = getUserColor(profile.id)
  const shLabel = scienceHumanitiesLabel(profile.science_humanities)
  const statusText = profile.status_message?.trim() || getDailyStatusMessage(profile.id)
  const slideCount = Math.max(photos.length, 1)
  const currentIdx = Math.min(photoIdx, slideCount - 1)

  return (
    <>
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedUser={{ name: profile.name, avatar_url: profile.avatar_url }}
      />

      {/* ブロック確認モーダル */}
      {showBlockConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => { if (!blocking) setShowBlockConfirm(false) }}
        >
          <div
            className="card-bold bg-white w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#FF3B6B' }} />
              {/* @copy CRO-confirm-profile-block-01 Lv0 */}
              <h2 className="font-display text-2xl text-ink">ブロックしますか？</h2>
            </div>
            {/* @copy CRO-confirm-profile-block-02 Lv0 */}
            <p className="font-mono text-xs font-bold" style={{ color: '#FF3B6B' }}>
              この操作は取り消せません
            </p>
            {/* @copy CRO-confirm-profile-block-03 Lv0 */}
            <p className="text-sm text-ink leading-relaxed">
              ブロックすると、このユーザーとのやり取りはすべて見えなくなります。ブロックは取り消せません。
            </p>
            {blockConfirmError && (
              <p className="font-mono text-sm text-destructive">{blockConfirmError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline-bold"
                className="flex-1"
                onClick={() => setShowBlockConfirm(false)}
                disabled={blocking}
              >
                {/* @copy CRO-button-profile-block-cancel-01 Lv1 */}
                やっぱりやめる
              </Button>
              <Button
                className="flex-1 border-2 border-ink font-bold shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                style={{ backgroundColor: '#FF3B6B', color: '#fff' }}
                onClick={handleBlockConfirm}
                disabled={blocking}
              >
                {/* @copy CRO-button-profile-block-01 Lv0 */}
                {blocking ? 'ブロック中…' : 'ブロックする'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 通報モーダル */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            {/* @copy CRO-heading-profile-report-01 Lv0 */}
            <DialogTitle className="font-bold">通報する</DialogTitle>
            {/* @copy CRO-label-profile-report-01〜02 Lv0 */}
            <DialogDescription>
              {reportDone ? '通報を受け付けました。' : '理由を選んでください。'}
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
                {/* @copy CRO-label-profile-report-03 Lv1 */}
                <label className="text-xs text-muted-foreground">詳細（任意・500文字以内）</label>
                <Textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value.slice(0, 500))}
                  rows={3}
                  // @copy CRO-placeholder-profile-report-01 Lv1
                  placeholder="詳細があれば（任意）"
                  disabled={reporting}
                  className="border-2 border-ink focus-visible:ring-0"
                />
                <p className="text-xs text-muted-foreground text-right">{reportDetail.length} / 500</p>
              </div>
              <Button variant="bold" className="w-full" onClick={handleReport} disabled={reporting}>
                {/* @copy CRO-button-profile-report-01 Lv0 */}
                {reporting ? '送信中…' : '通報する'}
              </Button>
            </div>
          ) : (
            <DialogFooter>
              {/* @copy CRO-button-profile-report-close-01 Lv1 */}
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
            // @copy CRO-label-profile-back-01 Lv1
            aria-label="戻る"
            className="w-9 h-9 rounded-full bg-white border-2 border-ink flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#0A0A0A] transition-all"
          >
            ←
          </button>

          {isSelf ? (
            <span className="font-mono text-xs font-bold bg-brand border-2 border-ink px-2 py-1">
              PREVIEW MODE
            </span>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline-bold" size="sm" className="w-9 h-9 p-0 flex items-center justify-center">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="!bg-white border-2 border-ink !shadow-[4px_4px_0_0_#0A0A0A] !rounded-[12px] !ring-0 min-w-[160px] !p-1.5">
                {/* @copy CRO-button-profile-menu-01〜03 Lv1 */}
                <DropdownMenuItem onClick={handleHide} className="!py-2.5 !px-3 font-medium cursor-pointer text-ink">
                  非表示にする
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openBlockConfirm} className="!py-2.5 !px-3 font-medium cursor-pointer text-danger focus:text-danger">
                  ブロックする
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openReportModal} className="!py-2.5 !px-3 font-medium cursor-pointer text-danger focus:text-danger">
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
                              {/* @copy CRO-label-profile-photo-pending-01 Lv0 */}
                          <span className="font-mono text-xs font-bold text-white uppercase tracking-widest">審査中</span>
                            </div>
                          )}
                          {showRejected && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.7)' }}>
                              {/* @copy CRO-label-profile-photo-rejected-01 Lv0 */}
                              <span className="font-mono text-xs font-bold text-white uppercase tracking-widest">承認不可</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : profile.blurred ? (
                    <div className="flex-none w-full aspect-square relative overflow-hidden">
                      <img
                        src={blurStock[hashId(profile.id) % 5]}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover"
                        style={{ filter: 'blur(20px)', transform: 'scale(1.15)' }}
                      />
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'rgba(255,255,255,0.22)' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex-none w-full aspect-square flex flex-col items-center justify-center gap-3 relative"
                      style={{ backgroundColor: heroColor }}
                    >
                      <CrocoIllust size={120} />
                      {/* @copy CRO-empty-profile-photos-01 Lv1 */}
                      <p className="font-mono text-xs text-ink/60">写真はまだありません。</p>
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
                      // @copy CRO-label-profile-photo-prev-01 Lv1
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
                      // @copy CRO-label-profile-photo-next-01 Lv1
                      aria-label="次の写真"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-2 border-ink flex items-center justify-center shadow-[2px_2px_0_0_#0A0A0A] active:translate-y-[calc(-50%+1px)] transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* サムネ行（2枚以上の場合のみ表示） */}
            {slideCount > 1 && (
              <div className="overflow-x-auto pt-2 pb-2.5 px-2.5">
                <div className="flex gap-1.5 mx-auto w-fit">
                {photos.map((photo, idx) => {
                  const photoStatus = photo.status ?? 'approved'
                  const showPendingThumb = isSelf && photoStatus === 'pending'
                  const showRejectedThumb = isSelf && photoStatus === 'rejected'
                  const isActive = idx === currentIdx
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setPhotoIdx(idx)}
                      aria-label={`${idx + 1}枚目`}
                      className="relative flex-none w-14 h-14 overflow-hidden rounded-lg border-2 transition-all"
                      style={{
                        borderColor: isActive ? 'var(--color-ink)' : 'transparent',
                        opacity: isActive ? 1 : 0.6,
                      }}
                    >
                      {photo.signed_url ? (
                        <img src={photo.signed_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-bone flex items-center justify-center">
                          <Camera className="w-4 h-4 text-ink/30" />
                        </div>
                      )}
                      {showPendingThumb && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="font-mono text-[8px] font-bold text-white uppercase">審査中</span>
                        </div>
                      )}
                      {showRejectedThumb && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.7)' }}>
                          <span className="font-mono text-[8px] font-bold text-white uppercase">不可</span>
                        </div>
                      )}
                    </button>
                  )
                })}
                </div>
              </div>
            )}
          </div>

          {/* 名前ブロック（TODAY'S Q を内包） */}
          <div className="card-bold p-4 bg-white space-y-3">
            <div>
              <h1 className="font-display text-3xl text-ink leading-tight">
                {profile.name ?? '（未設定）'}
              </h1>
              <p className="font-mono text-sm italic text-ink/60 mt-1">
                {statusText}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {profile.year != null && (
                <span className="tag-pill">{getYearLabel(profile.year)}</span>
              )}
              {shLabel && (
                <span className="tag-pill">{shLabel}</span>
              )}
              {profile.hometown && (
                <span className="tag-pill">{profile.hometown}</span>
              )}
              <ActivityBadge lastSeenAt={profile.last_seen_at} showOnlineStatus={profile.show_online_status} />
            </div>
            {profile.daily_today?.question && (
              <>
                <hr className="-mx-4 border-t border-ink/12" />
                <div>
                  <p
                    className="font-mono font-bold text-xs mb-1 tracking-widest"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    TODAY'S Q
                  </p>
                  <p className="font-bold text-ink text-sm mb-2 leading-snug">
                    {profile.daily_today.question.body}
                  </p>
                  {profile.daily_today.answered && profile.daily_today.their_choice ? (
                    <>
                      <p className="text-sm text-ink/60">
                        回答：
                        <span className="font-bold text-ink">
                          {profile.daily_today.question.options.find(o => o.key === profile.daily_today!.their_choice)?.label ?? profile.daily_today.their_choice}
                        </span>
                      </p>
                      {profile.daily_today.stats && (
                        <DailyStatsBar
                          options={profile.daily_today.question.options}
                          percentages={profile.daily_today.stats.percentages}
                          counts={profile.daily_today.stats.counts}
                          highlightKey={profile.daily_today.their_choice}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-ink/50">まだ回答していません。</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 詳細ブロック */}
          <div className="card-bold p-4 bg-white space-y-4">
            {profile.bio && (
              <div>
                {/* @copy CRO-heading-profile-bio-01 Lv1 */}
                <p className="font-mono text-xs font-bold text-muted mb-2 uppercase tracking-wider">自己紹介</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
            {isValidFreeSlots(profile.free_slots) && (
              <div className="mt-4">
                <p className="font-mono text-xs font-bold text-muted mb-2 uppercase tracking-wider">空きコマ</p>
                <FreeSlotGrid value={profile.free_slots} />
              </div>
            )}
            <div className="flex items-center justify-between">
              {/* @copy CRO-label-profile-registered-01 Lv1 */}
              <span className="font-mono text-xs font-bold text-muted uppercase tracking-wider">登録日</span>
              <span className="font-mono text-xs text-ink/60">{registeredAt}</span>
            </div>
          </div>

          {/* 詳細情報 */}
          {(() => {
            const detailItems = DETAIL_FIELDS
              .map((field) => {
                const rawVal = (profile as unknown as Record<string, unknown>)[field.key]
                if (rawVal == null) return null
                if (Array.isArray(rawVal) && (rawVal as string[]).length === 0) return null
                let displayVal: string
                if (field.control === 'height') {
                  displayVal = `${rawVal}cm`
                } else if (field.control === 'single') {
                  const opt = field.options?.find(o => o.value === String(rawVal))
                  displayVal = opt?.label ?? String(rawVal)
                } else {
                  const labels = (rawVal as string[]).map(v => {
                    const opt = field.options?.find(o => o.value === v)
                    return opt?.label ?? v
                  })
                  displayVal = labels.join('、')
                }
                return { key: field.key, label: field.label, displayVal }
              })
              .filter((item): item is NonNullable<typeof item> => item !== null)

            // zodiac を blood_type の直後（なければ末尾）に挿入
            if (profile.zodiac) {
              const bloodIdx = detailItems.findIndex(i => i.key === 'blood_type')
              const insertAt = bloodIdx >= 0 ? bloodIdx + 1 : detailItems.length
              detailItems.splice(insertAt, 0, {
                key: 'zodiac',
                label: '星座',
                displayVal: ZODIAC_LABELS[profile.zodiac] ?? profile.zodiac,
              })
            }

            if (detailItems.length === 0) return null

            return (
              <div className="card-bold p-5 bg-white">
                <p className="font-mono text-xs font-bold text-muted mb-2 uppercase tracking-wider">詳細情報</p>
                <div>
                  {detailItems.map(({ key, label, displayVal }, idx, arr) => (
                    <div
                      key={key}
                      className="flex justify-between items-center gap-4 py-3"
                      style={{ borderBottom: idx < arr.length - 1 ? '1px solid rgba(10,10,10,0.12)' : 'none' }}
                    >
                      <p className="font-mono text-sm text-muted shrink-0">{label}</p>
                      <p className="text-sm font-bold text-ink text-right min-w-0">{displayVal}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {likeError && (
            <Alert variant="destructive">
              <AlertDescription>{likeError}</AlertDescription>
            </Alert>
          )}

          {isSelf && (
            <p className="text-center text-sm text-ink/60 py-2">
              {/* @copy CRO-label-profile-self-01 Lv1 */}
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
            <div className="pointer-events-auto w-full max-w-[420px] py-3.5 rounded-full bg-gray-200 border-2 border-ink/20 text-ink/60 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
              <Heart className="w-5 h-5" fill="currentColor" />
              {/* @copy CRO-button-profile-liked-01 Lv1 */}
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
              {/* @copy CRO-button-profile-like-01 Lv1 */}
              <span>いいね</span>
            </button>
          )}
        </div>
      )}
    </>
  )
}
