import { useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string | null
  mode: 'ban' | 'unban'
  onSuccess: () => void
}

const BAN_REASONS = [
  '通報による違反行為（複数回）',
  '不適切なメッセージ送信',
  '虚偽プロフィール',
  '営業・スパム行為',
  '規約違反',
  'その他',
] as const

const MAX = 500

export default function BanDialog({ open, onOpenChange, userId, userName, mode, onSuccess }: Props) {
  const [reasonSelect, setReasonSelect] = useState<string>(BAN_REASONS[0])
  const [reasonCustom, setReasonCustom] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      if (mode === 'ban') {
        const finalReason = reasonSelect === 'その他' ? reasonCustom.trim() : reasonSelect
        if (!finalReason) {
          setError('理由を入力してください')
          setLoading(false)
          return
        }
        await api.post(`/api/admin/users/${userId}/ban`, { reason: finalReason })
      } else {
        await api.post(`/api/admin/users/${userId}/unban`, { note: note.trim() || null })
      }
      onSuccess()
      onOpenChange(false)
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        '処理に失敗しました'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60" />
        <DialogPrimitive.Content
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-white shadow-[4px_4px_0_0_#0A0A0A] rounded-[18px] p-6 space-y-4 outline-none"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-ink">
              {mode === 'ban' ? 'ユーザーをBAN' : 'BAN解除'}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-ink/70">
            対象: <span className="font-bold">{userName ?? '（名前未設定）'}</span>
          </p>

          {mode === 'ban' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                {BAN_REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ban-reason"
                      value={r}
                      checked={reasonSelect === r}
                      onChange={() => setReasonSelect(r)}
                      disabled={loading}
                      className="accent-hot w-4 h-4"
                    />
                    <span className="text-sm font-medium text-ink">{r}</span>
                  </label>
                ))}
              </div>
              {reasonSelect === 'その他' && (
                <div>
                  <Textarea
                    placeholder="理由を入力"
                    value={reasonCustom}
                    onChange={(e) => setReasonCustom(e.target.value.slice(0, MAX))}
                    rows={3}
                    disabled={loading}
                    className="border-2 border-ink p-3 w-full focus-visible:ring-0 resize-none"
                  />
                  <p className="text-xs font-mono text-right mt-1" style={{ color: 'var(--color-subtle, #aaa)' }}>
                    {reasonCustom.length} / {MAX}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="font-mono text-xs block mb-1" style={{ color: 'var(--color-muted, #888)' }}>
                解除メモ（任意）
              </label>
              <Textarea
                placeholder="解除理由・経緯など"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, MAX))}
                rows={3}
                disabled={loading}
                className="border-2 border-ink p-3 w-full focus-visible:ring-0 resize-none"
              />
            </div>
          )}

          {error && <p className="text-hot text-sm font-bold">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="outline-bold" disabled={loading} onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="inline-flex items-center justify-center h-9 gap-1 rounded-lg border-2 border-ink font-bold text-sm px-4 transition-all disabled:opacity-50"
              style={{
                background: mode === 'ban' ? '#FF3B6B' : '#A8F0D1',
                color: mode === 'ban' ? '#FFFFFF' : '#0A0A0A',
                boxShadow: '4px 4px 0 0 #0A0A0A',
              }}
            >
              {loading ? '処理中...' : mode === 'ban' ? 'BANする' : 'BAN解除する'}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
