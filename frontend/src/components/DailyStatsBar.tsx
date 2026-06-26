interface DailyOption {
  key: string
  label: string
}

interface Props {
  options: DailyOption[]
  percentages: Record<string, number>
  counts: Record<string, number>
  highlightKey: string | null
}

export default function DailyStatsBar({ options, percentages, highlightKey }: Props) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      {options.map((opt) => {
        const pct = percentages[opt.key] ?? 0
        const isHighlight = opt.key === highlightKey
        return (
          <div
            key={opt.key}
            className="rounded-lg border-2 border-ink px-3 py-2"
            style={isHighlight ? { background: 'var(--color-brand)' } : { background: '#fff' }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-bold text-ink">{opt.label}</span>
              <span className="font-accent font-bold text-xs text-ink/70">{pct}%</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(10,10,10,0.12)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: isHighlight ? 'var(--color-ink)' : 'var(--color-brand)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
