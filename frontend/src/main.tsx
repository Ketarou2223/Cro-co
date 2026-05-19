import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
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
      retry: 1,
    },
  },
})

let previousUserId: string | null = null

supabase.auth.onAuthStateChange((_event, session) => {
  const currentUserId = session?.user?.id ?? null
  if (previousUserId && currentUserId !== previousUserId) {
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
