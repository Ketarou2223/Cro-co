// 解説: このファイルはマッチ成立時のアニメーションモーダルコンポーネントを定義する。
// 解説: 呼ばれる場所: BrowsePage.tsx のいいね送信後に is_match = true のとき表示する
// 解説: 機能: confetti アニメーション + 自分・相手のアバター表示 + チャット誘導ボタン
// 解説: matchMessage = マウント時1回だけランダム選択（useState の lazy initializer で固定）

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Heart, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

// 解説: pickRandom<T>(items) = 配列からランダムに1件選ぶ汎用ヘルパ
function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

interface MatchedUser {
  name: string | null
  avatar_url: string | null
}

interface MatchModalProps {
  isOpen: boolean
  onClose: () => void
  matchedUser: MatchedUser
  myAvatarUrl?: string | null
}

export default function MatchModal({ isOpen, onClose, matchedUser, myAvatarUrl }: MatchModalProps) {
  const navigate = useNavigate()
  // 解説: useState(() => pickRandom(...)) = マウント時1回だけランダム選択して固定する
  const [matchMessage] = useState(() =>
    pickRandom([
      // @copy CRO-banner-match-modal-01 Lv2
      'マッチしました！さっそく話しかけてみましょう。',
      // @copy CRO-banner-match-modal-02 Lv2
      'マッチが成立しました。最初のひとことを送ってみませんか。',
      // @copy CRO-banner-match-modal-03 Lv2
      'マッチしました！どんな会話になるか楽しみですね。',
    ] as const)
  )

  // 解説: useMemo = 18個のダイヤ confetti のパラメータを1回だけ計算して再利用する
  const diamonds = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${(i / 18) * 100 + (Math.random() * 5)}%`,
      delay: Math.random() * 1.2,
      size: Math.random() * 10 + 7,
      duration: Math.random() * 1.5 + 2,
      repeatDelay: Math.random() * 2 + 0.5,
    })),
  [])

  const handleChat = () => {
    navigate('/matches')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden"
          style={{ backgroundColor: 'rgba(10,10,10,0.92)' }}
          onClick={onClose}
        >
          {/* 落下するダイヤ confetti */}
          {diamonds.map((d) => (
            <motion.div
              key={d.id}
              className="absolute pointer-events-none"
              style={{
                left: d.left,
                top: -d.size * 2,
                width: d.size,
                height: d.size,
                backgroundColor: 'var(--color-brand)',
                transform: 'rotate(45deg)',
              }}
              animate={{
                y: ['0vh', '115vh'],
                rotate: [45, 405],
                opacity: [0.9, 0.5, 0],
              }}
              transition={{
                duration: d.duration,
                delay: d.delay,
                ease: 'easeIn',
                repeat: Infinity,
                repeatDelay: d.repeatDelay,
              }}
            />
          ))}

          {/* 解説: spring アニメーションで下から滑り上がるモーダルカード */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-[480px] rounded-t-3xl px-8 pt-10 pb-12 space-y-7 text-center"
            style={{
              backgroundColor: '#0A0A0A',
              border: '2px solid var(--color-brand)',
              borderBottom: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* タイトル */}
            <div>
              <p
                className="leading-none"
                style={{
                  fontFamily: "'Noto Sans JP', sans-serif",
                  fontWeight: 900,
                  fontSize: '3.2rem',
                  color: 'var(--color-brand)',
                  letterSpacing: '-0.02em',
                }}
              >
                IT'S A MATCH.
              </p>
            </div>

            {/* アバター + ハート */}
            <div className="flex items-center justify-center gap-5">
              <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shrink-0">
                {myAvatarUrl ? (
                  // @copy CRO-label-match-modal-01 Lv1
                  <img src={myAvatarUrl} alt="自分" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-700">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* 解説: ハートをパルスアニメーション（0.7秒周期で大きくなる） */}
              <motion.div
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.6 }}
              >
                <Heart className="w-12 h-12" style={{ color: 'var(--color-like)' }} fill="var(--color-like)" />
              </motion.div>

              <div className="w-20 h-20 rounded-full border-4 overflow-hidden shrink-0" style={{ borderColor: 'var(--color-brand)' }}>
                {matchedUser.avatar_url ? (
                  // @copy CRO-label-match-modal-02 Lv1
                  <img src={matchedUser.avatar_url} alt={matchedUser.name ?? '相手'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-700">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            <p className="text-white text-xl font-bold leading-snug">
              {matchMessage}
            </p>

            <div className="space-y-3">
              <Button variant="brand" className="w-full h-12 text-base" onClick={handleChat}>
                {/* @copy CRO-button-match-modal-01 Lv2 */}
                話しかけてみる
              </Button>
              <button
                type="button"
                className="w-full h-12 rounded-lg border-2 border-white text-white font-bold text-sm hover:bg-white/10 transition-colors"
                onClick={onClose}
              >
                {/* @copy CRO-button-match-modal-02 Lv1 */}
                あとで
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
