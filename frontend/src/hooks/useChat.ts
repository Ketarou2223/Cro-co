import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'

export interface MessageResponse {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  reaction_count: number
  my_reaction: boolean
}

export function useChat(matchId: string) {
  const [messages, setMessages] = useState<MessageResponse[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const addMessage = useCallback((msg: MessageResponse) => {
    setMessages(prev => {
      const withoutTemp = prev.filter(
        m => !(m.id.startsWith('temp-') &&
          m.content === msg.content &&
          m.sender_id === msg.sender_id)
      )
      if (withoutTemp.some(m => m.id === msg.id)) return withoutTemp
      return [...withoutTemp, msg]
    })
  }, [])

  const connect = useCallback(async () => {
    if (!mountedRef.current || !matchId) return

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return

    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const base = import.meta.env.VITE_API_URL as string
    const wsUrl = `${base.replace('http', 'ws')}/ws/chat/${matchId}?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setConnected(true)
      console.log('[WS] 接続成功')

      // ping を10秒ごとに送信
      // pong が15秒以内に返ってこなければ強制切断→再接続
      let pongReceived = true // 最初はtrue（接続直後は正常とみなす）

      const pingId = setInterval(() => {
        if (!pongReceived) {
          // pongが返ってこなかった → ゾンビ接続
          console.log('[WS] pong未受信 → 強制切断して再接続')
          ws.close()
          return
        }
        pongReceived = false
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 10000) // 10秒ごとにping

      // pong受信時にフラグを立てる
      const originalOnMessage = ws.onmessage
      ws.onmessage = (event) => {
        if (event.data === 'pong') {
          pongReceived = true
          return
        }
        if (originalOnMessage) {
          originalOnMessage.call(ws, event)
        }
      }

      ws.addEventListener('close', () => clearInterval(pingId))
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      if (event.data === 'pong') return
      try {
        const msg = JSON.parse(event.data as string) as MessageResponse
        addMessage(msg)
      } catch {}
    }

    ws.onerror = () => {
      // onclose が続けて発火するので再接続はそちらに委譲
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 3000)
    }
  }, [matchId, addMessage])

  // 初期ロード
  useEffect(() => {
    if (!matchId) return
    api.get<MessageResponse[]>(`/api/messages/${matchId}`)
      .then(r => setMessages(r.data))
      .catch(() => {})
  }, [matchId])

  // WebSocket 接続
  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  // 既読処理（初回のみ）
  useEffect(() => {
    if (!matchId) return
    api.post(`/api/messages/${matchId}/read`).catch(() => {})
  }, [matchId])

  return { messages, setMessages, connected }
}
