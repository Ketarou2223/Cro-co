import { useRef, useState } from 'react'
import { ALL_CLUBS } from '@/lib/osaka-u-data'

interface ClubSelectorProps {
  selected: string[]
  onChange: (clubs: string[]) => void
  maxCount?: number
  placeholder?: string
}

export default function ClubSelector({
  selected,
  onChange,
  maxCount = 5,
  placeholder,
}: ClubSelectorProps) {
  const ph = placeholder ?? `サークルを検索...（最大${maxCount}個）`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? (ALL_CLUBS as readonly string[])
        .filter((c) => c.includes(query) && !selected.includes(c))
        .slice(0, 10)
    : []

  const handleAdd = (club: string) => {
    if (selected.length >= maxCount) return
    if (selected.includes(club)) return
    onChange([...selected, club])
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleRemove = (club: string) => {
    onChange(selected.filter((c) => c !== club))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={selected.length >= maxCount}
          placeholder={ph}
          className="w-full h-10 border-2 border-ink bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {open && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-white border-2 border-ink border-t-0 max-h-48 overflow-y-auto shadow-[4px_4px_0_0_#0A0A0A]">
            {filtered.map((club) => (
              <button
                key={club}
                type="button"
                onMouseDown={() => handleAdd(club)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-acid/20 font-medium transition-colors"
              >
                {club}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((club) => (
            <span key={club} className="tag-pill flex items-center gap-1">
              {club}
              <button
                type="button"
                onClick={() => handleRemove(club)}
                className="ml-0.5 text-ink/60 hover:text-ink leading-none"
                aria-label={`${club}を削除`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.length >= maxCount && (
        <p className="font-mono text-xs text-ink/50">{maxCount}個まで登録できます。</p>
      )}
    </div>
  )
}
