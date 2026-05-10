import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'

interface PendingProfile {
  id: string
  email: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  submitted_at: string
  student_id_image_path: string
}

const MAX_REASON_LENGTH = 500

export default function AdminDashboardPage() {
  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 学生証表示
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  // 承認・却下
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api
      .get<PendingProfile[]>('/api/admin/pending')
      .then((res) => setProfiles(res.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          setError('管理者権限がありません')
        } else {
          setError('データの取得に失敗しました')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const removeProfile = (id: string) =>
    setProfiles((prev) => prev.filter((p) => p.id !== id))

  const handleViewStudentId = async (userId: string) => {
    setSelectedImageUrl(null)
    setImageLoading(true)
    setDialogOpen(true)
    try {
      const res = await api.get<{ signed_url: string }>(`/api/admin/student-id/${userId}`)
      setSelectedImageUrl(res.data.signed_url)
    } catch {
      setSelectedImageUrl(null)
    } finally {
      setImageLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    if (!window.confirm('このユーザーを承認しますか？')) return
    setProcessingId(userId)
    try {
      await api.post(`/api/admin/approve/${userId}`)
      removeProfile(userId)
      showToast('承認しました')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '承認処理に失敗しました'
      alert(msg)
    } finally {
      setProcessingId(null)
    }
  }

  const openRejectDialog = (userId: string) => {
    setRejectTargetId(userId)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!rejectTargetId) return
    setProcessingId(rejectTargetId)
    try {
      await api.post(`/api/admin/reject/${rejectTargetId}`, { reason: rejectReason })
      setRejectDialogOpen(false)
      removeProfile(rejectTargetId)
      showToast('却下しました')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '却下処理に失敗しました'
      alert(msg)
    } finally {
      setProcessingId(null)
      setRejectTargetId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
      <p className="text-muted-foreground">審査待ち: {profiles.length} 件</p>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded shadow-lg text-sm">
          {toast}
        </div>
      )}

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">審査待ちのユーザーはいません</p>
          </CardContent>
        </Card>
      ) : (
        profiles.map((profile) => {
          const isProcessing = processingId === profile.id
          return (
            <Card key={profile.id}>
              <CardHeader>
                <CardTitle className="text-base">{profile.email}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">名前: </span>
                    {profile.name ?? '未設定'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">学年: </span>
                    {profile.year != null ? `${profile.year}年` : '未設定'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">学部: </span>
                    {profile.faculty ?? '未設定'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">提出日時: </span>
                    {new Date(profile.submitted_at).toLocaleString('ja-JP')}
                  </div>
                </div>
                {profile.bio && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">自己紹介: </span>
                    {profile.bio}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleViewStudentId(profile.id)}
                  >
                    学生証を見る
                  </Button>
                  <Button
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleApprove(profile.id)}
                  >
                    {isProcessing ? '処理中...' : '承認'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => openRejectDialog(profile.id)}
                  >
                    {isProcessing ? '処理中...' : '却下'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      {/* 学生証表示 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>学生証</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-40">
            {imageLoading && (
              <p className="text-muted-foreground">読み込み中...</p>
            )}
            {!imageLoading && selectedImageUrl && (
              <img
                src={selectedImageUrl}
                alt="学生証"
                className="max-w-full max-h-96 object-contain rounded"
              />
            )}
            {!imageLoading && !selectedImageUrl && (
              <p className="text-destructive">画像の取得に失敗しました</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 却下理由入力 AlertDialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>却下理由を入力してください</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="例：学生証の画像が不鮮明です"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
              rows={4}
              disabled={processingId === rejectTargetId}
            />
            <p className="text-xs text-muted-foreground text-right">
              {rejectReason.length} / {MAX_REASON_LENGTH}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingId === rejectTargetId}>
              キャンセル
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={rejectReason.trim().length === 0 || processingId === rejectTargetId}
              onClick={handleReject}
            >
              {processingId === rejectTargetId ? '処理中...' : '却下する'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
