// 解説: このファイルは Tailwind クラス名を安全に結合するユーティリティを提供する。
// 解説: 呼ばれる場所: shadcn/ui コンポーネント + プロジェクト全体で広く使われる
// 解説: clsx = 条件付きクラス名を結合するライブラリ（falsy な値は無視）
// 解説: tailwind-merge = Tailwind クラスの重複・競合を自動で解決するライブラリ
//   例: cn("p-4", "p-2") → "p-2"（後勝ち）/ cn("bg-red", undefined) → "bg-red"

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// 解説: cn(...inputs) = 可変長クラス名を受け取り、clsx で結合してから tailwind-merge で最終整理する
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const YEAR_LABEL_MAP: Record<number, string> = {
  1: '1年', 2: '2年', 3: '3年', 4: '4年', 5: '5年', 6: '6年',
  7: '修士1年', 8: '修士2年', 9: '博士1年', 10: '博士2年', 11: '博士3年',
}

const YEAR_LABEL_SHORT_MAP: Record<number, string> = {
  7: 'M1', 8: 'M2', 9: 'D1', 10: 'D2', 11: 'D3',
}

export function getYearLabel(year: number | null | undefined): string | null {
  if (year == null) return null
  return YEAR_LABEL_MAP[year] ?? `${year}年`
}

// カード大表示専用: 院生(year>=7)を M1/M2/D1/D2/D3 に短縮する
export function getYearLabelShort(year: number | null | undefined): string | null {
  if (year == null) return null
  if (year >= 7) return YEAR_LABEL_SHORT_MAP[year] ?? getYearLabel(year)
  return getYearLabel(year)
}
