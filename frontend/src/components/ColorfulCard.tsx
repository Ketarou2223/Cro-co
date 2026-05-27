import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import CrocoIllust from '@/components/CrocoIllust'
import { getDefaultStatusMessage } from '@/lib/default-status-messages'

const CARD_COLORS = [
  '#FFE94D', // yellow
  '#FF7DA8', // pink
  '#FF7A3D', // orange
  '#6BB5FF', // blue
  '#8AE8B5', // green
  '#C9A8FF', // purple
]

export function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h
}

export function getUserColor(id: string): string {
  return CARD_COLORS[hashId(id) % CARD_COLORS.length]
}

interface ColorfulCardUser {
  id: string
  name: string | null
  year?: number | null
  avatar_url?: string | null
  status_message?: string | null
}

interface ColorfulCardProps {
  user: ColorfulCardUser
  index?: number
  scoreBadge?: number | null
}

export default function ColorfulCard({ user, index = 0, scoreBadge }: ColorfulCardProps) {
  const navigate = useNavigate()
  const bgColor = getUserColor(user.id)
  const yearLabel = user.year != null ? `${user.year}年` : null
  const statusText = user.status_message?.trim() || getDefaultStatusMessage(user.id)

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
      <div className="relative w-full aspect-square">
        {user.avatar_url ? (
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
          <div className="absolute top-2 left-2 font-mono text-[10px] font-bold bg-acid border-2 border-ink px-1.5 py-0.5 leading-none">
            共通 {scoreBadge}個
          </div>
        )}
      </div>

      {/* 情報パネル（固定高さ: 名前 + 今日のひとこと） */}
      <div className="bg-white px-3 py-2 border-t-2 border-ink">
        <p className="font-bold text-sm truncate text-ink">
          {user.name ?? '（未設定）'}
        </p>
        <p className="font-mono text-[11px] italic text-gray-500 truncate mt-0.5">
          {statusText}
        </p>
      </div>
    </motion.button>
  )
}
