// 解説: このファイルは shadcn/ui の Label コンポーネントを定義する。
// 解説: Radix UI の Label.Root = input と htmlFor で紐付けるアクセシブルなラベル要素
// 解説: 呼ばれる場所: FacultySelector.tsx / フォームページ全般
import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
