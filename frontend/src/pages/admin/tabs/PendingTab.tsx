// 解説: このファイルは管理ダッシュボードの「学生証審査」タブを定義する。
// 解説: 機能: 審査待ちユーザー一覧 → 学生証画像を拡大表示 → 承認（POST /api/admin/users/:id/approve）または却下（POST /api/admin/users/:id/reject）
// 解説: 却下時は rejection_reason をテキストエリアで入力してから送信する
// 解説: BanDialog コンポーネントも呼び出すことができる（PendingTab からその場で BAN 可能）
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'
import { useAdminToast } from '../components/AdminToast'

interface PendingProfile {
  id: string
  email: string
  name: string | null
  real_name: string | null
  student_number: string | null
  birth_date: string | null
  year: number | null
  faculty: string | null
  department: string | null
  bio: string | null
  submitted_at: string
  student_id_image_path: string
  admission_year: number | null
  identity_verified: boolean
}

const REJECT_REASONS = [
  '学生証の画像が鮮明でない',
  '学生証の有効期限が切れている',
  '対象大学の学生証ではない',
  '入力情報と学生証の照合が取れない',
  'その他',
] as const
type RejectReason = (typeof REJECT_REASONS)[number]

const MAX_REASON_LENGTH = 500

export default function PendingTab() {
  const { show } = useAdminToast()
  const qc = useQueryClient()

  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [selectedIdDetail, setSelectedIdDetail] = useState<{
    real_name: string | null
    student_number: string | null
    birth_date: string | null
    faculty: string | null
    department: string | null
    admission_year: number | null
  } | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReasonSelect, setRejectReasonSelect] = useState<RejectReason>('学生証の画像が鮮明でない')
  const [rejectReasonCustom, setRejectReasonCustom] = useState('')

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

  const removeProfile = (id: string) => setProfiles((prev) => prev.filter((p) => p.id !== id))

  const handleViewStudentId = async (userId: string) => {
    setSelectedImageUrl(null)
    setSelectedIdDetail(null)
    setImageLoading(true)
    setDialogOpen(true)
    const profile = profiles.find((p) => p.id === userId)
    try {
      const res = await api.get<{
        signed_url: string
        faculty: string | null
        department: string | null
        admission_year: number | null
      }>(`/api/admin/student-id/${userId}`)
      setSelectedImageUrl(res.data.signed_url)
      setSelectedIdDetail({
        real_name: profile?.real_name ?? null,
        student_number: profile?.student_number ?? null,
        birth_date: profile?.birth_date ?? null,
        faculty: res.data.faculty,
        department: res.data.department,
        admission_year: res.data.admission_year,
      })
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
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      show('承認しました')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '承認処理に失敗しました'
      show(msg)
    } finally {
      setProcessingId(null)
    }
  }

  const openRejectDialog = (userId: string) => {
    setRejectTargetId(userId)
    setRejectReasonSelect('学生証の画像が鮮明でない')
    setRejectReasonCustom('')
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!rejectTargetId) return
    const finalReason =
      rejectReasonSelect === 'その他' ? rejectReasonCustom.trim() : rejectReasonSelect
    setProcessingId(rejectTargetId)
    try {
      await api.post(`/api/admin/reject/${rejectTargetId}`, { reason: finalReason })
      setRejectDialogOpen(false)
      removeProfile(rejectTargetId)
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      show('却下しました')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '却下処理に失敗しました'
      show(msg)
    } finally {
      setProcessingId(null)
      setRejectTargetId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted, #888)' }}>読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return <p className="text-hot font-bold">{error}</p>
  }

  return (
    <>
      <div className="space-y-4">
        {profiles.length === 0 ? (
          <div className="card-bold rounded-[18px] bg-white p-6 text-center">
            <p className="font-mono text-sm" style={{ color: 'var(--color-muted, #888)' }}>
              審査待ちのユーザーはいない。
            </p>
          </div>
        ) : (
          profiles.map((profile) => {
            const isProcessing = processingId === profile.id
            return (
              <div key={profile.id} className="card-bold bg-white rounded-[18px] p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink">{profile.email}</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--color-muted, #888)' }}>
                      提出: {new Date(profile.submitted_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2 bg-white border-2 border-ink rounded-lg p-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-ink/50 uppercase">表示名</span>
                      <p className="font-bold text-ink text-base mt-0.5">{profile.name ?? '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-ink/50 uppercase">学年</span>
                      <p className="font-bold text-ink text-base mt-0.5">
                        {profile.year != null ? `${profile.year}年` : '未設定'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-brand border-2 border-ink rounded-lg p-3" style={{ boxShadow: '2px 2px 0 0 #0A0A0A' }}>
                    <div className="col-span-2 pb-1 mb-1 border-b-2 border-ink">
                      <span className="text-xs font-mono font-bold text-ink uppercase tracking-wide">
                        本人確認情報 — 学生証と照合
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-ink/60 uppercase">本名</span>
                      <p className="font-bold text-ink text-base mt-0.5">{profile.real_name ?? '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-ink/60 uppercase">学籍番号</span>
                      <p className="font-bold text-ink text-base font-mono mt-0.5">{profile.student_number ?? '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-ink/60 uppercase">生年月日</span>
                      <p className="font-bold text-ink text-base mt-0.5">{profile.birth_date ?? '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-ink/60 uppercase">学部</span>
                      <p className="font-bold text-ink text-base mt-0.5">{profile.faculty ?? '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-ink/60 uppercase">学科</span>
                      <p className="font-bold text-ink text-base mt-0.5">{profile.department ?? '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-ink/60 uppercase">入学年度</span>
                      <p className="font-bold text-ink text-base mt-0.5">
                        {profile.admission_year != null ? `${profile.admission_year}年` : '未設定'}
                      </p>
                    </div>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-sm text-ink/70 border-l-2 border-ink pl-3">{profile.bio}</p>
                )}

                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button
                    variant="outline-bold"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleViewStudentId(profile.id)}
                  >
                    学生証を見る
                  </Button>
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleApprove(profile.id)}
                  >
                    {isProcessing ? '処理中...' : '✓ 承認（学生証照合済み）'}
                  </Button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => openRejectDialog(profile.id)}
                    className="inline-flex items-center justify-center h-7 gap-1 rounded-lg border-2 border-hot text-hot bg-white font-bold text-sm px-2.5 shadow-[4px_4px_0_0_#FF3B6B] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#FF3B6B] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#FF3B6B] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isProcessing ? '処理中...' : '✕ 却下'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 学生証表示 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">学生証 照合</DialogTitle>
          </DialogHeader>
          {imageLoading ? (
            <div className="flex items-center justify-center min-h-40">
              <p className="font-mono text-sm" style={{ color: 'var(--color-muted, #888)' }}>読み込み中...</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 flex items-center justify-center min-h-40 min-w-0">
                {selectedImageUrl ? (
                  <a href={selectedImageUrl} target="_blank" rel="noopener noreferrer" title="クリックで原寸表示">
                    <img
                      src={selectedImageUrl}
                      alt="学生証"
                      className="max-w-full max-h-[75vh] w-full object-contain rounded-lg border-2 border-ink cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <p className="text-hot font-bold text-sm">画像の取得に失敗しました</p>
                )}
              </div>
              {selectedIdDetail && (
                <div className="sm:w-72 space-y-3 bg-brand border-2 border-ink rounded-[14px] p-4 shrink-0" style={{ boxShadow: '3px 3px 0 0 #0A0A0A' }}>
                  <p className="font-mono text-xs font-bold text-ink uppercase tracking-wide border-b-2 border-ink pb-2">申告内容（照合）</p>
                  <div className="space-y-3">
                    <div>
                      <p className="font-mono text-xs font-bold uppercase text-ink/60">本名</p>
                      <p className="text-lg font-bold text-ink mt-0.5">{selectedIdDetail.real_name ?? '未設定'}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold uppercase text-ink/60">学籍番号</p>
                      <p className="text-lg font-bold font-mono text-ink mt-0.5">{selectedIdDetail.student_number ?? '未設定'}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold uppercase text-ink/60">生年月日</p>
                      <p className="text-lg font-bold text-ink mt-0.5">{selectedIdDetail.birth_date ?? '未設定'}</p>
                    </div>
                    <div className="border-t border-ink/20 pt-3">
                      <p className="font-mono text-xs font-bold uppercase text-ink/60">学部</p>
                      <p className="text-base font-bold text-ink mt-0.5">{selectedIdDetail.faculty ?? '未設定'}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold uppercase text-ink/60">学科</p>
                      <p className="text-base font-bold text-ink mt-0.5">{selectedIdDetail.department ?? '未設定'}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold uppercase text-ink/60">入学年度</p>
                      <p className="text-base font-bold text-ink mt-0.5">
                        {selectedIdDetail.admission_year != null
                          ? `${selectedIdDetail.admission_year}年`
                          : '未設定'}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-xs font-bold text-ink/70 border-t-2 border-ink pt-2">
                    写真と照合して承認してください
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 却下理由入力 Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
          <DialogPrimitive.Content
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-white shadow-[4px_4px_0_0_#0A0A0A] rounded-[18px] p-6 space-y-4 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 outline-none"
          >
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-ink">却下理由を入力</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                {REJECT_REASONS.map((reason) => (
                  <label key={reason} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reject-reason"
                      value={reason}
                      checked={rejectReasonSelect === reason}
                      onChange={() => setRejectReasonSelect(reason)}
                      disabled={processingId === rejectTargetId}
                      className="accent-hot w-4 h-4"
                    />
                    <span className="text-sm font-medium text-ink">{reason}</span>
                  </label>
                ))}
              </div>
              {rejectReasonSelect === 'その他' && (
                <div>
                  <Textarea
                    placeholder="理由を入力してください"
                    value={rejectReasonCustom}
                    onChange={(e) =>
                      setRejectReasonCustom(e.target.value.slice(0, MAX_REASON_LENGTH))
                    }
                    rows={3}
                    disabled={processingId === rejectTargetId}
                    className="border-2 border-ink p-3 w-full focus-visible:ring-0 resize-none"
                  />
                  <p className="text-xs font-mono text-right mt-1" style={{ color: 'var(--color-subtle, #aaa)' }}>
                    {rejectReasonCustom.length} / {MAX_REASON_LENGTH}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline-bold"
                disabled={processingId === rejectTargetId}
                onClick={() => setRejectDialogOpen(false)}
              >
                キャンセル
              </Button>
              <button
                type="button"
                disabled={
                  (rejectReasonSelect === 'その他' && !rejectReasonCustom.trim()) ||
                  processingId === rejectTargetId
                }
                onClick={handleReject}
                className="inline-flex items-center justify-center h-9 gap-1 rounded-lg border-2 border-ink bg-hot text-white font-bold text-sm px-4 shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {processingId === rejectTargetId ? '処理中...' : '却下する'}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  )
}
