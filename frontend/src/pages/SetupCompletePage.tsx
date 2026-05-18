import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SetupCompletePage() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/home', { replace: true }), 3000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#DFFF1F', animation: 'fadeIn 0.4s ease' }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <p
        className="font-display text-6xl text-ink text-center leading-none mb-4"
        style={{ fontWeight: 900 }}
      >
        準備完了。
      </p>
      <p className="text-ink text-lg font-medium text-center px-6">
        さあ、キャンパスで出会いを見つけよう。
      </p>
      <button
        type="button"
        onClick={() => navigate('/home', { replace: true })}
        className="mt-8 font-bold text-base border-2 border-ink px-8 py-3"
        style={{
          background: '#0A0A0A',
          color: '#DFFF1F',
          borderRadius: 12,
          boxShadow: '4px 4px 0 0 #0A0A0A',
        }}
      >
        気になる人を探しに行く →
      </button>
      <p className="font-mono text-ink/50 text-sm mt-4 uppercase tracking-widest">
        → AUTO REDIRECT
      </p>
    </div>
  )
}
