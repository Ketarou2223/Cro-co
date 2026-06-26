// 解説: このファイルは管理ダッシュボードの「写真審査」タブを定義する。
// 解説: 機能: status=pending のユーザー写真一覧 → 承認（POST /api/admin/photos/:id/approve）または却下（POST /api/admin/photos/:id/reject）
// 解説: 写真審査は学生証審査とは独立したフロー（プロフィール写真はあとからでも審査できる）
// 解説: 却下すると写真は非表示になりユーザーに通知される（プッシュ通知経由）
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, User } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useAdminToast } from '../components/AdminToast'
import type { PendingPhoto } from '../types'

export default function PhotoReviewTab() {
  const queryClient = useQueryClient()
  const { show } = useAdminToast()
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  const { data: photos = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-pending-photos'],
    queryFn: () => api.get<PendingPhoto[]>('/api/admin/photos/pending').then((r) => r.data),
    staleTime: 30_000,
  })

  const handleAction = async (photoId: string, action: 'approve' | 'reject') => {
    if (processing.has(photoId)) return
    setProcessing((prev) => new Set(prev).add(photoId))
    try {
      await api.post(`/api/admin/photos/${photoId}/${action}`)
      show(action === 'approve' ? '写真を承認した。' : '写真を却下した。')
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['admin-pending-photos-count'] })
    } catch {
      show('うまくいきませんでした。もう一度お試しください。')
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(photoId)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 py-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-ink/5 rounded-xl animate-pulse border-2 border-ink/10" />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="font-mono text-xs text-muted uppercase tracking-widest">PHOTO REVIEW</p>
        <p className="font-display text-2xl text-ink">審査待ち写真なし。</p>
        <p className="text-sm text-muted">いい感じじゃないですか。</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 uppercase tracking-wide">
          写真審査
        </h2>
        <span className="font-mono text-xs text-muted">{photos.length}件 待機中</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {photos.map((photo) => {
          const isProcessing = processing.has(photo.id)
          return (
            <div
              key={photo.id}
              className="border-2 border-ink rounded-xl overflow-hidden"
              style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
            >
              <div className="relative w-full aspect-square bg-ink/5">
                <img
                  src={photo.photo_url}
                  alt="審査中の写真"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="p-3 bg-white space-y-2">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted" />
                  <span className="text-sm font-bold text-ink truncate">
                    {photo.user_name ?? '名前未設定'}
                  </span>
                  <span className="ml-auto font-mono text-[13px] text-muted">
                    {new Date(photo.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="bold"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-9"
                    style={{ background: 'var(--color-success)', color: '#0A0A0A', borderColor: '#0A0A0A' }}
                    disabled={isProcessing}
                    onClick={() => handleAction(photo.id, 'approve')}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    承認
                  </Button>
                  <Button
                    variant="outline-bold"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-9"
                    style={{ borderColor: '#FF3B6B', color: '#FF3B6B' }}
                    disabled={isProcessing}
                    onClick={() => handleAction(photo.id, 'reject')}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    却下
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
