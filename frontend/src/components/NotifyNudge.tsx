import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { subscribePush, isPushSubscribed } from '@/lib/push'

export default function NotifyNudge() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function check() {
      if (!('PushManager' in window)) return
      const subscribed = await isPushSubscribed()
      if (subscribed) return
      if (Notification.permission !== 'default') return

      const count = parseInt(localStorage.getItem('like-send-count') || '0')
      if (count > 0 && count % 3 === 0) {
        setShow(true)
      }
    }
    check()
  }, [])

  const handleEnable = async () => {
    await subscribePush()
    localStorage.setItem('notification-enabled', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 max-w-[480px] mx-auto px-4">
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ background: '#0A0A0A', border: '2px solid var(--color-brand)', boxShadow: '4px 4px 0 0 var(--color-brand)' }}
      >
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-ink" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-xs">通知をオンにしませんか？</p>
          <p className="text-white/50 text-xs">いいねやマッチをすぐ知れる</p>
        </div>
        <button
          type="button"
          onClick={handleEnable}
          className="shrink-0 font-mono text-xs font-bold px-3 py-1.5 border-2 border-brand text-ink"
          style={{ background: 'var(--color-brand)', borderRadius: 6 }}
        >
          ON
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="shrink-0 text-white/40 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
