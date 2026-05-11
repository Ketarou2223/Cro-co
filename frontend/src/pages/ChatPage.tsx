import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 max-w-[600px] mx-auto pt-10">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/matches')}>
          ← マッチ一覧に戻る
        </Button>
      </div>
    )
  }

  const canSend = newMessage.trim().length > 0 && newMessage.length <= 1000 && !sending

  return (
    <div className="flex flex-col h-screen max-w-[600px] mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
        <Link
          to="/matches"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          ← マッチ一覧
        </Link>
        {matchInfo && (
          <>
            <Avatar className="w-9 h-9 shrink-0">
              {matchInfo.avatar_url && (
                <AvatarImage src={matchInfo.avatar_url} alt={matchInfo.name ?? '相手'} />
              )}
              <AvatarFallback className="text-xs bg-muted">
                {matchInfo.name ? matchInfo.name.charAt(0) : '?'}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold truncate">
              {matchInfo.name ?? '（名前未設定）'}
            </span>
          </>
        )}
      </div>

      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm text-center leading-relaxed">
              まだメッセージはありません。<br />
              最初のメッセージを送りましょう！
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                    isMine
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-muted-foreground px-1">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            )
          })
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="px-4 py-3 border-t bg-background shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            className="resize-none min-h-[44px] max-h-[120px] flex-1"
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <Button onClick={handleSend} disabled={!canSend} className="shrink-0 h-[44px]">
            {sending ? '送信中...' : '送信'}
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
