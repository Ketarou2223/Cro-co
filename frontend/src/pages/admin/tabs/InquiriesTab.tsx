import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import api from '@/lib/api'
import { useAdminToast } from '../components/AdminToast'
import { Textarea } from '@/components/ui/textarea'

type InquiryStatus = 'unread' | 'read' | 'replied' | 'closed'

interface InquiryItem {
  id: string
  user_id: string
  user_email: string | null
  user_name: string | null
  category: string
  subject: string
  body: string
  status: InquiryStatus
  admin_reply: string | null
  admin_note: string | null
  replied_at: string | null
  created_at: string
}

const CATEGORY_MAP: Record<string, string> = {
  bug: 'バグ報告',
  feature: '機能要望',
  account: 'アカウント相談',
  report: '通報について',
  other: 'その他',
}

const STATUS_CONFIG: Record<InquiryStatus, { label: string; bg: string; fg: string }> = {
  unread:  { label: '未読', bg: '#FF3B6B', fg: '#fff' },
  read:    { label: '既読', bg: '#FFE94D', fg: '#0A0A0A' },
  replied: { label: '返信済み', bg: '#A8F0D1', fg: '#0A0A0A' },
  closed:  { label: 'クローズ', bg: '#F0F0F0', fg: '#595959' },
}

const MAX_REPLY = 2000

export default function InquiriesTab() {
  const toast = useAdminToast()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyNote, setReplyNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['admin-inquiries', statusFilter],
    queryFn: () => {
      const url = statusFilter === 'all'
        ? '/api/admin/inquiries'
        : `/api/admin/inquiries?status=${statusFilter}`
      return api.get<InquiryItem[]>(url).then((r) => r.data)
    },
    staleTime: 30_000,
  })

  const markRead = async (id: string) => {
    await api.patch(`/api/admin/inquiries/${id}`, { status: 'read' }).catch(() => {})
    qc.invalidateQueries({ queryKey: ['admin-inquiries'] })
  }

  const handleExpand = (item: InquiryItem) => {
    if (expandedId === item.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(item.id)
    setReplyText(item.admin_reply ?? '')
    setReplyNote(item.admin_note ?? '')
    if (item.status === 'unread') markRead(item.id)
  }

  const handleReply = async (id: string) => {
    if (!replyText.trim()) {
      toast.show('返信内容を入力してください')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/api/admin/inquiries/${id}/reply`, {
        reply: replyText.trim(),
        note: replyNote.trim() || null,
      })
      await qc.invalidateQueries({ queryKey: ['admin-inquiries'] })
      toast.show('返信しました')
      setExpandedId(null)
    } catch {
      toast.show('返信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (id: string) => {
    try {
      await api.patch(`/api/admin/inquiries/${id}`, { status: 'closed' })
      await qc.invalidateQueries({ queryKey: ['admin-inquiries'] })
      toast.show('クローズしました')
    } catch {
      toast.show('更新に失敗しました')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'unread', 'read', 'replied', 'closed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`font-mono text-[11px] font-bold px-2.5 py-1 border-2 border-ink transition-colors ${
              statusFilter === s ? 'bg-ink text-white' : 'bg-white text-ink'
            }`}
            style={{ borderRadius: 6 }}
          >
            {s === 'all' ? 'すべて' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {isLoading && <p className="font-mono text-sm text-muted">読み込み中...</p>}

      {!isLoading && (inquiries?.length ?? 0) === 0 && (
        <div className="card-bold rounded-[14px] bg-white p-6 text-center">
          <p className="font-mono text-sm text-muted">問い合わせなし</p>
        </div>
      )}

      {inquiries?.map((item) => {
        const sc = STATUS_CONFIG[item.status]
        const isExpanded = expandedId === item.id
        return (
          <div key={item.id} className="card-bold bg-white rounded-[14px] overflow-hidden">
            <button
              type="button"
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => handleExpand(item)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-[10px] font-bold px-2 py-0.5"
                    style={{ background: sc.bg, color: sc.fg, border: '1.5px solid #0A0A0A', borderRadius: 4 }}
                  >
                    {sc.label}
                  </span>
                  <span
                    className="font-mono text-[10px] font-bold px-2 py-0.5 border-2 border-ink bg-white"
                    style={{ borderRadius: 4 }}
                  >
                    {CATEGORY_MAP[item.category] ?? item.category}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted shrink-0">
                  {new Date(item.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <p className="font-bold text-ink text-sm mt-1.5">{item.subject}</p>
              <p className="text-xs text-muted mt-0.5">
                {item.user_name ?? '—'} / {item.user_email ?? '—'}
              </p>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t-2 border-ink/10">
                <div className="mt-3">
                  <p className="font-mono text-[10px] text-muted uppercase mb-1">本文</p>
                  <div className="bg-acid/10 border border-ink/10 rounded-lg p-3 text-sm text-ink whitespace-pre-wrap">
                    {item.body}
                  </div>
                </div>

                {item.admin_reply && (
                  <div>
                    <p className="font-mono text-[10px] text-muted uppercase mb-1">返信済み内容</p>
                    <div className="bg-mint/30 border border-ink/10 rounded-lg p-3 text-sm text-ink whitespace-pre-wrap">
                      {item.admin_reply}
                    </div>
                    {item.replied_at && (
                      <p className="font-mono text-[9px] text-muted mt-1">
                        {new Date(item.replied_at).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                )}

                {item.status !== 'closed' && (
                  <div className="space-y-2">
                    <div>
                      <label className="font-mono text-[10px] text-muted uppercase block mb-1">
                        返信内容（ユーザーに届く）
                      </label>
                      <Textarea
                        placeholder="返信内容を入力..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value.slice(0, MAX_REPLY))}
                        rows={4}
                        disabled={submitting}
                        className="border-2 border-ink p-3 w-full focus-visible:ring-0 resize-none text-sm"
                      />
                      <p className="font-mono text-[9px] text-muted text-right mt-0.5">
                        {replyText.length} / {MAX_REPLY}
                      </p>
                    </div>
                    <div>
                      <label className="font-mono text-[10px] text-muted uppercase block mb-1">
                        内部メモ（ユーザーには見えない）
                      </label>
                      <Textarea
                        placeholder="内部メモ..."
                        value={replyNote}
                        onChange={(e) => setReplyNote(e.target.value.slice(0, 500))}
                        rows={2}
                        disabled={submitting}
                        className="border-2 border-ink p-3 w-full focus-visible:ring-0 resize-none text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={submitting || !replyText.trim()}
                        onClick={() => handleReply(item.id)}
                        className="font-mono text-[11px] font-bold px-3 py-1.5 border-2 border-ink bg-ink text-white disabled:opacity-50"
                        style={{ borderRadius: 6, boxShadow: '3px 3px 0 0 #0A0A0A' }}
                      >
                        <MessageSquare className="inline w-3 h-3 mr-1" />
                        {submitting ? '送信中...' : '返信する'}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleClose(item.id)}
                        className="font-mono text-[11px] font-bold px-3 py-1.5 border-2 border-ink bg-white text-muted disabled:opacity-50"
                        style={{ borderRadius: 6 }}
                      >
                        クローズ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
