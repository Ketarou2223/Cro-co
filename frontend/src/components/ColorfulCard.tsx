import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'

const CARD_COLORS = [
  '#FFE94D', // yellow
  '#FF7DA8', // pink
  '#FF7A3D', // orange
  '#6BB5FF', // blue
  '#8AE8B5', // green
  '#C9A8FF', // purple
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h
}

interface ColorfulCardUser {
  id: string
  name: string | null
  age?: number | null
  year?: number | null
  faculty?: string | null
  department?: string | null
  bio?: string | null
  avatar_url?: string | null
  interests?: string[]
  clubs?: string[]
  status_message?: string | null
}

interface ColorfulCardProps {
  user: ColorfulCardUser
  index?: number
  scoreBadge?: number | null
}

export default function ColorfulCard({ user, index = 0, scoreBadge }: ColorfulCardProps) {
  const navigate = useNavigate()
  const bgColor = CARD_COLORS[hashId(user.id) % CARD_COLORS.length]
  const ageLabel = user.age != null ? String(user.age) : user.year != null ? `${user.year}年` : null
  const tags = (user.interests ?? []).slice(0, 3)

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
      {/* 上半分: アバター */}
      <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name ?? 'ユーザー'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            👤
          </div>
        )}

        {/* 写真がある場合の下部グラデーション */}
        {user.avatar_url && (
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: '40%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
            }}
          />
        )}

        {/* 年齢・学年 大表示 */}
        {ageLabel && (
          <div
            className="absolute bottom-1 right-2 font-display leading-none select-none z-10"
            style={{
              fontSize: '3.5rem',
              color: user.avatar_url ? '#FFFFFF' : '#0A0A0A',
              opacity: user.avatar_url ? 0.95 : 0.85,
              textShadow: user.avatar_url ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            {ageLabel}
          </div>
        )}

        {/* 共通の興味バッジ */}
        {scoreBadge != null && scoreBadge > 0 && (
          <div className="absolute top-2 left-2 font-mono text-[10px] font-bold bg-acid border-2 border-ink px-1.5 py-0.5 leading-none">
            共通 {scoreBadge}個
          </div>
        )}
      </div>

      {/* 下半分: 情報パネル */}
      <div className="bg-white px-3 pt-2 pb-1 border-t-2 border-ink">
        <p className="font-bold text-sm truncate text-ink">
          {user.name ?? '（未設定）'}
        </p>
        {user.faculty && (
          <p className="text-[11px] text-gray-500 truncate">
            {user.faculty}
            {user.department && <span className="text-gray-400"> · {user.department}</span>}
          </p>
        )}
        {user.status_message ? (
          <p className="font-mono text-[11px] italic text-gray-500 truncate mt-0.5">
            {user.status_message}
          </p>
        ) : user.bio ? (
          <p className="text-[11px] text-gray-600 line-clamp-1 mt-0.5">{user.bio}</p>
        ) : null}
      </div>

      {/* タグ */}
      {(tags.length > 0 || (user.clubs && user.clubs.length > 0)) && (
        <div className="bg-white px-3 pb-2 flex flex-wrap gap-1 border-t border-gray-100">
          {tags.map((tag) => (
            <span key={tag} className="tag-pill text-ink">
              #{tag}
            </span>
          ))}
          {user.clubs && user.clubs.length > 0 && (
            <span className="tag-pill text-ink">
              {user.clubs[0]}
              {user.clubs.length > 1 && <span className="text-ink/60 ml-0.5">他{user.clubs.length - 1}個</span>}
            </span>
          )}
        </div>
      )}
    </motion.button>
  )
}
