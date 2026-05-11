import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

interface MessageResponse {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
}

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

const POLLING_INTERVAL = 5000

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [messages, setMessages] = useState<MessageResponse[]>([])
  const [matchInfo, setMatchInfo] = useState<MatchedUserItem | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollEndRef = useRef<HTMLDivElement>(null)

  // 初回マウント: マッチ情報 + メッセージ取得
  useEffect(() => {
    if (!matchId) {
      navigate('/matches')
      return
    }

    const init = async () => {
      try {
        const matchRes = await api.get<MatchedUserItem>(`/api/matches/${matchId}`)
        setMatchInfo(matchRes.data)

        const msgsRes = await api.get<MessageResponse[]>(`/api/messages/${matchId}`)
        setMessages(msgsRes.data)
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 403 || status === 404) {
          navigate('/matches')
        } else {
          setError('データの取得に失敗しました')
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [matchId, navigate])

  // ポーリング (5秒ごと)
  useEffect(() => {
    if (!matchId) return

    const timer = setInterval(async () => {
      try {
        const res = await api.get<MessageResponse[]>(`/api/messages/${matchId}`)
        setMessages(res.data)
      } catch {
        // ポーリングエラーは静かに無視
      }
    }, POLLING_INTERVAL)

    return () => clearInterval(timer)
  }, [matchId])

  // メッセージ更新時に最下部へスクロール
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = newMessage.trim()
    if (!trimmed || sending || !matchId) return

    const optimisticMsg: MessageResponse = {
      id: `opt-${Date.now()}`,
      match_id: matchId,
      sender_id: user?.id ?? '',
      content: trimmed,
      created_at: new Date().toISOString(),
    }

    setSending(true)
    setMessages((prev) => [...prev, optimisticMsg])
    setNewMessage('')

    try {
      await api.post('/api/messages/', { match_id: matchId, content: trimmed })
      const res = await api.get<MessageResponse[]>(`/api/messages/${matchId}`)
      setMessages(res.data)
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setNewMessage(trimmed)
      alert('メッセージの送信に失敗しました。もう一度お試しください。')
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

  if (loading) {
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
      <div className="flex flex-col h-dvh max-w-[600px] mx-auto p-4 pt-10 gap-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate('/matches')}>
          ← マッチ一覧に戻る
        </Button>
      </div>
    )
  }

  const canSend = newMessage.trim().length > 0 && newMessage.length <= 1000 && !sending

  return (
    <div className="flex flex-col h-dvh max-w-[600px] mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 h-14 border-b bg-white shrink-0 sticky top-0 z-10 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/matches')}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 text-lg font-medium"
        >
          ←
        </button>

        {matchInfo && (
          <>
            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0">
              {matchInfo.avatar_url ? (
                <img
                  src={matchInfo.avatar_url}
                  alt={matchInfo.name ?? '相手'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg text-muted-foreground">
                  👤
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-sm">
                {matchInfo.name ?? '（名前未設定）'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-background">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="text-4xl">💌</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                まだメッセージはありません。<br />
                最初のメッセージを送りましょう！
              </p>
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
                  <div className="flex justify-center my-3">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {formatDateLabel(msg.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words leading-relaxed ${
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-white text-foreground rounded-bl-md shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="px-4 py-3 border-t bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            className="resize-none min-h-[44px] max-h-[120px] flex-1 bg-muted/50 border-0 focus-visible:ring-1 rounded-2xl"
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 h-[44px] w-[44px] rounded-full p-0 bg-primary hover:bg-primary/90 disabled:opacity-30"
          >
            {sending ? '…' : '↑'}
          </Button>
        </div>
        {newMessage.length > 900 && (
          <p
            className={`text-xs mt-1 text-right ${
              newMessage.length >= 1000 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {newMessage.length}/1000
          </p>
        )}
      </div>
    </div>
  )
}
