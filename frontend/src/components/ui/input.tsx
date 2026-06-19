// 解説: このファイルは shadcn/ui の Input コンポーネントを定義する。
// 解説: shadcn/ui の規約: cn() で className を合成し、data-slot 属性でスタイルの親子関係を識別する
// 解説: 呼ばれる場所: フォームを含む全ページ（プロフィール編集・ログイン・問い合わせ等）
import * as React from "react"

import { cn } from "@/lib/utils"

// 解説: React.ComponentProps<"input"> = <input> タグが受け取れる全 props を型として継承する
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
