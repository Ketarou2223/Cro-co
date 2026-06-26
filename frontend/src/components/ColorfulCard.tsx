// 解説: このファイルはユーザー一覧に表示するカラフルなカードコンポーネントを定義する。
// 解説: 呼ばれる場所: BrowsePage.tsx（おすすめ/全員一覧）・FootprintsPage.tsx 等
// 解説: getUserColor(id) = ユーザーID をハッシュして5色のカードカラーを決定する SSoT
// 解説: motion.button = framer-motion（motion/react）のアニメーション付きボタン要素
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import CrocoIllust from '@/components/CrocoIllust'
import { getDailyStatusMessage } from '@/lib/default-status-messages'
import { getYearLabelShort } from '@/lib/utils'
import { blurStock } from '@/assets/blur'

// hash 5色固定（緑はブランド専有のため含めない）。値の SSoT は index.css の --color-hash-*
const CARD_COLORS = [
  '#FF4D8D', // rose
  '#9D6BFF', // violet
  '#3D9EFF', // azure
  '#FFC02E', // amber
  '#FF7A45', // coral
]

// 解説: hashId(id) = 文字列 ID を 32bit 整数にハッシュする（ポリノミアルローリングハッシュ）
export function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h
}

// 解説: getUserColor(id) = hashId(id) % 5 で CARD_COLORS から1色を返す
export function getUserColor(id: string): string {
  return CARD_COLORS[hashId(id) % CARD_COLORS.length]
}

interface ColorfulCardUser {
  id: string
  name: string | null
  year?: number | null
  avatar_url?: string | null
  status_message?: string | null
  blurred?: boolean
}

interface ColorfulCardProps {
  user: ColorfulCardUser
  // 解説: index = stagger アニメーションの遅延計算に使う（index * 0.06秒）
  index?: number
  // 解説: scoreBadge = 共通の興味数（おすすめカード専用・null のとき非表示）
  scoreBadge?: number | null
}

export default function ColorfulCard({ user, index = 0, scoreBadge }: ColorfulCardProps) {
  const navigate = useNavigate()
  const bgColor = getUserColor(user.id)
  // @copy CRO-label-card-01 Lv1
  const yearLabel = getYearLabelShort(user.year)
  const statusText = user.status_message?.trim() || getDailyStatusMessage(user.id)

  return (
    <motion.button
      type="button"
      className="card-bold overflow-hidden text-left w-full"
      style={{ backgroundColor: bgColor }}
      onClick={() => navigate(`/profile/${user.id}`)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ scale: 1.02, rotate: -0.8 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* 写真（固定アスペクト比 1:1） */}
      <div className="relative w-full aspect-square overflow-hidden">
        {user.blurred ? (
          <>
            {import.meta.env.DEV && console.log('[blur]', user.id, 'index=', hashId(user.id) % 5)}
            <img
              src={blurStock[hashId(user.id) % 5]}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
              style={{ filter: 'blur(18px)' }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'rgba(255,255,255,0.22)' }}
            />
          </>
        ) : user.avatar_url ? (
          // @copy CRO-label-card-02 Lv1
          <img
            src={user.avatar_url}
            alt={user.name ?? 'ユーザー'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CrocoIllust size={80} />
          </div>
        )}

        {/* 写真がある場合の下部グラデーション */}
        {user.avatar_url && (
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: '45%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
            }}
          />
        )}

        {/* 学年 大表示 */}
        {yearLabel && (
          <div
            className="absolute bottom-1 right-2 font-display leading-none select-none z-10"
            style={{
              fontSize: '3.25rem',
              color: user.avatar_url ? '#FFFFFF' : '#0A0A0A',
              opacity: user.avatar_url ? 0.95 : 0.85,
              textShadow: user.avatar_url ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            {yearLabel}
          </div>
        )}

        {/* おすすめ: 共通の興味バッジ */}
        {scoreBadge != null && scoreBadge > 0 && (
          <div className="absolute top-2 left-2 font-mono text-[13px] font-bold bg-brand border-2 border-ink px-1.5 py-0.5 leading-none">
            {/* @copy CRO-label-card-03 Lv1 */}
            共通 {scoreBadge}個
          </div>
        )}
      </div>

      {/* 情報パネル（固定高さ: 名前 + 今日のひとこと） */}
      <div className="bg-white px-3 py-2 border-t-2 border-ink">
        {/* @copy CRO-label-card-04 Lv1 */}
        <p className="font-bold text-sm truncate text-ink">
          {user.name ?? '（未設定）'}
        </p>
        <p className="font-mono text-[13px] italic text-ink/60 truncate mt-0.5">
          {statusText}
        </p>
      </div>
    </motion.button>
  )
}
