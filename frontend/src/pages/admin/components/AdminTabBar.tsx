// 解説: このファイルは管理ダッシュボードのタブバーコンポーネントを定義する。
// 解説: 各タブ（概要/ユーザー/審査/写真/通報/問い合わせ/ログ）のアイコン・ラベル・未処理バッジを表示する
// 解説: pendingCount / pendingPhotoCount / reportPendingCount / inquiryUnreadCount = バッジ数（0なら非表示）
import { Activity, AlertTriangle, Bell, Clock, ImageIcon, MessageSquare, ScrollText, Users } from 'lucide-react'
import type { AdminTab } from '../types'

interface Props {
  active: AdminTab
  onChange: (tab: AdminTab) => void
  pendingCount?: number
  pendingPhotoCount?: number
  reportPendingCount?: number
  inquiryUnreadCount?: number
}

const TABS: { key: AdminTab; label: string; Icon: typeof Activity }[] = [
  { key: 'overview',       label: '概要',        Icon: Activity },
  { key: 'users',          label: 'ユーザー',     Icon: Users },
  { key: 'pending',        label: '審査',         Icon: Clock },
  { key: 'photos',         label: '写真審査',     Icon: ImageIcon },
  { key: 'reports',        label: '通報',         Icon: AlertTriangle },
  { key: 'inquiries',      label: '問い合わせ',   Icon: MessageSquare },
  { key: 'logs',           label: 'ログ',         Icon: ScrollText },
  { key: 'announcements',  label: 'お知らせ配信', Icon: Bell },
]

export default function AdminTabBar({
  active,
  onChange,
  pendingCount,
  pendingPhotoCount,
  reportPendingCount,
  inquiryUnreadCount,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex border-2 border-ink rounded-xl overflow-hidden min-w-max">
        {TABS.map((t, i) => {
          const isActive = active === t.key
          const badge =
            t.key === 'pending'   ? pendingCount :
            t.key === 'photos'    ? pendingPhotoCount :
            t.key === 'reports'   ? reportPendingCount :
            t.key === 'inquiries' ? inquiryUnreadCount :
            undefined
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                isActive ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-gray-50'
              } ${i !== 0 ? 'border-l-2 border-ink' : ''}`}
            >
              <t.Icon className="w-3.5 h-3.5" />
              {t.label}
              {badge != null && badge > 0 && (
                <span
                  className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{
                    background: isActive ? 'var(--color-brand)' : 'var(--color-danger)',
                    color: isActive ? '#0A0A0A' : '#FFFFFF',
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
