import { useEffect, useRef, useState } from 'react'

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
  const speedMs = opts?.speedMs ?? 40
  const startDelayMs = opts?.startDelayMs ?? 0

  const [displayed, setDisplayed] = useState('')
  const [isComplete, setIsComplete] = useState(text.length === 0)
  const [prevText, setPrevText] = useState(text)

  // text変更をレンダー中に同期リセット（effect後paintのラグ＝残像を消す）
  if (text !== prevText) {
    setPrevText(text)
    setDisplayed('')
    setIsComplete(text.length === 0)
  }

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reveal = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setDisplayed(text)
    setIsComplete(true)
  }

  useEffect(() => {
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