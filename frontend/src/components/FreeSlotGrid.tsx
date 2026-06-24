// 空きコマグリッド（5×5）。SSoT: index↔[曜日][時限] のマッピングと文字列⇔配列変換をここに集約。
// free_slots = 25桁の "0"/"1" 文字列。行優先（月1,月2,…月5,火1,…,金5）。0=空き / 1=授業。

const DAYS = ['月', '火', '水', '木', '金'] as const
const PERIODS = [1, 2, 3, 4, 5] as const
const SLOT_COUNT = 25

export const EMPTY_FREE_SLOTS = '0'.repeat(SLOT_COUNT)

// index = 曜日 * 5 + (時限 - 1)。行優先固定。
function cellIndex(dayIdx: number, periodIdx: number): number {
  return dayIdx * 5 + periodIdx
}

export function isValidFreeSlots(v: string | null | undefined): v is string {
  return typeof v === 'string' && /^[01]{25}$/.test(v)
}

type Props = {
  value: string | null | undefined
  editable?: boolean
  onChange?: (next: string) => void
}

export default function FreeSlotGrid({ value, editable = false, onChange }: Props) {
  const slots = isValidFreeSlots(value) ? value : EMPTY_FREE_SLOTS

  const toggle = (idx: number) => {
    if (!editable || !onChange) return
    const arr = slots.split('')
    arr[idx] = arr[idx] === '1' ? '0' : '1'
    onChange(arr.join(''))
  }

  return (
    <div className="inline-block">
      {/* ヘッダ行（曜日） */}
      <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1">
        <div className="w-6" />
        {DAYS.map((d) => (
          <div key={d} className="text-center font-mono text-xs text-ink/60 py-1">
            {d}
          </div>
        ))}
        {/* 各時限の行 */}
        {PERIODS.map((p, pi) => (
          <div key={p} className="contents">
            <div className="flex items-center justify-center font-mono text-xs text-ink/60 w-6">
              {p}
            </div>
            {DAYS.map((d, di) => {
              const idx = cellIndex(di, pi)
              const busy = slots[idx] === '1'
              return (
                <button
                  key={`${d}-${p}`}
                  type="button"
                  onClick={() => toggle(idx)}
                  disabled={!editable}
                  aria-label={`${d}曜${p}限 ${busy ? '授業' : '空き'}`}
                  className={[
                    'aspect-square rounded-md border-2 border-ink transition-colors',
                    busy ? 'bg-brand' : 'bg-paper',
                    editable ? 'cursor-pointer' : 'cursor-default',
                  ].join(' ')}
                />
              )
            })}
          </div>
        ))}
      </div>
      {editable && (
        <p className="mt-2 font-mono text-xs text-ink/40">タップで「授業」（緑）に切替</p>
      )}
    </div>
  )
}
