import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SelectModalProps {
  open: boolean
  mode: 'single' | 'multi'
  title: string
  hint?: string
  options: Option[]
  value: string | null | string[]
  maxItems?: number
  /** 外側のパネル上に重畳させる場合に true。余白を広げ × ボタンを表示して「入れ子モーダル」と伝える */
  compact?: boolean
  onConfirm: (next: string | null | string[]) => void
  onClose: () => void
}

const CLEAR_VALUE = '__clear__'

export default function SelectModal({
  open,
  mode,
  title,
  hint,
  options,
  value,
  maxItems,
  compact = false,
  onConfirm,
  onClose,
}: SelectModalProps) {
  const [temp, setTemp] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // multi: open 時に value のコピーで temp 初期化
  useEffect(() => {
    if (open && mode === 'multi') {
      setTemp([...((value as string[]) ?? [])])
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // フォーカストラップ + Escape
  useEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return

    const getFocusable = () =>
      Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled])'))

    getFocusable()[0]?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const nodes = getFocusable()
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const isSingle = mode === 'single'
  const atMax = !isSingle && maxItems != null && temp.length >= maxItems
  const defaultHint = isSingle ? '1つ選んでください' : 'あてはまるものを選んでください（複数可）'

  // single モードは先頭に「未選択」行を追加
  const displayOptions: Option[] = isSingle
    ? [{ value: CLEAR_VALUE, label: '未選択' }, ...options]
    : options

  const handleRowClick = (v: string) => {
    if (isSingle) {
      onConfirm(v === CLEAR_VALUE ? null : v)
      return
    }
    setTemp(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const isSingleSelected = (optValue: string): boolean => {
    if (optValue === CLEAR_VALUE) return value === null
    return (value as string | null) === optValue
  }

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center ${compact ? 'px-8' : 'px-4'}`}
      style={{ background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={containerRef}
        className="w-full max-w-sm flex flex-col"
        style={{
          background: 'var(--color-bone)',
          border: '2.5px solid #0A0A0A',
          borderRadius: '18px',
          boxShadow: '5px 5px 0 0 #0A0A0A',
          maxHeight: '80dvh',
        }}
      >
        {/* ヘッダー */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-ink text-base">{title}</h2>
              <p className="text-xs text-ink/50 mt-1">{hint ?? defaultHint}</p>
              {!isSingle && atMax && (
                <p className="font-bold text-xs text-ink/50 mt-0.5">
                  最大 {maxItems} つ選択済み
                </p>
              )}
            </div>
            {compact && (
              <button type="button" onClick={onClose} className="shrink-0 p-1 text-ink/50 hover:text-ink mt-0.5">
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
        </div>

        {/* スクロール可能リスト */}
        <div className="overflow-y-auto flex-1">
          {displayOptions.map((opt, index) => {
            const isClear = opt.value === CLEAR_VALUE
            const isSelected = isSingle
              ? isSingleSelected(opt.value)
              : temp.includes(opt.value)
            const isDisabled = !isSingle && !isSelected && atMax
            const isLast = index === displayOptions.length - 1

            return (
              <button
                key={opt.value}
                type="button"
                disabled={isDisabled}
                onClick={() => handleRowClick(opt.value)}
                className="w-full flex items-center gap-3 px-5 text-left transition-colors"
                style={{
                  minHeight: '44px',
                  background: isSelected && !isClear ? 'rgba(61,220,151,0.10)' : 'transparent',
                  borderBottom: isLast ? 'none' : '1px solid rgba(10,10,10,0.15)',
                  opacity: isDisabled ? 0.35 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {/* ラジオ（single）またはチェック（multi）インジケーター */}
                {isSingle ? (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid #0A0A0A',
                      background: isSelected && !isClear ? '#0A0A0A' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && !isClear && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: 'var(--color-brand)',
                          display: 'block',
                        }}
                      />
                    )}
                  </span>
                ) : (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: '2px solid #0A0A0A',
                      background: isSelected ? '#0A0A0A' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <Check
                        style={{
                          width: 11,
                          height: 11,
                          color: 'var(--color-brand)',
                          strokeWidth: 3,
                        }}
                      />
                    )}
                  </span>
                )}
                <span
                  className={`text-sm ${isClear ? 'text-ink/40' : 'text-ink'}`}
                  style={{ fontWeight: isSelected && !isClear ? 700 : 400 }}
                >
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* 決定ボタン（multi のみ） */}
        {!isSingle && (
          <div className="px-5 pb-5 pt-3 shrink-0">
            <button
              type="button"
              onClick={() => onConfirm(temp)}
              className="w-full h-12 font-bold text-ink border-2 border-ink rounded-xl"
              style={{ background: 'var(--color-brand)' }}
            >
              決定
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
