import { useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface PhotoItem {
  id: string
  image_path: string
  display_order: number
  signed_url: string | null
  status?: string
}

interface DraggableCellProps {
  photo: PhotoItem
  index: number
  isMain: boolean
  onCellRef: (el: HTMLDivElement | null) => void
  onDelete: () => void
  onSetMain: () => void
}

function DraggableCell({ photo, index, isMain, onCellRef, onDelete, onSetMain }: DraggableCellProps) {
  const statusVal = photo.status ?? 'approved'
  const canDrag = statusVal !== 'pending' && statusVal !== 'rejected'
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: photo.id,
    disabled: !canDrag,
  })

  return (
    <div
      ref={(el) => { setNodeRef(el); onCellRef(el) }}
      {...(canDrag ? { ...attributes, ...listeners } : {})}
      className="relative aspect-square overflow-hidden bg-muted border-2 border-ink"
      style={{ opacity: isDragging ? 0.25 : 1, cursor: canDrag ? 'grab' : 'default' }}
    >
      <img
        src={photo.signed_url ?? ''}
        alt={`写真${index + 1}`}
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />

      {statusVal === 'pending' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
          <span className="font-mono text-[10px] font-bold text-white uppercase tracking-widest">審査中</span>
        </div>
      )}

      {statusVal === 'rejected' && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(220,38,38,0.7)' }}
        >
          <span className="font-mono text-[10px] font-bold text-white uppercase tracking-widest">承認不可</span>
        </div>
      )}

      {isMain && statusVal !== 'pending' && statusVal !== 'rejected' && (
        <span className="absolute top-1 left-1 bg-brand border border-ink text-ink text-[10px] px-1.5 py-0.5 font-mono font-bold leading-none">
          MAIN
        </span>
      )}

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="group absolute top-0 right-0 w-11 h-11 flex items-center justify-center"
      >
        <span className="w-5 h-5 rounded-full bg-black/60 group-hover:bg-black/80 text-white text-xs flex items-center justify-center leading-none">
          ×
        </span>
      </button>

      {!isMain && statusVal !== 'pending' && statusVal !== 'rejected' && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSetMain() }}
          className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-1 text-center hover:bg-black/70"
        >
          メインにする
        </button>
      )}
    </div>
  )
}

export interface PhotoDndGridProps {
  photos: PhotoItem[]
  mainImagePath: string | null
  uploading: boolean
  photosExpanded: boolean
  cellCount: number
  maxPhotos: number
  photoError: string | null
  approvedPhotoCount: number
  photoCap: number
  onDelete: (id: string) => void
  onSetMain: (id: string) => void
  onReorder: (newPhotos: PhotoItem[]) => Promise<void>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onExpandToggle: () => void
}

export default function PhotoDndGrid({
  photos, mainImagePath, uploading, photosExpanded, cellCount,
  maxPhotos, photoError, approvedPhotoCount, photoCap,
  onDelete, onSetMain, onReorder, onFileChange, onExpandToggle,
}: PhotoDndGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  )

  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const cellRefs = useRef<(HTMLDivElement | null)[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const activeCellWidth = useRef<number>(80)
  const fromIdxRef = useRef<number>(-1)

  const occupiedCount = photos.length

  function computeInsertIndex(currentX: number, currentY: number): number {
    for (let i = 0; i < occupiedCount; i++) {
      const el = cellRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      // 行優先（row-major）判定: まず行(y)、同行内でx
      if (centerY > currentY + rect.height * 0.4) return i
      if (Math.abs(centerY - currentY) <= rect.height * 0.6 && centerX > currentX) return i
    }
    return occupiedCount
  }

  function computeLineStyle(idx: number): React.CSSProperties {
    if (!gridRef.current) return { display: 'none' }
    const gridRect = gridRef.current.getBoundingClientRect()

    let el: HTMLDivElement | null = null
    let atRight = false

    if (idx < occupiedCount) {
      el = cellRefs.current[idx] ?? null
    } else {
      el = cellRefs.current[occupiedCount - 1] ?? null
      atRight = true
    }
    if (!el) return { display: 'none' }

    const rect = el.getBoundingClientRect()
    const rawLeft = atRight
      ? rect.right - gridRect.left
      : rect.left - gridRect.left - 2
    const left = Math.max(0, Math.min(rawLeft, gridRect.width - 3))

    return {
      position: 'absolute',
      left,
      top: rect.top - gridRect.top,
      width: 3,
      height: rect.height,
      background: 'var(--color-brand)',
      pointerEvents: 'none',
      zIndex: 10,
      borderRadius: 2,
    }
  }

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    setActivePhotoId(id)
    const idx = photos.findIndex(p => p.id === id)
    fromIdxRef.current = idx
    if (idx >= 0) {
      const el = cellRefs.current[idx]
      if (el) activeCellWidth.current = el.getBoundingClientRect().width
    }
    navigator.vibrate?.(15)
  }

  function onDragMove(event: DragMoveEvent) {
    const { activatorEvent, delta } = event
    const pe = activatorEvent as PointerEvent
    setInsertIndex(computeInsertIndex(pe.clientX + delta.x, pe.clientY + delta.y))
  }

  function onDragEnd(_event: DragEndEvent) {
    const fromIdx = fromIdxRef.current
    const toIdx = insertIndex

    setActivePhotoId(null)
    setInsertIndex(null)
    fromIdxRef.current = -1

    if (fromIdx < 0 || toIdx === null) return
    // no-op: dropping in the same position (before or after itself)
    if (toIdx === fromIdx || toIdx === fromIdx + 1) return

    const newPhotos = [...photos]
    const [moved] = newPhotos.splice(fromIdx, 1)
    // fromIdx を取り除いた後の挿入位置を補正
    const adjustedIdx = fromIdx < toIdx ? toIdx - 1 : toIdx
    newPhotos.splice(adjustedIdx, 0, moved)
    onReorder(newPhotos)
  }

  const activePhoto = photos.find(p => p.id === activePhotoId) ?? null
  const registered = photos.length

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}>
      <div className="card-bold bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 uppercase tracking-wide inline-flex items-center gap-1.5">
            写真
            {approvedPhotoCount < photoCap && (
              <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--color-brand)' }}>(+5%)</span>
            )}
          </h2>
          <span className="font-mono text-xs font-bold text-muted">{photos.length} / {maxPhotos}</span>
        </div>

        {photoError && (
          <Alert variant="destructive">
            <AlertDescription>{photoError}</AlertDescription>
          </Alert>
        )}

        <div ref={gridRef} className="grid grid-cols-3 gap-2 relative">
          {Array.from({ length: cellCount }).map((_, i) => {
            const photo = photos[i]
            if (photo) {
              return (
                <DraggableCell
                  key={photo.id}
                  photo={photo}
                  index={i}
                  isMain={photo.image_path === mainImagePath}
                  onCellRef={(el) => { cellRefs.current[i] = el }}
                  onDelete={() => onDelete(photo.id)}
                  onSetMain={() => onSetMain(photo.id)}
                />
              )
            }
            return (
              <label
                key={`empty-${i}`}
                className={`aspect-square border-2 border-dashed border-ink flex items-center justify-center transition-colors ${
                  uploading || photos.length >= maxPhotos
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-brand/10'
                }`}
              >
                <span className="text-2xl text-muted-foreground select-none">+</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={onFileChange}
                  className="hidden"
                  disabled={uploading || photos.length >= maxPhotos}
                />
              </label>
            )
          })}

          {/* 挿入位置インジケーター（ドラッグ中のみ） */}
          {activePhotoId !== null && insertIndex !== null && (
            <div style={computeLineStyle(insertIndex)} />
          )}
        </div>

        {registered >= 7 && (
          <button
            type="button"
            onClick={onExpandToggle}
            className="w-full font-mono text-xs font-bold border-2 border-ink py-2 hover:bg-ink/5 transition-colors"
          >
            {photosExpanded ? '折りたたむ ▲' : `あと ${registered - 6} 枚を表示 ▼`}
          </button>
        )}

        {uploading && (
          <p className="font-mono text-xs text-muted text-center">アップロード中…</p>
        )}
        <p className="font-mono text-xs text-subtle">
          JPEG / PNG、5MB以下。最大{maxPhotos}枚まで。長押しで並び替え。
        </p>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePhoto && (
          <div
            style={{
              width: activeCellWidth.current,
              aspectRatio: '1 / 1',
              overflow: 'hidden',
              border: '2px solid #0A0A0A',
              transform: 'scale(1.05)',
              boxShadow: '8px 8px 0 0 rgba(10,10,10,0.4)',
            }}
          >
            <img
              src={activePhoto.signed_url ?? ''}
              alt="ドラッグ中"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
