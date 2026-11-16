import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { GripVertical, ImagePlus, Play, Puzzle as PuzzleIcon, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { gridFor } from './jigsaw'
import { loadDefaultPieces, saveDefaultPieces, type Puzzle, type PuzzleLib } from './store'

interface Props {
  lib: PuzzleLib
  hasProgress: boolean
  resumeIndex: number
  onStart: () => void
  onResume: () => void
}

const EASE = [0.22, 1, 0.36, 1] as const
const Num = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono tabular-nums">{children}</span>
)

export default function Setup({ lib, hasProgress, resumeIndex, onStart, onResume }: Props) {
  const { items } = lib
  const [defPieces, setDefPieces] = useState(loadDefaultPieces)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const totalPieces = items.reduce((sum, p) => {
    const g = gridFor(p.pieces, p.w / p.h)
    return sum + g.cols * g.rows
  }, 0)

  const addFiles = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    setBusy(true)
    setError('')
    const failed = await lib.add(files, defPieces)
    if (failed) setError(`เพิ่มรูปไม่สำเร็จ ${failed} ไฟล์ (รองรับ JPG, PNG, WebP)`)
    setBusy(false)
  }

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = items.findIndex((p) => p.id === e.active.id)
    const to = items.findIndex((p) => p.id === e.over!.id)
    lib.move(from, to)
  }

  const changeDefault = (n: number) => {
    setDefPieces(n)
    saveDefaultPieces(n)
  }

  const empty = items.length === 0

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-6 pb-32 pt-8">
      <div className="mb-10 flex items-center gap-2 text-fg">
        <PuzzleIcon size={20} strokeWidth={1.5} className="text-fg" />
        <span className="text-base font-medium">Puzzle Reveal</span>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-medium leading-tight">ตั้งค่าเกม</h1>
        <p className="mt-2 text-[15px] text-fg2">เปิดจิ๊กซอทีละชิ้น แล้วทายว่าภาพนี้คือที่ไหน</p>
      </header>

      {/* ที่วางรูป: ใหญ่เมื่อยังไม่มีรูป เตี้ยลงเมื่อมีรูปแล้ว */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-2xl border border-dashed text-center transition-colors duration-150 ${
          empty ? 'px-6 py-14' : 'flex items-center justify-center gap-3 px-6 py-4'
        } ${over ? 'border-accent bg-raised' : 'border-line-strong bg-card hover:bg-raised'}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <ImagePlus size={empty ? 28 : 18} strokeWidth={1.5} className={`text-fg2 ${empty ? 'mx-auto mb-3' : ''}`} />
        <div>
          <div className="text-base font-medium">{busy ? 'กำลังเตรียมรูป' : empty ? 'ลากรูปมาวางที่นี่ หรือคลิกเพื่อเลือกรูป' : 'เพิ่มรูป'}</div>
          {empty && <div className="mt-1 text-sm text-fg3">เลือกได้หลายรูปพร้อมกัน เพิ่มทีหลังได้ตลอด</div>}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* ค่าเริ่มต้น */}
      <div className="surface mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-5 py-4">
        <div className="min-w-48 flex-1">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-fg2">จำนวนจิ๊กซอเริ่มต้นของรูปที่เพิ่มใหม่</span>
            <span className="text-fg">
              <Num>{defPieces}</Num> ชิ้น
            </span>
          </div>
          <input
            type="range"
            min={6}
            max={150}
            value={defPieces}
            onChange={(e) => changeDefault(Number(e.target.value))}
            className="w-full"
            aria-label="จำนวนจิ๊กซอเริ่มต้น"
          />
        </div>
        <button className="btn btn-ghost h-10 px-4 text-sm" disabled={empty} onClick={() => lib.setAllPieces(defPieces)}>
          ใช้กับทุกรูป
        </button>
      </div>

      {/* คิวรูป */}
      <div className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-medium">
            คิวรูป <span className="ml-1 font-mono text-sm text-fg3">{items.length}</span>
          </h2>
          {!empty && (
            <button
              className="text-sm text-fg3 transition-colors duration-150 hover:text-danger"
              onClick={() => confirm('ลบรูปทั้งหมดออกจากคิว?') && lib.clear()}
            >
              ลบทั้งหมด
            </button>
          )}
        </div>

        {empty ? (
          <p className="surface rounded-2xl px-5 py-8 text-center text-sm text-fg3">
            ยังไม่มีรูป เพิ่มรูปด้านบน แล้วตั้งข้อความเฉลยและจำนวนจิ๊กซอของแต่ละรูป
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((p, i) => (
                    <Row key={p.id} p={p} index={i} lib={lib} />
                  ))}
                </AnimatePresence>
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* แถบเริ่มเกม */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-deep">
        <div className="mx-auto flex h-20 max-w-3xl items-center justify-between gap-4 px-6">
          <div className="text-sm text-fg3">
            {empty ? (
              'ยังไม่มีรูปในคิว'
            ) : (
              <>
                <Num>{items.length}</Num> รูป · รวม <Num>{totalPieces}</Num> ชิ้น
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasProgress && !empty && (
              <button className="btn btn-ghost h-11 px-5" onClick={onResume}>
                เล่นต่อ (ภาพที่ <Num>{Math.min(resumeIndex + 1, items.length)}</Num>)
              </button>
            )}
            <button
              className={`btn h-11 px-6 text-base ${hasProgress ? 'btn-ghost' : 'btn-primary'}`}
              disabled={empty}
              onClick={onStart}
            >
              {hasProgress ? 'เริ่มใหม่ตั้งแต่ภาพแรก' : 'เริ่มเกม'}
              {!hasProgress && <Play size={16} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ p, index, lib }: { p: Puzzle; index: number; lib: PuzzleLib }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id })
  const { cols, rows } = gridFor(p.pieces, p.w / p.h)

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`flex items-center gap-3 rounded-2xl border p-2 pr-3 ${
        isDragging
          ? 'border-line-strong bg-raised shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)]'
          : 'border-line bg-card'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="ลากเพื่อเรียงลำดับ"
        className="grid h-10 w-6 shrink-0 cursor-grab touch-none place-items-center text-fg3 transition-colors duration-150 hover:text-fg active:cursor-grabbing"
      >
        <GripVertical size={16} strokeWidth={1.5} />
      </button>

      <div className="relative shrink-0">
        <img src={p.url} alt="" className="h-20 w-28 rounded-lg object-cover" />
        <span className="absolute left-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded bg-page/85 px-1 font-mono text-xs tabular-nums text-fg">
          {index + 1}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <input
          value={p.answer}
          onChange={(e) => lib.update(p.id, { answer: e.target.value })}
          placeholder="ข้อความเฉลย เช่น วัดอรุณ กรุงเทพ"
          aria-label={`ข้อความเฉลยภาพที่ ${index + 1}`}
          className="h-10 w-full rounded-lg border border-line-strong bg-page px-3 text-base outline-none transition-colors duration-150 placeholder:text-fg3 focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={6}
            max={150}
            value={p.pieces}
            onChange={(e) => lib.update(p.id, { pieces: Number(e.target.value) })}
            className="min-w-0 flex-1"
            aria-label={`จำนวนจิ๊กซอภาพที่ ${index + 1}`}
          />
          <span className="w-32 shrink-0 text-right text-sm text-fg3">
            <Num>
              {cols}×{rows} = <span className="text-fg">{cols * rows}</span>
            </Num>{' '}
            ชิ้น
          </span>
        </div>
      </div>

      <button
        onClick={() => lib.remove(p.id)}
        aria-label={`ลบภาพที่ ${index + 1}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-fg3 transition-colors duration-150 hover:bg-raised hover:text-danger"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </motion.li>
  )
}
