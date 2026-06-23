// 解説: このファイルはチャット機能（メッセージ取得・WebSocket・IndexedDB キャッシュ）を管理するカスタムフックを提供する。
// 解説: 呼ばれる場所: frontend/src/pages/ChatPage.tsx から useChat(matchId) で呼ばれる
// 解説: 機能の全体図:
//   1. IndexedDB からキャッシュを表示（体感速度向上）
//   2. API から最新メッセージを取得してキャッシュを更新
//   3. WebSocket で新着メッセージをリアルタイム受信
//   4. 入力中インジケーター（typing）をリアルタイム送受信
//   5. 既読通知（read_receipt）を受信して UI を更新
// 解説: 依存ライブラリ:
//   TanStack Query（useQueryClient）/ db.ts（IndexedDB）/ lib/api.ts（HTTP）/ lib/supabase.ts（JWT 取得）

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { dbGet, dbSet } from '@/lib/db'

// 解説: MessageResponse = メッセージ1件の型定義（バックエンドの schemas/message.py と対応）
export interface MessageResponse {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
  // 解説: read_at = null のとき未読（相手が既読にしていない）
  read_at: string | null
  reaction_count: number
  my_reaction: boolean
  reply_to_id: string | null
  reply_to_content: string | null
  reply_to_sender_name: string | null
}

// 解説: PaginatedMessages = カーソルページネーション付きメッセージ一覧の型
interface PaginatedMessages {
  messages: MessageResponse[]
  has_more: boolean
  next_cursor: string | null
}

// 解説: useChat(matchId, currentUserId) = 指定マッチのチャット機能全体を管理するカスタムフック
export function useChat(matchId: string, currentUserId?: string) {
  const queryClient = useQueryClient()
  // 解説: messages = null = まだ読み込み中（ローディング状態）
  const [messages, setMessages] = useState<MessageResponse[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  // 解説: connected = WebSocket が接続中かどうか
  const [connected, setConnected] = useState(false)
  // 解説: typingUserId = 現在入力中の相手のユーザー ID（null = 誰も入力していない）
  const [typingUserId, setTypingUserId] = useState<string | null>(null)
  const [lastReadAt, setLastReadAt] = useState<string | null>(null)
  // 初期ロード時の既読復元: WS read_receipt が届く前に messages.read_at から最終既読時刻を算出
  const effectiveLastReadAt = useMemo(() => {
    if (!currentUserId || !messages) return lastReadAt
    const readAts = messages
      .filter(m => m.sender_id === currentUserId && m.read_at !== null)
      .map(m => m.read_at!)
    if (readAts.length === 0) return lastReadAt
    const maxFromMessages = readAts.reduce((a, b) => (a > b ? a : b))
    if (!lastReadAt) return maxFromMessages
    return lastReadAt > maxFromMessages ? lastReadAt : maxFromMessages
  }, [messages, currentUserId, lastReadAt])
  // 解説: useRef = 再レンダリングを発生させずに値を保持する（WebSocket インスタンス等に使う）
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 解説: mountedRef = コンポーネントがマウント中かどうか（アンマウント後の setState を防ぐ）
  const mountedRef = useRef(true)
  // 解説: dbSaveTimer = IndexedDB への書き込みをデバウンスするタイマー（500ms 待ってから保存）
  const dbSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesRef = useRef<MessageResponse[]>([])

  // 解説: addMessage = 新着メッセージをリストに追加する関数（重複除去・楽観的更新の仮メッセージ除去）
  const addMessage = useCallback((msg: MessageResponse) => {
    setMessages(prev => {
      // 解説: temp- で始まる仮メッセージ（楽観的更新）を同じ内容の確定メッセージで置き換える
      const withoutTemp = (prev ?? []).filter(
        m => !(m.id.startsWith('temp-') &&
          m.content === msg.content &&
          m.sender_id === msg.sender_id)
      )
      // 解説: 既に同じ ID のメッセージがある場合は追加しない（重複防止）
      if (withoutTemp.some(m => m.id === msg.id)) return withoutTemp
      const updated = [...withoutTemp, msg]
      messagesRef.current = updated
      // 解説: 500ms デバウンスで IndexedDB に書き込む（毎メッセージで書くと重いため）
      if (dbSaveTimer.current) clearTimeout(dbSaveTimer.current)
      dbSaveTimer.current = setTimeout(() => {
        dbSet('messages', matchId, messagesRef.current).catch(() => {})
      }, 500)
      return updated
    })
  }, [matchId])

  // 解説: sendTypingStatus = WebSocket で入力中インジケーターを相手に送信する
  const sendTypingStatus = useCallback((isTyping: boolean) => {
    const ws = wsRef.current
    // 解説: OPEN = 接続中の状態番号（WebSocket.OPEN = 1）
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(`typing:${isTyping ? 'start' : 'stop'}:${matchId}`)
  }, [matchId])

  const markRead = useCallback(() => {
    api.post(`/api/messages/${matchId}/read`)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['unread-count'] })
        queryClient.invalidateQueries({ queryKey: ['matches'] })
      })
      .catch(() => {})
  }, [matchId, queryClient])

  // 解説: connect = WebSocket 接続を開始する関数（JWT トークンを Sec-WebSocket-Protocol ヘッダーで渡す）
  const connect = useCallback(async () => {
    if (!mountedRef.current || !matchId) return

    // 解説: getSession() = Supabase の現在のセッション（JWT アクセストークン）を取得する
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return

    // 解説: 既存の接続があれば閉じてから再接続する
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    // 解説: VITE_API_URL の http/https を ws/wss に変換して WebSocket URL を作る
    const base = import.meta.env.VITE_API_URL as string
    const wsUrl = `${base.replace('http', 'ws')}/ws/chat/${matchId}`
    // 解説: new WebSocket(url, [token]) = 第2引数がプロトコル配列（JWT トークンを渡す）
    const ws = new WebSocket(wsUrl, [token])
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setConnected(true)

      // 解説: ping/pong による死活監視（10秒ごとに ping を送り、pong が返らなければ再接続）
      let pongReceived = true

      const pingId = setInterval(() => {
        if (!pongReceived) {
          ws.close()
          return
        }
        pongReceived = false
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 10000)

      // pong を onmessage の前に横取りする
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

    // 解説: onmessage = サーバーからのメッセージを受信したときのハンドラ
    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      if (event.data === 'pong') return
      try {
        const data = JSON.parse(event.data as string)

        // 通常メッセージ（type フィールドなし）
        if (!data.type) {
          addMessage(data as MessageResponse)
          // 解説: invalidateQueries = キャッシュを無効化して次回取得時に再フェッチさせる
          queryClient.invalidateQueries({ queryKey: ['unread-count'] })
          queryClient.invalidateQueries({ queryKey: ['matches'] })
          if (currentUserId && (data as MessageResponse).sender_id !== currentUserId) {
            markRead()
          }
          return
        }

        // 入力中インジケーター
        if (data.type === 'typing') {
          setTypingUserId(data.is_typing ? (data.sender_id as string) : null)
          return
        }

        // 既読通知
        if (data.type === 'read_receipt') {
          // 自分が読んだ通知は無視。相手が「自分の送信を読んだ」時だけ既読表示を進める
          if (data.reader_id && data.reader_id !== currentUserId) {
            setLastReadAt(data.read_at as string)
          }
          return
        }
      } catch {}
    }

    ws.onerror = () => {}

    // 解説: onclose = 接続が切れたとき 3 秒後に再接続する
    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 3000)
    }
  }, [matchId, addMessage, markRead, currentUserId])

  // 解説: loadMore = 過去のメッセージをさらに読み込む（カーソルページネーション）
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await api.get<PaginatedMessages>(`/api/messages/${matchId}?before=${nextCursor}`)
      // 解説: 過去メッセージは先頭に追加する（新しいものが末尾にある想定）
      setMessages(prev => [...res.data.messages, ...(prev ?? [])])
      setHasMore(res.data.has_more)
      setNextCursor(res.data.next_cursor)
    } catch {
      // 失敗時はそのまま
    } finally {
      setLoadingMore(false)
    }
  }, [matchId, nextCursor, loadingMore])

  // 初期ロード（IndexedDB キャッシュ → API）
  useEffect(() => {
    if (!matchId) return
    let cancelled = false

    async function loadMessages() {
      // 解説: TTL = 10分（10 * 60 * 1000 ms）のキャッシュを IndexedDB から取得
      const cached = await dbGet('messages', matchId, 10 * 60 * 1000)
      if (cached && !cancelled) {
        setMessages(cached)
      }
      try {
        const r = await api.get<PaginatedMessages>(`/api/messages/${matchId}`)
        if (!cancelled) {
          setMessages(r.data.messages)
          setHasMore(r.data.has_more)
          setNextCursor(r.data.next_cursor)
          await dbSet('messages', matchId, r.data.messages)
        }
      } catch {
        if (!cancelled && !cached) setMessages([])
      }
    }

    loadMessages()
    // 解説: クリーンアップで cancelled = true にして、アンマウント後の setState を防ぐ
    return () => { cancelled = true }
  }, [matchId])

  // WebSocket 接続
  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (dbSaveTimer.current) clearTimeout(dbSaveTimer.current)
      // 解説: コンポーネントアンマウント時に WebSocket を明示的に閉じる（クリーンアップ）
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  // 既読処理（画面を開いた時 + WS受信時）
  useEffect(() => {
    if (!matchId) return
    markRead()
  }, [matchId, markRead])

  return {
    messages,
    setMessages,
    connected,
    // 解説: isLoading = messages が null のとき（まだ一度も取得できていない状態）
    isLoading: messages === null,
    typingUserId,
    setTypingUserId,
    lastReadAt: effectiveLastReadAt,
    setLastReadAt,
    sendTypingStatus,
    hasMore,
    loadMore,
    loadingMore,
  }
}
