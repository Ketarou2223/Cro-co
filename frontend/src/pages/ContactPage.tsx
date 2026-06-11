import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, MessageSquare, Send } from 'lucide-react'
import Layout from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/contexts/ToastContext'
import api from '@/lib/api'

type InquiryCategory = 'bug' | 'feature' | 'account' | 'report' | 'other'

type InquiryStatus = 'unread' | 'read' | 'replied' | 'closed'

interface InquiryUserItem {
  id: string
  category: InquiryCategory
  subject: string
  body: string
  status: InquiryStatus
  admin_reply: string | null
  replied_at: string | null
  created_at: string
}

const CATEGORY_OPTIONS: { value: InquiryCategory; label: string; description: string }[] = [
  { value: 'bug', label: 'バグ報告', description: '動作不良・表示崩れ' },
  { value: 'feature', label: '機能要望', description: '「こうなったら嬉しい」を教えてください。' },
  { value: 'account', label: 'アカウント相談', description: 'ログイン・退会・審査について' },
  { value: 'report', label: '通報について', description: '通報した件のフォローアップ' },
  { value: 'other', label: 'その他', description: '上のどれにも当てはまらない' },
]

const CATEGORY_LABEL: Record<InquiryCategory, string> = {
  bug: 'バグ報告',
  feature: '機能要望',
  account: 'アカウント相談',
  report: '通報について',
  other: 'その他',
}

const STATUS_LABEL: Record<InquiryStatus, string> = {
  unread: '未読',
  read: '確認中',
  replied: '返信あり',
  closed: '対応終了',
}

const MAX_SUBJECT = 100
const MAX_BODY = 2000

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function ContactPage() {
  usePageTitle('お問い合わせ')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [category, setCategory] = useState<InquiryCategory | ''>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const { data: history = [], isLoading: historyLoading, isError: historyError } = useQuery({
    queryKey: ['inquiries-me'],
    queryFn: () => api.get<InquiryUserItem[]>('/api/inquiries/me').then((r) => r.data),
    staleTime: 30_000,
  })

  const submit = useMutation({
    mutationFn: () =>
      api.post<InquiryUserItem>('/api/inquiries/', {
        category,
        subject: subject.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries-me'] })
      setCategory('')
      setSubject('')
      setBody('')
      showToast('送信しました')
      navigate(-1)
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        showToast('もう少し時間をおいてからお試しください。')
        return
      }
      showToast('うまくいきませんでした。もう一度お試しください。')
    },
  })

  const canSubmit =
    !submit.isPending &&
    category !== '' &&
    subject.trim().length > 0 &&
    subject.length <= MAX_SUBJECT &&
    body.trim().length > 0 &&
    body.length <= MAX_BODY

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    submit.mutate()
  }

  return (
    <Layout>
      <div className="px-4 pt-5 pb-10 space-y-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 font-mono text-sm font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>

        <div className="space-y-1">
          <h1
            className="font-display text-3xl text-ink"
            style={{ fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 }}
          >
            お問い合わせ
          </h1>
          <p className="font-mono text-xs text-muted leading-relaxed">
            バグ報告・要望・相談はこちらから。1時間に5件まで送信できます。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-bold bg-white p-4 space-y-5">
          <div className="space-y-2">
            <p className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-flex uppercase tracking-wide">
              カテゴリ
            </p>
            <div className="space-y-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="inquiry-category"
                    value={opt.value}
                    checked={category === opt.value}
                    onChange={() => setCategory(opt.value)}
                    disabled={submit.isPending}
                    className="mt-0.5 accent-ink"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink leading-tight">{opt.label}</p>
                    <p className="font-mono text-[11px] text-muted">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="inquiry-subject" className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-flex uppercase tracking-wide">
                件名
              </label>
              <span className="font-mono text-[10px] text-muted">
                {subject.length}/{MAX_SUBJECT}
              </span>
            </div>
            <input
              id="inquiry-subject"
              type="text"
              value={subject}
              maxLength={MAX_SUBJECT}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submit.isPending}
              placeholder="例: マッチ画面で写真が表示されない"
              className="w-full border-2 border-ink rounded-lg px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] transition-shadow"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="inquiry-body" className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-flex uppercase tracking-wide">
                本文
              </label>
              <span className="font-mono text-[10px] text-muted">
                {body.length}/{MAX_BODY}
              </span>
            </div>
            <Textarea
              id="inquiry-body"
              value={body}
              maxLength={MAX_BODY}
              onChange={(e) => setBody(e.target.value)}
              disabled={submit.isPending}
              rows={8}
              placeholder="どんな状況で何が起きたか、できるだけ詳しく書いてください。"
              className="border-2 border-ink p-3 text-sm focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A] resize-none"
            />
          </div>

          <Button
            type="submit"
            variant="bold"
            className="w-full h-10 gap-2"
            disabled={!canSubmit}
          >
            <Send className="w-4 h-4" />
            {submit.isPending ? '送信中...' : '送信する'}
          </Button>
        </form>

        <div className="space-y-3">
          <h2 className="font-display text-xl text-ink" style={{ fontWeight: 900 }}>
            これまでの問い合わせ
          </h2>

          {historyLoading ? (
            <p className="font-mono text-sm text-muted">読み込んでいます。少しお待ちください。</p>
          ) : historyError ? (
            <p className="font-mono text-sm text-muted">うまくいきませんでした。もう一度お試しください。</p>
          ) : history.length === 0 ? (
            <div className="card-bold bg-white p-6 flex flex-col items-center gap-2">
              <MessageSquare className="w-10 h-10 text-ink/20" />
              <p className="font-mono text-sm text-muted">まだ問い合わせはありません。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <article key={item.id} className="card-bold bg-white p-4 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-mono text-[10px] font-bold px-2 py-0.5 border-2 border-ink bg-white"
                      style={{ borderRadius: 4 }}
                    >
                      {CATEGORY_LABEL[item.category]}
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold px-2 py-0.5 border-2 border-ink"
                      style={{
                        background: item.status === 'replied' ? 'var(--color-success)' : 'var(--color-bone)',
                        color: '#0A0A0A',
                        borderRadius: 4,
                      }}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                    <span className="font-mono text-[10px] text-muted ml-auto">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-ink">{item.subject}</p>
                  <p className="text-xs text-ink whitespace-pre-wrap break-words leading-relaxed">
                    {item.body}
                  </p>
                  {item.admin_reply && (
                    <div
                      className="mt-2 p-3 border-2 border-ink rounded-lg space-y-1"
                      style={{ background: 'var(--color-bone)' }}
                    >
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
                        運営からの返信
                      </p>
                      <p className="text-xs text-ink whitespace-pre-wrap break-words leading-relaxed">
                        {item.admin_reply}
                      </p>
                      {item.replied_at && (
                        <p className="font-mono text-[10px] text-muted">
                          {formatDateTime(item.replied_at)}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
