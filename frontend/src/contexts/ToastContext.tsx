import { createContext, useContext, useState, type ReactNode } from 'react'
import { Toast } from '@/components/Toast'

type ToastContextValue = {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [show, setShow] = useState(false)

  const showToast = (msg: string) => {
    setMessage(msg)
    setShow(true)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast message={message} show={show} onClose={() => setShow(false)} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
