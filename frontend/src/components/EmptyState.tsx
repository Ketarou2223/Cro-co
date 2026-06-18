// 解説: このファイルはリストが空のときに表示する「空状態」の共通コンポーネントを定義する。
// 解説: 呼ばれる場所: MatchesPage.tsx / BrowsePage.tsx 等でデータが0件のときに表示する
// 解説: props: icon（アイコン）, title（見出し）, description（説明）, actionLabel+onAction（ボタン、省略可）

import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { type VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui/button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  // 解説: buttonVariant = shadcn/ui の Button のバリアント（default / outline / ghost 等）
  buttonVariant?: VariantProps<typeof buttonVariants>['variant']
}

export default function EmptyState({ icon, title, description, actionLabel, onAction, buttonVariant = 'default' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      {/* 解説: アイコン（親から ReactNode として渡される。lucide-react アイコンなど） */}
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm text-ink/60 max-w-xs">{description}</p>
      {/* 解説: actionLabel と onAction が両方渡されたときだけボタンを表示する */}
      {actionLabel && onAction && (
        <Button variant={buttonVariant} className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
