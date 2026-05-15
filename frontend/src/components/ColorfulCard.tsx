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
  bio?: string | null
  avatar_url?: string | null
  interests?: string[]
}

interface ColorfulCardProps {
  user: ColorfulCardUser
  index?: number
}

export default function ColorfulCard({ user, index = 0 }: ColorfulCardProps) {
  const navigate = useNavigate()
  const bgColor = CARD_COLORS[hashId(user.id) % CARD_COLORS.length]
  const displayAge = user.age ?? (user.year != null ? user.year : null)
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

        {/* 年齢・学年 大表示 */}
        {ageLabel && (
          <div
            className="absolute bottom-1 right-2 font-display leading-none select-none"
            style={{ fontSize: '3.5rem', color: '#0A0A0A', opacity: 0.85 }}
          >
            {ageLabel}
          </div>
        )}
      </div>

      {/* 下半分: 情報パネル */}
      <div className="bg-white px-3 pt-2 pb-1 border-t-2 border-ink">
        <p className="font-bold text-sm truncate text-ink">
          {user.name ?? '（未設定）'}
        </p>
        {user.faculty && (
          <p className="text-[11px] text-gray-500 truncate">{user.faculty}</p>
        )}
        {user.bio && (
          <p className="text-[11px] text-gray-600 line-clamp-1 mt-0.5">{user.bio}</p>
        )}
      </div>

      {/* タグ */}
      {tags.length > 0 && (
        <div className="bg-white px-3 pb-2 flex flex-wrap gap-1 border-t border-gray-100">
          {tags.map((tag) => (
            <span key={tag} className="tag-pill text-ink">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  )
}
