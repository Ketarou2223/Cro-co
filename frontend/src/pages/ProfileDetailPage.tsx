import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ErrorState from '@/components/ErrorState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Heart, MoreVertical, Search, User, X } from 'lucide-react'
import Layout from '@/components/Layout'
import { ActivityBadge } from '@/pages/BrowsePage'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

interface PhotoItem {
  id: string
  image_path: string
  display_order: number
  signed_url: string | null
}

interface ProfileDetail {
  id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  created_at: string
  avatar_url: string | null
  is_liked: boolean
  photos: PhotoItem[]
  interests: string[]
  club: string | null
  hometown: string | null
  looking_for: string | null
  last_seen_at: string | null
  show_online_status: boolean
}

const REPORT_REASONS = ['不適切な写真', 'ハラスメント', 'なりすまし', 'スパム', 'その他'] as const
type ReportReason = (typeof REPORT_REASONS)[number]

const HERO_COLORS = ['#FFE94D', '#FF7DA8', '#FF7A3D', '#6BB5FF', '#8AE8B5', '#C9A8FF']

function getUserHeroColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff
  }
  return HERO_COLORS[Math.abs(hash) % HERO_COLORS.length]
}

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [isLiked, setIsLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [likeError, setLikeError] = useState<string | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [likeAnimation, setLikeAnimation] = useState(false)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('不適切な写真')
  const [reportDetail, setReportDetail] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  const isSelf = user?.id === id

  const { data: profile, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.get<ProfileDetail>(`/api/profiles/${id}`).then(r => r.data),
    enabled: !!id,
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
    setLiking(true)
    setLikeError(null)
    try {
      const res = await api.post<{ is_match: boolean }>('/api/likes', { liked_id: profile.id })
      setIsLiked(true)
      setLikeAnimation(true)
      setTimeout(() => setLikeAnimation(false), 400)
      if (res.data.is_match) {
        setShowMatchModal(true)
      }
    } catch {
      setLikeError('いいねに失敗しました。もう一度お試しください。')
    } finally {
      setLiking(false)
    }
  }

  const handleHide = async () => {
    if (!profile) return
    try {
      await api.post('/api/safety/hide', { hidden_id: profile.id })
      navigate('/browse')
    } catch {
      alert('非表示の処理に失敗しました')
    }
  }

  const handleBlock = async () => {
    if (!profile) return
    if (!window.confirm(`${profile.name ?? 'このユーザー'}をブロックしますか？\nブロックすると互いのプロフィールに表示されなくなります。`)) return
    try {
      await api.post('/api/safety/block', { blocked_id: profile.id })
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
        <div className="space-y-0">
          <Skeleton className="w-full h-56 rounded-none" />
          <div className="px-4 py-5 space-y-4">
            <Skeleton className="h-7 w-1/2 rounded-lg" />
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
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
  const heroColor = getUserHeroColor(profile.id)

  return (
    <Layout>
      {/* マッチ成立モーダル */}
      <Dialog open={showMatchModal} onOpenChange={setShowMatchModal}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center gap-2 pt-2">
            <Heart className="w-12 h-12 text-hot mx-auto" fill="currentColor" />
            <DialogTitle className="font-display text-2xl">
              マッチしました！
            </DialogTitle>
            <DialogDescription className="text-base text-foreground">
              {profile?.name ?? '相手'}さんとお互いにいいねしました
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
            <Button variant="bold" className="w-full" onClick={() => navigate('/matches')}>
              マッチ一覧でメッセージを送る
            </Button>
            <Button variant="outline-bold" className="w-full" onClick={() => setShowMatchModal(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 通報モーダル */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">通報</DialogTitle>
            <DialogDescription>
              {reportDone ? '通報を受け付けました。ご協力ありがとうございます。' : '通報する理由を選んでください'}
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
                  placeholder="詳しい状況があれば入力してください"
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

      {/* ヒーローエリア */}
      <div
        className="relative w-full pt-16 pb-8 px-6 flex flex-col items-center"
        style={{ backgroundColor: heroColor }}
      >
        {/* 戻るボタン */}
        <button
          type="button"
          onClick={() => isSelf ? navigate(-1) : navigate('/browse')}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white border-2 border-ink flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#0A0A0A] transition-all"
        >
          ←
        </button>

        {/* プレビューモードバッジ */}
        {isSelf && (
          <div className="absolute top-3 right-3">
            <span className="font-mono text-xs font-bold bg-acid border-2 border-ink px-2 py-1">
              PREVIEW MODE
            </span>
          </div>
        )}

        {/* ⋯ メニューボタン（自分以外に表示） */}
        {!isSelf && (
          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline-bold" size="sm" className="w-9 h-9 p-0 flex items-center justify-center">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleHide}>
                  このユーザーを非表示
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock} className="text-destructive focus:text-destructive">
                  ブロックする
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openReportModal} className="text-destructive focus:text-destructive">
                  通報する
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* アバター */}
        <div className="w-32 h-32 rounded-full border-4 border-ink overflow-hidden shadow-[4px_4px_0_0_#0A0A0A] mb-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name ?? 'アバター'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white">
              <User className="w-12 h-12 text-ink/30" />
            </div>
          )}
        </div>

        {/* 名前 */}
        <h1 className="font-display text-4xl text-ink text-center mb-3">
          {profile.name ?? '（未設定）'}
        </h1>

        {/* バッジ群 */}
        <div className="flex flex-wrap gap-2 justify-center">
          {profile.year != null && (
            <span className="font-mono text-xs font-bold border-2 border-ink bg-white px-2.5 py-1 rounded-full">
              {profile.year}年
            </span>
          )}
          {profile.faculty && (
            <span className="font-mono text-xs font-bold border-2 border-ink bg-white px-2.5 py-1 rounded-full">
              {profile.faculty}
            </span>
          )}
          <ActivityBadge lastSeenAt={profile.last_seen_at} showOnlineStatus={profile.show_online_status} />
        </div>
      </div>

      {/* 情報カード */}
      <div className="px-4 py-5 space-y-4 pb-40">

        {/* 写真スライダー */}
        {photos.length > 0 && (
          <div className="card-bold overflow-hidden bg-white">
            <div
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={`flex-none w-full aspect-[4/3] snap-start ${idx < photos.length - 1 ? 'border-r-2 border-ink' : ''}`}
                >
                  {photo.signed_url ? (
                    <img
                      src={photo.signed_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {photos.length > 1 && (
              <div className="flex justify-center gap-1.5 py-2.5">
                {photos.map((photo) => (
                  <div key={photo.id} className="w-1.5 h-1.5 rounded-full bg-ink/30" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 自己紹介 */}
        {profile.bio && (
          <div className="card-bold p-4 bg-white">
            <p className="font-mono text-xs font-bold text-ink/50 mb-2 uppercase tracking-wider">自己紹介</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* 詳細情報 */}
        {(profile.interests.length > 0 || profile.club || profile.hometown || profile.looking_for) && (
          <div className="card-bold p-4 bg-white space-y-3">
            {profile.interests.length > 0 && (
              <div>
                <p className="font-mono text-xs font-bold text-ink/50 mb-2 uppercase tracking-wider">趣味・好きなこと</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map((tag) => (
                    <span key={tag} className="tag-pill">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.club && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-ink/50 w-20 shrink-0">サークル</span>
                <span className="text-sm font-medium">{profile.club}</span>
              </div>
            )}
            {profile.hometown && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-ink/50 w-20 shrink-0">出身地</span>
                <span className="text-sm font-medium">{profile.hometown}</span>
              </div>
            )}
            {profile.looking_for && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-ink/50 w-20 shrink-0">目的</span>
                <span className="tag-pill">{profile.looking_for}</span>
              </div>
            )}
          </div>
        )}

        <p className="font-mono text-xs text-muted-foreground">登録日：{registeredAt}</p>

        {likeError && (
          <Alert variant="destructive">
            <AlertDescription>{likeError}</AlertDescription>
          </Alert>
        )}

        {isSelf && (
          <p className="text-center text-sm text-muted-foreground py-4">
            （自分のプロフィールです）
          </p>
        )}
      </div>

      {/* FABボタン（自分以外に表示） */}
      {!isSelf && (
        <div className="fixed bottom-14 left-0 right-0 z-30 flex justify-center items-center gap-5 py-4 pointer-events-none">
          {/* スキップ */}
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="pointer-events-auto w-14 h-14 rounded-full bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] flex items-center justify-center hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
          >
            <X className="w-6 h-6 text-ink" />
          </button>

          {/* いいね */}
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiked || liking}
            className={`pointer-events-auto w-16 h-16 rounded-full bg-hot border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] text-white flex items-center justify-center transition-all disabled:opacity-60 ${
              !isLiked && !liking
                ? 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A]'
                : ''
            } ${likeAnimation ? 'scale-125' : ''}`}
          >
            {liking ? (
              <span className="text-sm font-bold text-white">...</span>
            ) : (
              <Heart
                className="w-7 h-7 text-white"
                fill={isLiked ? 'currentColor' : 'none'}
              />
            )}
          </button>
        </div>
      )}
    </Layout>
  )
}
