import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { defaultRetry } from './lib/queryRetry'
import { ToastProvider } from './contexts/ToastContext'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: defaultRetry,
    },
    mutations: {
      retry: 0,
    },
  },
})

let previousUserId: string | null = null

supabase.auth.onAuthStateChange((event, session) => {
  const currentUserId = session?.user?.id ?? null

  if (event === 'TOKEN_REFRESHED') {
    // トークンリフレッシュ時はキャッシュを保持しつつ再フェッチ
    queryClient.invalidateQueries()
    return
  }

  if (previousUserId && currentUserId !== previousUserId) {
    // ユーザーが切り替わった時のみ全キャッシュをクリア
    queryClient.clear()
  }

  previousUserId = currentUserId
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
