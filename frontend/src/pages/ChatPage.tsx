import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Heart, MessageCircle, Send, User } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useChat, type MessageResponse } from '@/hooks/useChat'
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

const formatTime = (dateStr: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))

const formatDateLabel = (dateStr: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))

const isSameDay = (a: string, b: string) => {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { messages, setMessages, connected } = useChat(matchId ?? '')

  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false)
  const [unmatching, setUnmatching] = useState(false)
  const [reactions, setReactions] = useState<Record<string, { count: number; my_reaction: boolean }>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // matchInfo エラー処理
  useEffect(() => {
    if (!matchInfoError) return
    const s = (matchInfoError as { response?: { status?: number } }).response?.status
    if (s === 403 || s === 404) {
      navigate('/matches')
    } else {
      setError('データの取得に失敗しました')
    }
  }, [matchInfoError, navigate])

  // matchId なし → /matches へ
  useEffect(() => {
    if (!matchId) navigate('/matches')
  }, [matchId, navigate])

  // リアクション初期化（新メッセージは上書きせず追記のみ）
  useEffect(() => {
    setReactions(prev => {
      const updated = { ...prev }
      let changed = false
      messages.forEach((msg) => {
        if (!(msg.id in updated) && (msg.reaction_count > 0 || msg.my_reaction)) {
          updated[msg.id] = { count: msg.reaction_count, my_reaction: msg.my_reaction }
          changed = true
        }
      })
      return changed ? updated : prev
    })
  }, [messages])

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = newMessage.trim()
    if (!trimmed || sending || !matchId || !user) return

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
    }

    setSending(true)
    setNewMessage('')
    setMessages(prev => [...prev, tempMsg])

    try {
      await api.post('/api/messages/', { match_id: matchId, content: trimmed })
      // WebSocket broadcast が temp を本物に差し替える
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(trimmed)
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
    } catch {
      // silently ignore
    }
  }

  const startLongPress = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      void handleReact(msgId)
    }, 500)
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleUnmatch = async () => {
    if (!matchId) return
    setUnmatching(true)
    try {
      await api.delete(`/api/matches/${matchId}`)
      navigate('/matches')
    } catch {
      setActionError('うまくいかなかった。もう一度試してみて。')
      setUnmatching(false)
    }
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
        <ErrorState
          message="メッセージの取得に失敗しました"
          onRetry={() => navigate(0)}
        />
        <Button variant="outline" className="mx-auto mt-4" onClick={() => navigate('/matches')}>
          ← マッチ一覧に戻る
        </Button>
      </div>
    )
  }

  const canSend = newMessage.trim().length > 0 && newMessage.length <= 1000 && !sending

  return (
    <div className="flex flex-col h-dvh max-w-[600px] mx-auto">
      {/* アンマッチ確認ダイアログ */}
      <AlertDialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当にアンマッチする？</AlertDialogTitle>
            <AlertDialogDescription>
              メッセージも全部消える。{'\n'}...後悔しても知らない。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleUnmatch}
              disabled={unmatching}
            >
              {unmatching ? '処理中...' : 'アンマッチ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 h-14 border-b-2 border-ink bg-white shrink-0 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => navigate('/matches')}
          className="w-8 h-8 rounded-full border-2 border-ink bg-white flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#0A0A0A] transition-all shrink-0"
        >
          ←
        </button>

        {matchInfo && (
          <>
            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden border-2 border-ink shrink-0">
              {matchInfo.avatar_url ? (
                <img
                  src={matchInfo.avatar_url}
                  alt={matchInfo.name ?? '相手'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-sm text-ink">
                {matchInfo.name ?? '（名前未設定）'}
              </p>
              <div className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
                />
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
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowUnmatchDialog(true)}
                >
                  アンマッチする
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#FFFBEB]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="card-bold bg-white p-6">
              <EmptyState
                icon={<MessageCircle className="w-16 h-16 text-gray-300" />}
                title="なんで何も送ってくれないの。"
                description="最初の一言、送ってみて。"
              />
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.sender_id === user?.id
            const showDate =
              index === 0 || !isSameDay(msg.created_at, messages[index - 1].created_at)

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-ink/20" />
                    <span className="font-mono text-xs text-ink/40 shrink-0">
                      {formatDateLabel(msg.created_at)}
                    </span>
                    <div className="flex-1 h-px bg-ink/20" />
                  </div>
                )}
                <div
                  className={`flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 text-sm whitespace-pre-wrap break-words leading-relaxed border-2 border-ink select-none ${
                      isMine
                        ? 'bg-ink text-white shadow-[2px_2px_0_0_rgba(10,10,10,0.3)]'
                        : 'bg-white text-ink shadow-[2px_2px_0_0_#0A0A0A]'
                    }`}
                    style={{
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}
                    onTouchStart={() => startLongPress(msg.id)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                  >
                    {msg.content}
                  </div>
                  {/* リアクション表示 */}
                  {(reactions[msg.id]?.count ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => handleReact(msg.id)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-ink/20 bg-white shadow-sm text-xs"
                    >
                      <Heart
                        className="w-3 h-3"
                        style={{ color: 'var(--color-hot, #FF4D6D)' }}
                        fill={reactions[msg.id]?.my_reaction ? 'var(--color-hot, #FF4D6D)' : 'none'}
                      />
                      <span className="font-mono text-[10px] text-ink/60">{reactions[msg.id]?.count}</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1 px-1">
                    <span className="font-mono text-[10px] text-ink/40">
                      {formatTime(msg.created_at)}
                    </span>
                    {isMine && (
                      <span className={`font-mono text-[10px] ${msg.read_at ? 'text-hot' : 'text-ink/40'}`}>
                        {msg.read_at ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* インラインエラー */}
      {actionError && (
        <div className="px-4 py-2 border-t border-ink/20 bg-white">
          <p className="text-xs text-hot font-medium">{actionError}</p>
        </div>
      )}

      {/* 入力エリア */}
      <div className="px-4 py-3 border-t-2 border-ink bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            className="resize-none min-h-[44px] max-h-[120px] flex-1 border-2 border-ink focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#0A0A0A] rounded-2xl bg-white"
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 w-10 h-10 rounded-full bg-ink text-white border-2 border-ink flex items-center justify-center shadow-[2px_2px_0_0_#0A0A0A] disabled:opacity-30 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#0A0A0A] transition-all"
          >
            {sending ? (
              <span className="text-xs font-bold">…</span>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        {newMessage.length > 900 && (
          <p
            className={`font-mono text-xs mt-1 text-right ${
              newMessage.length >= 1000 ? 'text-destructive' : 'text-ink/40'
            }`}
          >
            {newMessage.length}/1000
          </p>
        )}
      </div>
    </div>
  )
}
