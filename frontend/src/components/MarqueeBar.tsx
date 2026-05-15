import { memo } from 'react'

const DEFAULT_ITEMS = [
  'MATCH', 'NEW USERS', 'TODAY', 'CRUSH', 'U', 'SPRING 2026', 'MATCHING NOW', 'NEW USERS',
]

interface MarqueeBarProps {
  items?: string[]
}

const MarqueeBar = memo(function MarqueeBar({ items = DEFAULT_ITEMS }: MarqueeBarProps) {
  const doubled = [...items, ...items]

  return (
    <div className="relative overflow-hidden bg-ink border-y-2 border-ink h-9 flex items-center">
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="font-mono font-bold text-white text-sm flex items-center gap-3 px-4">
            {item}
            <span className="text-[#DFFF1F]">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
})

export default MarqueeBar
