// 解説: このファイルはトースト通知の UI コンポーネントを定義する。
// 解説: 呼ばれる場所: ToastContext.tsx で <Toast> としてレンダリングされる
// 解説: motion（Framer Motion）= アニメーション付きで表示・非表示を切り替えるライブラリ
// 解説: AnimatePresence = 子コンポーネントのマウント・アンマウント時にアニメーションを実行する

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Heart } from 'lucide-react'

type ToastProps = {
  message: string
  show: boolean
  onClose: () => void
  // 解説: duration = トーストが表示される時間（デフォルト 2500ms）
  duration?: number
}

export function Toast({ message, show, onClose, duration = 2500 }: ToastProps) {
  // 解説: show が true になったとき duration ms 後に onClose を呼んで自動的に閉じる
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, duration)
      // 解説: クリーンアップでタイマーをキャンセル（コンポーネントがアンマウントされた場合）
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  return (
    <AnimatePresence>
      {/* 解説: AnimatePresence = show が false になったときアニメーション後に DOM から削除する */}
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{ background: 'var(--color-brand)' }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] border-4 border-ink rounded-2xl px-8 py-6 shadow-[8px_8px_0_0_#0A0A0A] pointer-events-none max-w-[90vw]"
        >
          {/* 解説: motion.div = Framer Motion のアニメーション付き div */}
          <div className="flex items-center gap-3">
            {/* 解説: like カラー（#FF3B6B）のハートアイコン */}
            <Heart className="w-6 h-6 shrink-0" style={{ color: '#FF3B6B' }} fill="#FF3B6B" />
            <p className="font-bold text-base text-ink whitespace-nowrap">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
