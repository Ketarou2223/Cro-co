// 解説: このファイルは shadcn/ui の Textarea コンポーネントを定義する。
// 解説: Input と同様に React.ComponentProps で <textarea> の全 props を継承する
// 解説: 呼ばれる場所: ContactPage.tsx（問い合わせ文）/ ProfileEditPage.tsx（自己紹介）等
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-h-[80px] rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
