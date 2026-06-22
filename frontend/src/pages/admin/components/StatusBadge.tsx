// 解説: このファイルはユーザーステータスバッジコンポーネントを定義する（管理画面専用）。
// 解説: status → CONFIG マップで表示ラベル・背景色・文字色を決定して badge として返す
// 解説: 4種: pending_review（審査待ち）/ approved（承認済み）/ rejected（却下）/ banned（BAN）
import type { UserStatus } from '../types'

interface Props {
  status: UserStatus
}

const CONFIG: Record<UserStatus, { label: string; bg: string; fg: string }> = {
  pending_review: { label: '審査待ち', bg: 'var(--color-warning)', fg: '#0A0A0A' },
  approved:       { label: '承認済み', bg: 'var(--color-success)', fg: '#0A0A0A' },
  rejected:       { label: '却下',     bg: 'var(--color-danger)', fg: '#FFFFFF' },
  banned:         { label: 'BAN',      bg: '#0A0A0A', fg: 'var(--color-danger)' },
  deleted:        { label: '退会済み', bg: 'var(--color-bone)',    fg: '#0A0A0A' },
}

const FALLBACK: { label: string; bg: string; fg: string } = { label: '不明', bg: 'var(--color-bone)', fg: '#0A0A0A' }

export default function StatusBadge({ status }: Props) {
  const c = CONFIG[status] ?? FALLBACK
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
