import type { UserStatus } from '../types'

interface Props {
  status: UserStatus
}

const CONFIG: Record<UserStatus, { label: string; bg: string; fg: string }> = {
  pending_review: { label: '審査待ち', bg: '#FFE94D', fg: '#0A0A0A' },
  approved:       { label: '承認済み', bg: '#A8F0D1', fg: '#0A0A0A' },
  rejected:       { label: '却下',     bg: '#FF3B6B', fg: '#FFFFFF' },
  banned:         { label: 'BAN',      bg: '#0A0A0A', fg: '#FF3B6B' },
}

export default function StatusBadge({ status }: Props) {
  const c = CONFIG[status]
  return (
    <span
      className="inline-block font-mono text-[11px] font-bold px-2 py-0.5 uppercase tracking-wide"
      style={{
        background: c.bg,
        color: c.fg,
        border: '2px solid #0A0A0A',
        borderRadius: 4,
      }}
    >
      {c.label}
    </span>
  )
}
