// 解説: このファイルは shadcn/ui の Switch コンポーネントを定義する。
// 解説: data-[state=checked] = Radix UI がチェック状態のとき付与する属性（bg-brand で緑表示）
// 解説: data-[state=unchecked] = 未チェック時は bg-white（白地）で表示
// 解説: 呼ばれる場所: SettingsPage.tsx 等のオン/オフ設定項目
import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-ink transition-colors outline-none",
        "data-[state=checked]:bg-brand data-[state=unchecked]:bg-white",
        "focus-visible:ring-2 focus-visible:ring-ink",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-ink shadow-sm",
          "transition-transform duration-200",
          "data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
