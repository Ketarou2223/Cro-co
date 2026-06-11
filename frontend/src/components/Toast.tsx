import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Heart } from 'lucide-react'

type ToastProps = {
  message: string
  show: boolean
  onClose: () => void
  duration?: number
}

export function Toast({ message, show, onClose, duration = 2500 }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{ background: 'var(--color-brand)' }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] border-4 border-ink rounded-2xl px-8 py-6 shadow-[8px_8px_0_0_#0A0A0A] pointer-events-none max-w-[90vw]"
        >
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 shrink-0" style={{ color: '#FF3B6B' }} fill="#FF3B6B" />
            <p className="font-bold text-base text-ink whitespace-nowrap">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
