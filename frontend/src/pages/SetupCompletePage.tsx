import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'

export default function SetupCompletePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    // マウント時に refetch を開始（バックグラウンド進行）
    const refetchPromise = queryClient
      .refetchQueries({ queryKey: ['profile-me'] })
      .catch(() => {})

    const t = setTimeout(async () => {
      // refetch がまだ進行中なら待ってから遷移
      await refetchPromise
      navigate('/home', { replace: true })
    }, 3000)
    return () => clearTimeout(t)
  }, [navigate, queryClient])

  const handleStart = async () => {
    try {
      await queryClient.refetchQueries({ queryKey: ['profile-me'] })
    } catch {
      // 失敗しても進む
    }
    navigate('/home', { replace: true })
  }

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
          onClick={handleStart}
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
