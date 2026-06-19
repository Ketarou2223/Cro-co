// 解説: このファイルはデータ取得失敗時に表示するエラー状態コンポーネントを定義する。
// 解説: 呼ばれる場所: 各ページで useQuery が isError になったときのフォールバック表示
// 解説: CLAUDE.md §7「赤いアラートボックス禁止」に従い、アイコン + テキストのシンプルな表示

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  // 解説: onRetry = 省略可能（渡すと「再試行」ボタンが表示される）
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-ink/60">
      {/* 解説: AlertCircle = lucide-react の警告アイコン（絵文字禁止ルールに従い SVG アイコン使用） */}
      <AlertCircle className="w-10 h-10 text-destructive/70" />
      <p className="text-sm text-center">{message}</p>
      {/* 解説: onRetry が渡された場合のみ「再試行」ボタンを表示する */}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {/* @copy CRO-button-error-state-01 Lv1 */}
          再試行
        </Button>
      )}
    </div>
  )
}
