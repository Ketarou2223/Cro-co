import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'

export default function SetupCompletePage() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/home', { replace: true }), 3000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#0A0A0A' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center px-8"
      >
        <p
          className="font-display text-6xl text-white text-center leading-none mb-4"
          style={{ fontWeight: 900 }}
        >
          さあ、始めよう。
        </p>
        <p className="text-white/60 text-lg font-medium text-center mb-8">
          あなたのことを待っている人が、きっといる。
        </p>
        <button
          type="button"
          onClick={() => navigate('/home', { replace: true })}
          className="font-bold text-base px-8 py-3"
          style={{
            background: '#DFFF1F',
            color: '#0A0A0A',
            border: '2px solid #DFFF1F',
            borderRadius: 12,
          }}
        >
          Cro-co を始める →
        </button>
        <p className="font-mono text-white/30 text-xs mt-5 tracking-widest">
          いつでもプロフィールは編集できます
        </p>
      </motion.div>
    </div>
  )
}
