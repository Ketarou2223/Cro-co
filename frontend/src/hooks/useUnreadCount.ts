import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface UnreadCountData {
  unread_messages: number
  unread_matches: number
  unread_views: number
  unread_likes_received: number
}

export function useUnreadCount(enabled: boolean, opts?: { refetchInterval?: number }) {
  return useQuery<UnreadCountData>({
    queryKey: ['unread-count'],
    queryFn: () => api.get<UnreadCountData>('/api/matches/unread-count').then((r) => r.data),
    enabled,
    staleTime: 30_000,
    ...opts,
  })
}
