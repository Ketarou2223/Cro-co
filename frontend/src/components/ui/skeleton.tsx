// 解説: このファイルは shadcn/ui の Skeleton コンポーネントを定義する。
// 解説: animate-pulse = Tailwind のパルスアニメーション（明滅して「読み込み中」を表現）
// 解説: 呼ばれる場所: 管理者ダッシュボード等でデータ取得中のプレースホルダーとして使う
import * as React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
  )
}

export { Skeleton }
