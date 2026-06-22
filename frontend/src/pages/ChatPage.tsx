// 解説: このファイルはチャットページを定義する。
// 解説: useChat フック = WebSocket 接続 + メッセージ履歴取得 + タイピング状態通知を一括管理する
// 解説: react-virtuoso = 大量メッセージを仮想化（DOM に描画するのは画面内のみ）して高速化する
// 解説: tempMsg = 送信ボタン押下直後に id が "temp-" で始まる仮メッセージを楽観的に追加。API 成功後に WebSocket から本物が届く
// 解説: readReceiptMsgId = lastReadAt（相手の最終既読タイムスタンプ）以前の自分メッセージのうち最後の1件のID。そのメッセージにのみ「既読」を表示（LINE方式）
// 解説: ブロック・非表示・通報は安全機能。ブロックは取り消し不可（CLAUDE.md §9 参照）
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Heart, Send, User } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import type { VirtuosoHandle } from 'react-virtuoso'
import ErrorState from '@/components/ErrorState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useChat } from '@/hooks/useChat'
import type { MessageResponse } from '@/hooks/useChat'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

interface MatchedUserItem {
  match_id: string
  user_id: string
  name: string | null
  year: number | null
  faculty: string | null
  bio: string | null
  avatar_url: string | null
  matched_at: string
  is_deleted?: boolean
}

// @copy CRO-label-chat-report-reasons-01〜05 Lv0
const REPORT_REASONS = ['不適切な写真', 'ハラスメント', 'なりすまし', 'スパム', 'その他'] as const
type ReportReason = (typeof REPORT_REASONS)[number]

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

const formatTime = (dateStr: string) =>
  new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))

const formatDateLabel = (dateStr: string) =>
  new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric' }).format(new Date(dateStr))

const isSameDay = (a: string, b: string) => {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

function TypingDots() {
  return (
    <div className="flex items-center gap-0.5 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-ink/40"
          style={{ animation: `dot-flash 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes dot-flash {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: MessageResponse
  index: number
  messages: MessageResponse[]
  isMine: boolean
  rxn: { count: number; my_reaction: boolean }
  isTemp: boolean
  isRead: boolean
  matchInfo: MatchedUserItem | undefined
  currentUserId: string | undefined
  onLongPressStart: (msg: MessageResponse) => void
  onLongPressEnd: () => void
  onContextMenu: (msg: MessageResponse) => void
  onReact: (msgId: string) => void
}

// 解説: MessageBubble = React.memo でラップ（メッセージ一覧が長い場合に不要な再レンダリングを防ぐ）
const MessageBubble = memo(function MessageBubble({
  msg,
  index,
  messages,
  isMine,
  rxn,
  isTemp,
  isRead: read,
  onLongPressStart,
  onLongPressEnd,
  onContextMenu,
  onReact,
}: MessageBubbleProps) {
  const showDate = index === 0 || !isSameDay(msg.created_at, messages[index - 1].created_at)

  return (
    <div className="px-4">
      {showDate && (
        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 h-px bg-ink/20" />
          <span className="font-mono text-xs text-subtle shrink-0">{formatDateLabel(msg.created_at)}</span>
          <div className="flex-1 h-px bg-ink/20" />
        </div>
      )}

      <div className={`flex flex-col gap-0.5 py-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-[75%] text-sm border-2 border-ink select-none ${
            isMine
              ? 'bg-ink text-white shadow-[2px_2px_0_0_rgba(10,10,10,0.3)]'
              : 'bg-white text-ink shadow-[2px_2px_0_0_#0A0A0A]'
          } ${isTemp ? 'opacity-60' : ''}`}
          style={{
            borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            overflow: 'hidden',
          }}
          onTouchStart={() => onLongPressStart(msg)}
          onTouchEnd={onLongPressEnd}
          onTouchMove={onLongPressEnd}
          onContextMenu={(e) => { e.preventDefault(); onContextMenu(msg) }}
        >
          {msg.reply_to_id && (
            <div
              className="border-l-4 px-3 py-2 text-xs"
              style={{
                borderColor: isMine ? 'rgba(255,255,255,0.35)' : 'rgba(10,10,10,0.2)',
                background: isMine ? 'rgba(255,255,255,0.1)' : 'rgba(10,10,10,0.05)',
                color: isMine ? 'rgba(255,255,255,0.7)' : 'rgba(10,10,10,0.6)',
              }}
            >
              <span className="font-bold">{msg.reply_to_sender_name ?? '相手'}</span>
              {': '}
              {msg.reply_to_content ? (
                msg.reply_to_content.length >= 50
                  ? `${msg.reply_to_content}...`
                  : msg.reply_to_content
              ) : '（メッセージ）'}
            </div>
          )}

          <div className="px-4 py-2.5 whitespace-pre-wrap break-words leading-relaxed">
            {msg.content}
          </div>
        </div>

        {rxn.count > 0 && (
          <button
            type="button"
            onClick={() => onReact(msg.id)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-ink/20 bg-white shadow-sm"
          >
            <Heart
              className="w-3 h-3"
              style={{ color: 'var(--color-like)' }}
              fill={rxn.my_reaction ? 'var(--color-like)' : 'none'}
            />
            <span className="font-mono text-[10px] text-muted">{rxn.count}</span>
          </button>
        )}

        <div className="flex items-center gap-1 px-1">
          <span className="font-mono text-[10px] text-subtle">{formatTime(msg.created_at)}</span>
          {/* 送信中 or 既読（最後の既読メッセージにのみ表示・LINE方式） */}
          {isMine && (isTemp || read) && (
            <span className={`font-mono text-[10px] ${isTemp ? 'text-ink/40' : 'text-success'}`}>
              {isTemp ? '送信中…' : '既読'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

// ─── ChatPage ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: myProfileData } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get<{ status: string; student_id_submitted: boolean }>('/api/profile/me').then(r => r.data),
    retry: false,
  })
  const canChat = myProfileData?.status === 'approved'

  const {
    messages,
    setMessages,
    connected,
    isLoading: messagesLoading,
    typingUserId,
    lastReadAt,
    sendTypingStatus,
    hasMore,
    loadMore,
    loadingMore,
  } = useChat(matchId ?? '', user?.id)

  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<MessageResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [blocking, setBlocking] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blockConfirmError, setBlockConfirmError] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('不適切な写真')
  const [reportDetail, setReportDetail] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState(false)
  // @copy CRO-empty-chat-01〜03 Lv1 — 保留: 「送ってみましょう」は「〜しよう」禁止類似・オーナー確認待ち
  const [emptyChatTitle] = useState(() =>
    pickRandom([
      'まだメッセージはありません。最初のひとことは案外なんでも大丈夫です。',
      'まだ会話は始まっていません。気軽にひとこと送ってみましょう。',
      'メッセージはまだありません。あいさつから始めてみませんか。',
    ])
  )

  const [reactions, setReactions] = useState<Record<string, { count: number; my_reaction: boolean }>>({})
  const [atBottom, setAtBottom] = useState(true)
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: matchInfo, isLoading: matchInfoLoading, error: matchInfoError } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => api.get<MatchedUserItem>(`/api/matches/${matchId}`).then(r => r.data),
    enabled: !!matchId,
    retry: (failureCount, err: unknown) => {
      const s = (err as { response?: { status?: number } }).response?.status
      if (s === 403 || s === 404) return false
      return failureCount < 1
    },
  })

  usePageTitle(matchInfo?.name ? `${matchInfo.name}とのチャット` : 'チャット')

  useEffect(() => {
    if (!matchInfoError) return
    const s = (matchInfoError as { response?: { status?: number } }).response?.status
    if (s === 403 || s === 404) navigate('/matches')
    else setError('データの取得に失敗しました')
  }, [matchInfoError, navigate])

  useEffect(() => {
    if (!matchId) navigate('/matches')
  }, [matchId, navigate])

  useEffect(() => {
    setReactions(prev => {
      const updated = { ...prev }
      let changed = false
      ;(messages ?? []).forEach((msg) => {
        if (!(msg.id in updated) && (msg.reaction_count > 0 || msg.my_reaction)) {
          updated[msg.id] = { count: msg.reaction_count, my_reaction: msg.my_reaction }
          changed = true
        }
      })
      return changed ? updated : prev
    })
  }, [messages])

  // 解説: テキストエリアの高さ自動調整: content が変わるたびに scrollHeight を参照して最大 120px まで伸縮させる
  // テキストエリアの高さ自動調整
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [content])

  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(null), 3000)
    return () => clearTimeout(t)
  }, [actionError])

  const handleContentChange = (value: string) => {
    setContent(value)
    sendTypingStatus(true)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      sendTypingStatus(false)
    }, 2000)
  }

  const handleSend = async () => {
    const trimmed = content.trim()
    if (!trimmed || sending || !matchId || !user) return

    setSending(true)
    sendTypingStatus(false)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)

    const tempId = `temp-${Date.now()}`
    const tempMsg: MessageResponse = {
      id: tempId,
      match_id: matchId,
      sender_id: user.id,
      content: trimmed,
      created_at: new Date().toISOString(),
      read_at: null,
      reaction_count: 0,
      my_reaction: false,
      reply_to_id: replyTo?.id ?? null,
      reply_to_content: replyTo?.content?.slice(0, 50) ?? null,
      reply_to_sender_name: replyTo ? (replyTo.sender_id === user.id ? '自分' : (matchInfo?.name ?? '相手')) : null,
    }

    setMessages(prev => [...(prev ?? []), tempMsg])
    setContent('')
    setReplyTo(null)

    try {
      await api.post('/api/messages/', {
        match_id: matchId,
        content: trimmed,
        reply_to_id: replyTo?.id ?? null,
      })
    } catch {
      setMessages(prev => (prev ?? []).filter(m => m.id !== tempId))
      setContent(trimmed)
      // @copy CRO-error-chat-send-01 Lv1
      setActionError('送信できませんでした。もう一度お試しください。')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReact = useCallback(async (msgId: string) => {
    try {
      const res = await api.post<{ reacted: boolean; count: number }>(`/api/messages/${msgId}/react`)
      setReactions(prev => ({ ...prev, [msgId]: { count: res.data.count, my_reaction: res.data.reacted } }))
    } catch {}
  }, [])

  // 解説: startLongPress = 500ms 長押しで返信（replyTo）をセットする（navigator.vibrate で触覚フィードバック）
  const startLongPress = useCallback((msg: MessageResponse) => {
    longPressTimerRef.current = setTimeout(() => {
      setReplyTo(msg)
      if (navigator.vibrate) navigator.vibrate(50)
      textareaRef.current?.focus()
    }, 500)
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleContextMenu = useCallback((msg: MessageResponse) => {
    setReplyTo(msg)
  }, [])

  const handleHide = async () => {
    if (!matchInfo) return
    try {
      await api.post('/api/safety/hide', { hidden_id: matchInfo.user_id })
      queryClient.invalidateQueries({ queryKey: ['safety-hides'] })
      navigate('/matches')
    } catch {
      // @copy CRO-error-chat-hide-01 Lv1
      setActionError('うまくいきませんでした。もう一度お試しください。')
    }
  }

  const openBlockConfirm = () => {
    setBlockConfirmError(null)
    setShowBlockConfirm(true)
  }

  const handleBlockConfirm = async () => {
    if (!matchInfo || blocking) return
    setBlocking(true)
    setBlockConfirmError(null)
    try {
      await api.post('/api/safety/block', { blocked_id: matchInfo.user_id })
      queryClient.invalidateQueries({ queryKey: ['safety-blocks'] })
      navigate('/matches')
    } catch {
      // @copy CRO-error-chat-block-01 Lv1
      setBlockConfirmError('うまくいきませんでした。もう一度お試しください。')
      setBlocking(false)
    }
  }

  const handleReport = async () => {
    if (!matchInfo || reporting) return
    setReporting(true)
    try {
      await api.post('/api/safety/report', {
        reported_id: matchInfo.user_id,
        reason: reportReason,
        detail: reportDetail.trim() || undefined,
      })
      setReportDone(true)
    } catch {
      // @copy CRO-error-chat-report-01 Lv1
      setActionError('通報に失敗しました。')
    } finally {
      setReporting(false)
    }
  }

  const openReport = () => {
    setReportReason('不適切な写真')
    setReportDetail('')
    setReportDone(false)
    setReportOpen(true)
  }

  const handleStartReached = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMore()
    }
  }, [hasMore, loadingMore, loadMore])

  if (matchInfoLoading) {
    return (
      <div className="flex flex-col h-dvh max-w-[600px] mx-auto">
        <div className="h-14 border-b bg-white flex items-center px-4 gap-3 shrink-0">
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          <div className="w-24 h-4 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1 bg-background" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-dvh max-w-[600px] mx-auto p-4 pt-10">
        <ErrorState message="メッセージの取得に失敗しました" onRetry={() => navigate(0)} />
        <Button variant="outline" className="mx-auto mt-4" onClick={() => navigate('/matches')}>
          ← マッチ一覧に戻る
        </Button>
      </div>
    )
  }

  const messageList = messages ?? []
  const showTyping = !!typingUserId && typingUserId !== user?.id

  // lastReadAt 以前の自分メッセージの中で最後の1件にのみ「既読」を表示（LINE方式）
  const readReceiptMsgId = useMemo(() => {
    if (!lastReadAt || !user?.id) return null
    const readMyMsgs = messageList.filter(
      m => m.sender_id === user.id &&
           !m.id.startsWith('temp-') &&
           new Date(lastReadAt) >= new Date(m.created_at)
    )
    if (readMyMsgs.length === 0) return null
    return readMyMsgs[readMyMsgs.length - 1].id
  }, [messageList, lastReadAt, user?.id])

  return (
    <div className="flex flex-col h-dvh max-w-[600px] mx-auto">
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
              {/* @copy CRO-confirm-chat-block-01 Lv0 */}
              <h2 className="font-display text-2xl text-ink">ブロックしますか？</h2>
            </div>
            {/* @copy CRO-confirm-chat-block-02 Lv0 */}
            <p className="font-mono text-xs font-bold" style={{ color: '#FF3B6B' }}>
              この操作は取り消せません
            </p>
            {/* @copy CRO-confirm-chat-block-03 Lv0 */}
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
                {/* @copy CRO-button-chat-block-cancel-01 Lv1 */}
                やっぱりやめる
              </Button>
              <Button
                className="flex-1 border-2 border-ink font-bold shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                style={{ backgroundColor: '#FF3B6B', color: '#fff' }}
                onClick={handleBlockConfirm}
                disabled={blocking}
              >
                {/* @copy CRO-button-chat-block-01 Lv0 */}
                {blocking ? 'ブロック中…' : 'ブロックする'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 通報ダイアログ */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            {/* @copy CRO-heading-chat-report-01 Lv0 */}
            <DialogTitle className="font-bold">通報する</DialogTitle>
            {/* @copy CRO-label-chat-report-01〜02 Lv0 */}
            <DialogDescription>{reportDone ? '通報を受け付けました。' : '理由を選んでください。'}</DialogDescription>
          </DialogHeader>
          {!reportDone ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="report-reason" value={r} checked={reportReason === r}
                      onChange={() => setReportReason(r)} className="accent-primary" />
                    {r}
                  </label>
                ))}
              </div>
              <div className="space-y-1">
                {/* @copy CRO-label-chat-report-03 Lv1 */}
                <label className="text-xs text-muted-foreground">詳細（任意・500文字以内）</label>
                <Textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value.slice(0, 500))}
                  // @copy CRO-placeholder-chat-report-01 Lv1
                  rows={3} placeholder="詳細があれば（任意）" disabled={reporting}
                  className="border-2 border-ink focus-visible:ring-0"
                />
                <p className="text-xs text-muted-foreground text-right">{reportDetail.length} / 500</p>
              </div>
              <Button variant="bold" className="w-full" onClick={handleReport} disabled={reporting}>
                {/* @copy CRO-button-chat-report-01 Lv0 */}
                {reporting ? '送信中…' : '通報する'}
              </Button>
            </div>
          ) : (
            <DialogFooter>
              {/* @copy CRO-button-chat-report-close-01 Lv1 */}
              <Button variant="bold" className="w-full" onClick={() => setReportOpen(false)}>閉じる</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 h-14 border-b-2 border-ink bg-white shrink-0 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full border-2 border-ink bg-white flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all shrink-0"
        >
          ←
        </button>

        {matchInfo && (
          <>
            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden border-2 border-ink shrink-0">
              {matchInfo.avatar_url ? (
                <img src={matchInfo.avatar_url} alt={matchInfo.name ?? '相手'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {/* @copy CRO-label-chat-header-name-01〜02 Lv1 */}
              <p className={`font-bold truncate text-sm ${matchInfo.is_deleted ? 'text-ink/40 italic' : 'text-ink'}`}>
                {matchInfo.is_deleted ? '退会済み' : (matchInfo.name ?? '（名前未設定）')}
              </p>
              {!matchInfo.is_deleted && (
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-success' : 'bg-ink/20'}`} />
                  {/* @copy CRO-label-chat-status-01〜02 Lv1 */}
                  <span className="font-mono text-[10px] text-subtle">
                    {connected ? 'LIVE' : '再接続中…'}
                  </span>
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full border-2 border-ink bg-white flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all shrink-0"
                >
                  ⋯
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="!bg-white border-2 border-ink !shadow-[4px_4px_0_0_#0A0A0A] !rounded-[12px] !ring-0 min-w-[160px] !p-1.5">
                {/* @copy CRO-button-chat-menu-01〜03 Lv1 */}
                <DropdownMenuItem className="!py-2.5 !px-3 font-medium cursor-pointer" onClick={handleHide}>非表示にする</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive !py-2.5 !px-3 font-medium cursor-pointer" onClick={openBlockConfirm}>ブロックする</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive !py-2.5 !px-3 font-medium cursor-pointer" onClick={openReport}>通報する</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* メッセージリスト */}
      {messagesLoading ? (
        <div className="flex-1 bg-bone px-4 py-4">
          <div className="space-y-3 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="animate-pulse bg-gray-200"
                  style={{
                    height: '44px',
                    width: i % 2 === 0 ? '180px' : '140px',
                    borderRadius: i % 2 === 0 ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : messageList.length === 0 && !hasMore ? (
        <div className="flex-1 bg-bone flex items-center justify-center">
          <div className="card-bold bg-white p-6 text-center">
            <p className="font-bold text-ink text-lg">{emptyChatTitle}</p>
          </div>
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          style={{ flex: 1, background: 'var(--color-bone)' }}
          data={messageList}
          startReached={handleStartReached}
          atBottomStateChange={setAtBottom}
          followOutput={atBottom ? 'smooth' : false}
          initialTopMostItemIndex={messageList.length > 0 ? messageList.length - 1 : 0}
          itemContent={(index, msg) => {
            const isMine = msg.sender_id === user?.id
            const rxn = reactions[msg.id] ?? { count: msg.reaction_count, my_reaction: msg.my_reaction }
            const isTemp = msg.id.startsWith('temp-')
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                index={index}
                messages={messageList}
                isMine={isMine}
                rxn={rxn}
                isTemp={isTemp}
                isRead={msg.id === readReceiptMsgId}
                matchInfo={matchInfo}
                currentUserId={user?.id}
                onLongPressStart={startLongPress}
                onLongPressEnd={cancelLongPress}
                onContextMenu={handleContextMenu}
                onReact={handleReact}
              />
            )
          }}
          components={{
            Header: () => loadingMore ? (
              <div className="text-center py-4 text-ink/60 text-sm font-mono">
                {/* @copy CRO-label-chat-loading-01 Lv1 */}
                読み込み中…
              </div>
            ) : null,
            Footer: () => showTyping ? (
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="w-7 h-7 rounded-full bg-muted border-2 border-ink overflow-hidden shrink-0">
                  {matchInfo?.avatar_url ? (
                    <img src={matchInfo.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="bg-white border-2 border-ink shadow-[2px_2px_0_0_#0A0A0A] rounded-[18px_18px_18px_4px]">
                  <TypingDots />
                </div>
              </div>
            ) : null,
          }}
        />
      )}

      {/* インラインエラー */}
      {actionError && (
        <div className="px-4 py-2 border-t border-ink/20 bg-white">
          <p className="text-xs text-hot font-medium">{actionError}</p>
        </div>
      )}

      {/* リプライプレビュー */}
      {replyTo && (
        <div className="px-4 py-2 bg-white border-t border-ink/20 flex items-center gap-2">
          <div className="flex-1 border-l-4 border-ink/20 px-2 py-1 bg-gray-50 rounded-r min-w-0">
            <p className="text-xs text-ink/60 truncate">
              ↩ 返信先: {replyTo.content.slice(0, 40)}{replyTo.content.length > 40 ? '...' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-ink/30 text-ink/50 hover:text-ink transition-colors text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* チャット制限メッセージ */}
      {!canChat && (
        <div className="sticky bottom-0 bg-white border-t-2 border-ink px-4 py-4 shrink-0">
          {myProfileData?.student_id_submitted ? (
            // @copy CRO-label-chat-pending-01 Lv0
            <p className="text-center text-sm text-ink/60">
              学生証を確認中です。もうしばらくお待ちください。
            </p>
          ) : (
            <div className="text-center">
              {/* @copy CRO-label-chat-no-id-01 Lv0 */}
              <p className="text-sm text-ink/60 mb-3">
                チャットするには学生証の提出が必要です。
              </p>
              <button
                type="button"
                className="font-bold text-sm px-6 py-2 bg-ink text-white border-2 border-ink"
                style={{ boxShadow: '2px 2px 0 0 #0A0A0A' }}
                onClick={() => navigate('/upload-student-id')}
              >
                {/* @copy CRO-button-chat-submit-id-01 Lv0 */}
                学生証を提出する
              </button>
            </div>
          )}
        </div>
      )}

      {/* 退会ユーザー通知バナー */}
      {canChat && matchInfo?.is_deleted && (
        <div className="sticky bottom-0 bg-white border-t-2 border-ink px-4 py-4 shrink-0">
          {/* @copy CRO-label-chat-deleted-01 Lv1 */}
          <p className="text-center text-sm text-ink/50 font-mono">
            相手は退会しました。メッセージは送れません。
          </p>
        </div>
      )}

      {/* 入力エリア */}
      {canChat && !matchInfo?.is_deleted && (
        <div className="px-4 py-3 border-t-2 border-ink bg-white shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none border-2 border-ink rounded-2xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] overflow-hidden leading-relaxed"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              // @copy CRO-placeholder-chat-01 Lv1
              placeholder="メッセージを入力… (Shift+Enterで改行)"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!content.trim() || sending}
              className="shrink-0 w-10 h-10 rounded-full bg-ink text-white border-2 border-ink flex items-center justify-center shadow-[2px_2px_0_0_#0A0A0A] disabled:opacity-30 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#0A0A0A] transition-all"
            >
              {sending ? <span className="text-xs font-bold">…</span> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {content.length > 900 && (
            <p className={`font-mono text-xs mt-1 text-right ${content.length >= 1000 ? 'text-destructive' : 'text-subtle'}`}>
              {content.length}/1000
            </p>
          )}
        </div>
      )}
    </div>
  )
}
