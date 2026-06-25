import { useState } from 'react'
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
  const { displayed, isComplete, reveal } = useTypewriter(currentText)

  const isLastLine = currentLine === lines.length - 1
  const showButton = isComplete && isLastLine

  const handleTap = () => {
    if (!isComplete) {
      reveal()
    } else if (!isLastLine) {
      setCurrentLine((prev) => prev + 1)
    } else {
      onNext()
    }
  }

  return (
    <div
      className="min-h-screen w-full max-w-[480px] mx-auto flex flex-col px-6 py-10 cursor-pointer select-none touch-manipulation"
      onClick={handleTap}
    >
      {showCroco && (
        <div className="mb-8">
          <CrocoIllust size={64} />
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center gap-6">
        {lines.slice(0, currentLine).map((line, i) => (
          <p key={i} className="text-2xl font-bold text-ink leading-snug">
            {line}
          </p>
        ))}

        <p className="text-2xl font-bold text-ink leading-snug">
          {displayed}
          {!isComplete && (
            <span className="ml-0.5 inline-block animate-pulse text-brand">|</span>
          )}
        </p>
      </div>

      {showButton && (
        <div className="mt-8">
          <button
            type="button"
            className="w-full py-4 rounded-xl font-bold text-ink bg-brand border-2 border-ink shadow-[4px_4px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-[box-shadow,transform] duration-75"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
          >
            {buttonLabel}
          </button>
        </div>
      )}
    </div>
  )
}
