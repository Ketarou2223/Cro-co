import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Heart, Send, User } from 'lucide-react'
import ErrorState from '@/components/ErrorState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useChat } from '@/hooks/useChat'
import type { MessageResponse } from '@/hooks/useChat'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
}

const REPORT_REASONS = ['不適切な写真', 'ハラスメント', 'なりすまし', 'スパム', 'その他'] as const
type ReportReason = (typeof REPORT_REASONS)[number]

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
          className="w-2 h-2 rounded-full bg-gray-400"
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

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const {
    messages,
    setMessages,
    connected,
    isLoading: messagesLoading,
    typingUserId,
    lastReadAt,
    sendTypingStatus,
  } = useChat(matchId ?? '')

  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<MessageResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('不適切な写真')
  const [reportDetail, setReportDetail] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  const [reactions, setReactions] = useState<Record<string, { count: number; my_reaction: boolean }>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUserId])

  // テキストエリアの高さ自動調整
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [content])

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
      setActionError('送信できなかった。もう一度試してみて。')
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

  const handleReact = async (msgId: string) => {
    try {
      const res = await api.post<{ reacted: boolean; count: number }>(`/api/messages/${msgId}/react`)
      setReactions(prev => ({ ...prev, [msgId]: { count: res.data.count, my_reaction: res.data.reacted } }))
    } catch {}
  }

  const startLongPress = (msg: MessageResponse) => {
    longPressTimerRef.current = setTimeout(() => {
      setReplyTo(msg)
      if (navigator.vibrate) navigator.vibrate(50)
      textareaRef.current?.focus()
    }, 500)
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleHide = async () => {
    if (!matchInfo) return
    try {
      await api.post('/api/safety/hide', { hidden_id: matchInfo.user_id })
      navigate('/matches')
    } catch {
      setActionError('うまくいかなかった。もう一度試してみて。')
    }
  }

  const handleBlock = async () => {
    if (!matchInfo || blocking) return
    setBlocking(true)
    try {
      await api.post('/api/safety/block', { blocked_id: matchInfo.user_id })
      navigate('/matches')
    } catch {
      setActionError('うまくいかなかった。もう一度試してみて。')
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

  // 既読判定
  const isRead = (msg: MessageResponse): boolean => {
    if (!lastReadAt) return false
    return new Date(lastReadAt) >= new Date(msg.created_at)
  }

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

  return (
    <div className="flex flex-col h-dvh max-w-[600px] mx-auto">
      {/* ブロック確認ダイアログ */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ブロックする？</AlertDialogTitle>
            <AlertDialogDescription>
              もう連絡は取れなくなる。それでもいいの？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>やめる</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBlock}
              disabled={blocking}
            >
              {blocking ? '処理中...' : 'ブロック'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 通報ダイアログ */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">通報する</DialogTitle>
            <DialogDescription>{reportDone ? '通報を受け付けた。' : '理由を選んで'}</DialogDescription>
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
                <label className="text-xs text-muted-foreground">詳細（任意・500文字以内）</label>
                <Textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value.slice(0, 500))}
                  rows={3} placeholder="詳細があれば（任意）" disabled={reporting}
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
              <Button variant="bold" className="w-full" onClick={() => setReportOpen(false)}>閉じる</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 h-14 border-b-2 border-ink bg-white shrink-0 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => navigate('/matches')}
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
              <p className="font-bold truncate text-sm text-ink">{matchInfo.name ?? '（名前未設定）'}</p>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-mono text-[10px] text-ink/40">
                  {connected ? 'LIVE' : '戻ってくる...'}
                </span>
              </div>
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleHide}>このユーザーを非表示</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowBlockDialog(true)}>
                  ブロックする
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={openReport}>
                  通報する
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#FFFBEB]">
        {messagesLoading ? (
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
        ) : messageList.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="card-bold bg-white p-6 text-center">
              <p className="font-bold text-ink text-lg">最初のメッセージを送ってみよう。</p>
              <p className="text-sm text-gray-500 mt-1">まだ何もない。今がチャンス。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messageList.map((msg, index) => {
              const isMine = msg.sender_id === user?.id
              const showDate = index === 0 || !isSameDay(msg.created_at, messageList[index - 1].created_at)
              const rxn = reactions[msg.id] ?? { count: msg.reaction_count, my_reaction: msg.my_reaction }
              const isTemp = msg.id.startsWith('temp-')

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-ink/20" />
                      <span className="font-mono text-xs text-ink/40 shrink-0">{formatDateLabel(msg.created_at)}</span>
                      <div className="flex-1 h-px bg-ink/20" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
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
                      onTouchStart={() => startLongPress(msg)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onContextMenu={(e) => { e.preventDefault(); setReplyTo(msg) }}
                    >
                      {/* リプライ引用 */}
                      {msg.reply_to_id && (
                        <div
                          className="border-l-4 px-3 py-2 text-xs"
                          style={{
                            borderColor: '#A8F0D1',
                            background: isMine ? 'rgba(255,255,255,0.1)' : 'rgba(168,240,209,0.2)',
                            color: isMine ? 'rgba(255,255,255,0.7)' : '#666',
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

                      {/* 本文 */}
                      <div className="px-4 py-2.5 whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </div>
                    </div>

                    {/* リアクション */}
                    {rxn.count > 0 && (
                      <button
                        type="button"
                        onClick={() => handleReact(msg.id)}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-ink/20 bg-white shadow-sm"
                      >
                        <Heart
                          className="w-3 h-3"
                          style={{ color: '#FF3B6B' }}
                          fill={rxn.my_reaction ? '#FF3B6B' : 'none'}
                        />
                        <span className="font-mono text-[10px] text-ink/60">{rxn.count}</span>
                      </button>
                    )}

                    {/* 時刻 + 既読 */}
                    <div className="flex items-center gap-1 px-1">
                      <span className="font-mono text-[10px] text-ink/40">{formatTime(msg.created_at)}</span>
                      {isMine && (
                        <span className={`font-mono text-[10px] ${
                          isTemp ? 'text-gray-400' : isRead(msg) ? 'text-emerald-500' : 'text-ink/40'
                        }`}>
                          {isTemp ? '送信中...' : isRead(msg) ? '既読' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 入力中インジケーター */}
            {showTyping && (
              <div className="flex items-center gap-2">
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
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* インラインエラー */}
      {actionError && (
        <div className="px-4 py-2 border-t border-ink/20 bg-white">
          <p className="text-xs text-hot font-medium">{actionError}</p>
        </div>
      )}

      {/* リプライプレビュー */}
      {replyTo && (
        <div className="px-4 py-2 bg-white border-t border-ink/20 flex items-center gap-2">
          <div className="flex-1 border-l-4 border-mint px-2 py-1 bg-gray-50 rounded-r min-w-0">
            <p className="text-xs text-gray-500 truncate">
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

      {/* 入力エリア */}
      <div className="px-4 py-3 border-t-2 border-ink bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none border-2 border-ink rounded-2xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] overflow-hidden leading-relaxed"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            placeholder="メッセージを入力... (Shift+Enterで改行)"
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
          <p className={`font-mono text-xs mt-1 text-right ${content.length >= 1000 ? 'text-destructive' : 'text-ink/40'}`}>
            {content.length}/1000
          </p>
        )}
      </div>
    </div>
  )
}
