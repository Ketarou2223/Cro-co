import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import Layout from '@/components/Layout'
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
}

const REPORT_REASONS = ['不適切な写真', 'ハラスメント', 'なりすまし', 'スパム', 'その他'] as const
type ReportReason = (typeof REPORT_REASONS)[number]

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profile, setProfile] = useState<ProfileDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [likeError, setLikeError] = useState<string | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [likeAnimation, setLikeAnimation] = useState(false)

  // 通報モーダル
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('不適切な写真')
  const [reportDetail, setReportDetail] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  const isSelf = user?.id === id

  useEffect(() => {
    if (!id) return
    api
      .get<ProfileDetail>(`/api/profiles/${id}`)
      .then((res) => {
        setProfile(res.data)
        setIsLiked(res.data.is_liked)
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true)
        } else {
          setError('プロフィールの取得に失敗しました')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

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
          <Skeleton className="w-full aspect-[4/3] rounded-none" />
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
          <div className="text-5xl">🔍</div>
          <p className="text-lg font-medium">ユーザーが見つかりません</p>
          <Button variant="outline" onClick={() => navigate('/browse')}>
            ← 一覧に戻る
          </Button>
        </div>
      </Layout>
    )
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="p-4 space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error ?? '予期しないエラーが発生しました'}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => navigate('/browse')}>
            ← 一覧に戻る
          </Button>
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

  return (
    <Layout>
      {/* マッチ成立モーダル */}
      <Dialog open={showMatchModal} onOpenChange={setShowMatchModal}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center gap-2 pt-2">
            <div className="text-5xl">🎉</div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-rose-500 bg-clip-text text-transparent">
              マッチしました！
            </DialogTitle>
            <DialogDescription className="text-base text-foreground">
              {profile?.name ?? '相手'}さんとお互いにいいねしました
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
            <Button className="w-full" onClick={() => navigate('/matches')}>
              マッチ一覧でメッセージを送る
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowMatchModal(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 通報モーダル */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>通報</DialogTitle>
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
                />
                <p className="text-xs text-muted-foreground text-right">{reportDetail.length} / 500</p>
              </div>
              <Button className="w-full" onClick={handleReport} disabled={reporting}>
                {reporting ? '送信中...' : '通報する'}
              </Button>
            </div>
          ) : (
            <DialogFooter>
              <Button className="w-full" onClick={() => setReportOpen(false)}>
                閉じる
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ヒーロー画像エリア */}
      <div className="relative w-full">
        {photos.length > 1 ? (
          /* 複数写真: 横スクロールスライダー */
          <div
            className="flex overflow-x-auto snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex-none w-full aspect-[4/3] bg-muted snap-start"
              >
                {photo.signed_url && (
                  <img
                    src={photo.signed_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          /* 1枚 or なし: 従来のアバター表示 */
          <div className="w-full aspect-[4/3] bg-muted">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name ?? 'アバター'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl text-muted-foreground">
                👤
              </div>
            )}
          </div>
        )}

        {/* 戻るボタン */}
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center text-sm font-bold hover:bg-black/60 transition-colors"
        >
          ←
        </button>

        {/* ⋯ メニューボタン（自分以外に表示） */}
        {!isSelf && (
          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center text-base font-bold hover:bg-black/60 transition-colors"
                >
                  ⋯
                </button>
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

        {/* 複数写真インジケーター */}
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {photos.map((photo) => (
              <div key={photo.id} className="w-1.5 h-1.5 rounded-full bg-white/70" />
            ))}
          </div>
        )}
      </div>

      {/* 情報カード */}
      <div className="px-4 py-5 space-y-4 pb-40">
        <div>
          <h1 className="text-2xl font-bold">{profile.name ?? '（未設定）'}</h1>
          {(profile.year != null || profile.faculty) && (
            <p className="text-muted-foreground mt-1">
              {[
                profile.year != null ? `${profile.year}年` : null,
                profile.faculty,
              ]
                .filter(Boolean)
                .join('・')}
            </p>
          )}
        </div>

        {profile.bio && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-1.5">自己紹介</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* 追加情報カード */}
        {(profile.interests.length > 0 || profile.club || profile.hometown || profile.looking_for) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {profile.interests.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1.5">趣味・好きなこと</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.club && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">サークル</span>
                <span className="text-sm">{profile.club}</span>
              </div>
            )}
            {profile.hometown && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">出身地</span>
                <span className="text-sm">{profile.hometown}</span>
              </div>
            )}
            {profile.looking_for && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">目的</span>
                <span className="inline-block bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                  {profile.looking_for}
                </span>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">登録日：{registeredAt}</p>

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
            className="pointer-events-auto w-14 h-14 rounded-full bg-white border-2 border-border shadow-lg text-2xl flex items-center justify-center hover:bg-muted/50 active:scale-95 transition-transform"
          >
            ✕
          </button>

          {/* いいね */}
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiked || liking}
            className={`pointer-events-auto w-16 h-16 rounded-full shadow-lg text-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-60 ${
              isLiked
                ? 'bg-rose-400 text-white scale-100'
                : 'bg-rose-500 text-white hover:bg-rose-600'
            } ${likeAnimation ? 'scale-125' : ''}`}
          >
            {liking ? '...' : isLiked ? '♥' : '♡'}
          </button>
        </div>
      )}
    </Layout>
  )
}
