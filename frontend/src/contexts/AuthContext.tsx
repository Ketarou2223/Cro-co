import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    console.log('[AuthContext] initializing')

    const getSessionWithTimeout = Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('getSession timeout')), 5000)
      ),
    ])

    let subscription: { unsubscribe: () => void } | null = null

    const init = async () => {
      try {
        console.log('[AuthContext] calling getSession')
        const result = await getSessionWithTimeout
        const { data, error } = result as Awaited<ReturnType<typeof supabase.auth.getSession>>
        if (error) {
          console.warn('[AuthContext] getSession error:', error.message)
          setSession(null)
        } else {
          console.log('[AuthContext] getSession success, user:', data.session?.user?.email ?? 'none')
          setSession(data.session)
        }
      } catch (e) {
        console.warn('[AuthContext] getSession failed or timed out:', e)
        setSession(null)
      } finally {
        console.log('[AuthContext] initialized')
        setLoading(false)
      }
    }

    init()

    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[AuthContext] onAuthStateChange:', _event, newSession?.user?.email ?? 'none')
      setSession(newSession)
    })
    subscription = sub

    return () => {
      console.log('[AuthContext] cleanup')
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext)
}
