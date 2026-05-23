import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

type ToastContextValue = {
  show: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = (msg: string) => {
    setToast(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3000)
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 bg-ink text-white border-2 border-ink px-4 py-2 rounded-lg text-sm font-bold"
          style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          {toast}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useAdminToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useAdminToast must be used within AdminToastProvider')
  return ctx
}
