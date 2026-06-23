import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const RT_ON = import.meta.env.VITE_REALTIME_ENABLED === 'true'

export function useRealtimeSignals(userId: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!RT_ON || !userId) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    ;(async () => {
      // プライベートチャンネル認証（現在のセッショントークンを realtime に反映）
      await supabase.realtime.setAuth()
      if (cancelled) return
      channel = supabase
        .channel(`user:${userId}`, { config: { private: true } })
        .on('broadcast', { event: 'change' }, ({ payload }) => {
          if (payload?.kind === 'message') {
            queryClient.invalidateQueries({ queryKey: ['unread-count'] })
            queryClient.invalidateQueries({ queryKey: ['matches'] })
          }
        })
        .subscribe()
    })()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
