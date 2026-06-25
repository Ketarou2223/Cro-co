import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTypewriterOpts {
  speedMs?: number
  startDelayMs?: number
}

interface UseTypewriterResult {
  displayed: string
  isComplete: boolean
  reveal: () => void
}

export function useTypewriter(
  text: string,
  opts?: UseTypewriterOpts,
): UseTypewriterResult {
  const speedMs = opts?.speedMs ?? 110
  const startDelayMs = opts?.startDelayMs ?? 0

  const [displayed, setDisplayed] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textRef = useRef(text)

  // reveal() は useCallback で安定化: timerRef/textRef 経由でアクセスするため deps 不要
  const reveal = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setDisplayed(textRef.current)
    setIsComplete(true)
  }, [])

  useEffect(() => {
    textRef.current = text
    setDisplayed('')
    setIsComplete(false)

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (text.length === 0) {
      setIsComplete(true)
      return
    }

    let index = 0

    const tick = () => {
      index += 1
      setDisplayed(text.slice(0, index))
      if (index >= text.length) {
        setIsComplete(true)
        timerRef.current = null
        return
      }
      timerRef.current = setTimeout(tick, speedMs)
    }

    timerRef.current = setTimeout(tick, startDelayMs)

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [text, speedMs, startDelayMs])

  return { displayed, isComplete, reveal }
}
