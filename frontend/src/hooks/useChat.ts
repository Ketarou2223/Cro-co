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
      const pingId = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 30000)
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
