// 解説: このファイルはオンボーディング完了後に表示するウェルカム画面を定義する。
// 解説: 遷移元: SetupNotifyPage.tsx（最終ステップ）完了後
// 解説: 3秒後に /home へ自動遷移する（「始める」ボタンでも即遷移可）
// 解説: refetchQueries(['profile-me']) = キャッシュを最新化してからホームへ遷移することで古いステータスを表示しない
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'

export default function SetupCompletePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    // 解説: 先に refetch を開始しておき、3秒タイマーが終わったとき完了していれば待たずに遷移する
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
        {/* @copy CRO-heading-setup-complete-01 Lv2 */}
        <p
          className="font-display text-3xl text-white text-center leading-tight mb-4"
          style={{ fontWeight: 900 }}
        >
          さあ、始めましょう。
        </p>
        {/* @copy CRO-onboarding-setup-complete-01 Lv2 */}
        <p className="text-white/60 text-lg font-medium text-center mb-8">
          あなたを待っている人が、きっといます。
        </p>
        <button
          type="button"
          onClick={handleStart}
          className="font-bold text-base px-8 py-3"
          style={{
            background: 'var(--color-brand)',
            color: '#0A0A0A',
            border: '2px solid var(--color-brand)',
            borderRadius: 12,
          }}
        >
          {/* @copy CRO-button-setup-complete-01 Lv1 */}
          Cro-co を始める →
        </button>
        {/* @copy CRO-label-setup-complete-01 Lv1 */}
        <p className="text-white/30 text-xs mt-5 tracking-widest">
          いつでもプロフィールは編集できます
        </p>
      </motion.div>
    </div>
  )
}
