import { useEffect, useState } from 'react'
import { useTypewriter } from '@/hooks/useTypewriter'
import CrocoIllust from '@/components/CrocoIllust'

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

  // マウント直後の誤タップ（前画面ボタンからのゴーストクリック）を一定時間ブロック
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 280)
    return () => clearTimeout(t)
  }, [])

  // 行送り直後は前行の isComplete=true が1フレーム残るため、
  // displayed === currentText を併用して位相ずれ（ボタンのチラつき）を消す。
  const lineDone = isComplete && displayed === currentText
  const isLastLine = currentLine === lines.length - 1
  const showButton = lineDone && isLastLine

  const handleContainerTap = () => {
    if (!ready) return
    if (!lineDone) {
      reveal()                       // タイプ中 → 即全表示
    } else if (!isLastLine) {
      setCurrentLine((p) => p + 1)   // 次の文へ
    }
    // 最終行完了後はコンテナタップでは進めない（画面遷移はボタン専任）
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

      <div className="flex-1 min-h-0 flex flex-col justify-center gap-3 overflow-y-auto">
        {lines.slice(0, currentLine).map((line, i) => (
          <p key={i} className="text-xl font-bold text-ink leading-relaxed">
            {line}
          </p>
        ))}

        <p className="text-xl font-bold text-ink leading-relaxed">
          {displayed}
          {!lineDone && (
            <span className="ml-0.5 inline-block animate-pulse text-brand">|</span>
          )}
        </p>
      </div>

      {/* 次の文への誘導（最終行以外で行が完了したとき）。高さ固定でボタン位置を安定させる */}
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
            onClick={(e) => {
              e.stopPropagation()
              if (!ready) return
              onNext()
            }}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  )
}