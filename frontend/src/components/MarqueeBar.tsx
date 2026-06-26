// 解説: このファイルは横スクロールするマーキーバーコンポーネントを定義する。
// 解説: 呼ばれる場所: Layout.tsx でヘッダー直下に常時表示される
// 解説: CLAUDE.md §7 マーキーバー仕様: 黒背景・白文字・Space Mono・uppercase・高さ36px・区切り◆
// 解説: memo = コンポーネントの不要な再レンダリングを防ぐ最適化（props が変わらなければ再描画しない）

import { memo } from 'react'

// マーキーはキャッチコピー演出面（マイクロコピーの です/ます 規範の対象外・変更はオーナー判断）
const DEFAULT_ITEMS = [
  // @copy CRO-label-marquee-01 Lv2
  'CLOSER THAN YOU THINK',
  'OSAKA UNIV. ONLY',
  // @copy CRO-label-marquee-02 Lv2
  'MEET FIRST',
  // @copy CRO-label-marquee-03 Lv1
  'ID VERIFIED',
  'TODAY ON CAMPUS',
  // @copy CRO-label-marquee-04 Lv2
  'COLOR YOUR EVERYDAY',
  'VERIFIED MEMBERS',
  // @copy CRO-label-marquee-05 Lv2
  'SOMEONE OUT THERE',
]

interface MarqueeBarProps {
  items?: string[]
}

const MarqueeBar = memo(function MarqueeBar({ items = DEFAULT_ITEMS }: MarqueeBarProps) {
  // 解説: doubled = リストを2倍に複製して「繋ぎ目なし」の無限スクロールを実現する
  const doubled = [...items, ...items]

  return (
    <div className="relative overflow-hidden bg-ink border-y-2 border-ink h-9 flex items-center">
      {/* 解説: animate-marquee = index.css で定義した横スクロールアニメーション */}
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="font-accent font-bold text-white text-sm flex items-center gap-3 px-4">
            {item}
            {/* 解説: ◆ = 区切り記号（brand カラーで表示） */}
            <span className="text-brand">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
})

export default MarqueeBar
