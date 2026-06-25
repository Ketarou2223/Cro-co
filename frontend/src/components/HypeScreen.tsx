import { useState } from 'react'
import { useTypewriter } from '@/hooks/useTypewriter'
import CrocoIllust from '@/components/CrocoIllust'

// モジュールスコープ＝アンマウントを跨いで保持される進行ロック。
// 「最後の進行から一定時間内のタップ」を無視し、remount貫通タップ/二重発火を断つ。
let lastProgressAt = 0
const PROGRESS_LOCK_MS = 300

interface HypeScreenProps {
  lines: string[]
  buttonLabel: string
  onNext: () => void
  showCroco?: boolean
}

export default function HypeScreen({
  lines,
  buttonLabel,
  onNext,
  showCroco = false,
}: HypeScreenProps) {
  const [currentLine, setCurrentLine] = useState(0)
  const currentText = lines[currentLine] ?? ''
  const { displayed, isComplete, reveal } = useTypewriter(currentText, { speedMs: 40 })

  const lineDone = isComplete && displayed === currentText
  const isLastLine = currentLine === lines.length - 1
  const showButton = lineDone && isLastLine

  const handleContainerTap = () => {
    const now = Date.now()
    if (now - lastProgressAt < PROGRESS_LOCK_MS) return // 貫通/二重タップを丸ごと無視
    if (!lineDone) {
      lastProgressAt = now
      reveal()
    } else if (!isLastLine) {
      lastProgressAt = now
      setCurrentLine((p) => p + 1)
    }
    // 最終行はコンテナでは進めない（遷移はボタン専任）
  }

  const handleButton = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    const now = Date.now()
    if (now - lastProgressAt < PROGRESS_LOCK_MS) return
    lastProgressAt = now
    onNext()
  }

  return (
    <div
      className="h-[100dvh] w-full max-w-[480px] mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))] select-none touch-manipulation overscroll-contain cursor-pointer"
      onClick={handleContainerTap}
    >
      {showCroco && (
        <div className="mb-4 shrink-0">
          <CrocoIllust size={56} />
        </div>
      )}

      {/* 全行ぶんの高さを最初から確保＝centerが動かない（総高さ一定） */}
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-3 overflow-y-auto">
        {lines.map((line, i) => (
          <div key={i} className="relative">
            {/* 不可視スペーサ: 最終形の折返し高さを先取り */}
            <p aria-hidden className="invisible text-xl font-bold leading-relaxed whitespace-pre-wrap">
              {line}
            </p>
            {/* 可視オーバーレイ */}
            <p className="absolute inset-0 text-xl font-bold text-ink leading-relaxed whitespace-pre-wrap">
              {i < currentLine ? line : i === currentLine ? displayed : ''}
              {i === currentLine && !lineDone && (
                <span className="ml-0.5 inline-block animate-pulse text-brand">|</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="h-6 shrink-0 flex items-center justify-center">
        {lineDone && !isLastLine && (
          <span className="text-xs font-mono text-ink/40 animate-pulse">タップで次へ</span>
        )}
      </div>

      <div className="shrink-0">
        {showButton && (
          <button
            type="button"
            className="w-full py-4 rounded-xl font-bold text-ink bg-brand border-2 border-ink shadow-[4px_4px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-[box-shadow,transform] duration-75"
            onClick={handleButton}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  )
}