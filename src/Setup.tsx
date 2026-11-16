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

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-5 pb-40 pt-10 sm:pt-14">
      <header className="mb-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-pink-500/30"
        >
          <svg viewBox="0 0 64 64" className="h-9 w-9">
            <path
              d="M14 14h14a6 6 0 1 1 12 0h10v12a6 6 0 1 1 0 12v12H36a6 6 0 1 0-12 0H14V38a6 6 0 1 0 0-12z"
              fill="#fff"
            />
          </svg>
        </motion.div>
        <h1 className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          Puzzle Reveal
        </h1>
        <p className="mt-2 text-violet-200/70">เปิดจิ๊กซอทีละชิ้น แล้วทายว่าภาพนี้คือที่ไหน</p>
      </header>

      {/* ที่วางรูป */}
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
        className={`glass cursor-pointer rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
          over ? 'border-fuchsia-300 bg-fuchsia-400/10' : 'border-white/20 hover:border-violet-300/60'
        }`}
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
        <div className="text-lg font-semibold">{busy ? 'กำลังเตรียมรูป…' : 'ลากรูปมาวางที่นี่ หรือคลิกเพื่อเลือกรูป'}</div>
        <div className="mt-1 text-sm text-violet-200/60">เลือกได้หลายรูปพร้อมกัน — เพิ่มทีหลังได้ตลอด</div>
      </div>
      {error && <p className="mt-3 text-center text-sm text-rose-300">{error}</p>}

      {/* ค่าเริ่มต้น */}
      <div className="glass mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl px-5 py-4">
        <div className="min-w-48 flex-1">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-violet-200/80">จำนวนจิ๊กซอเริ่มต้น (รูปที่เพิ่มใหม่)</span>
            <span className="font-semibold">{defPieces} ชิ้น</span>
          </div>
          <input
            type="range"
            min={6}
            max={150}
            value={defPieces}
            onChange={(e) => changeDefault(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <button
          className="btn btn-ghost px-4 py-2 text-sm"
          disabled={!items.length}
          onClick={() => lib.setAllPieces(defPieces)}
        >
          ใช้กับทุกรูป
        </button>
      </div>

      {/* รายการรูป */}
      <div className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-semibold">
            คิวรูป <span className="text-violet-300/70">({items.length})</span>
          </h2>
          {items.length > 0 && (
            <button
              className="text-sm text-violet-300/60 underline-offset-2 hover:text-rose-300 hover:underline"
              onClick={() => confirm('ลบรูปทั้งหมดออกจากคิว?') && lib.clear()}
            >
              ลบทั้งหมด
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="glass rounded-2xl px-5 py-8 text-center text-violet-200/60">
            ยังไม่มีรูป — เพิ่มรูปด้านบนได้เลย แล้วตั้งชื่อเฉลยและจำนวนจิ๊กซอของแต่ละรูป
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3">
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
      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-ink via-ink/80 to-transparent px-5 pb-6 pt-12">
        <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-3">
          {hasProgress && items.length > 0 && (
            <button className="btn btn-ghost px-6 py-3.5" onClick={onResume}>
              เล่นต่อ (ภาพที่ {Math.min(resumeIndex + 1, items.length)})
            </button>
          )}
          <button className="btn btn-primary px-10 py-3.5 text-lg" disabled={!items.length} onClick={onStart}>
            {hasProgress ? 'เริ่มใหม่ตั้งแต่ภาพแรก' : `เริ่มเกม · ${items.length} รูป`} ▶
          </button>
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`glass flex items-center gap-3 rounded-2xl p-3 ${isDragging ? 'shadow-2xl ring-2 ring-fuchsia-400/60' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="ลากเพื่อเรียงลำดับ"
        className="grid h-10 w-7 shrink-0 cursor-grab touch-none place-items-center text-violet-300/50 hover:text-violet-100 active:cursor-grabbing"
      >
        <svg width="14" height="22" viewBox="0 0 14 22" fill="currentColor">
          {[3, 11, 19].map((y) => (
            <g key={y}>
              <circle cx="3" cy={y - 1} r="1.6" />
              <circle cx="11" cy={y - 1} r="1.6" />
            </g>
          ))}
        </svg>
      </button>

      <div className="relative shrink-0">
        <img src={p.url} alt="" className="h-20 w-28 rounded-xl object-cover" />
        <span className="absolute -left-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-bold shadow">
          {index + 1}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <input
          value={p.answer}
          onChange={(e) => lib.update(p.id, { answer: e.target.value })}
          placeholder="ข้อความเฉลย เช่น วัดอรุณ กรุงเทพ"
          className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-base outline-none placeholder:text-violet-200/30 focus:border-fuchsia-300/70"
        />
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={6}
            max={150}
            value={p.pieces}
            onChange={(e) => lib.update(p.id, { pieces: Number(e.target.value) })}
            className="min-w-0 flex-1"
          />
          <span className="w-28 shrink-0 text-right text-sm text-violet-200/80">
            {cols}×{rows} = <b className="text-white">{cols * rows}</b> ชิ้น
          </span>
        </div>
      </div>

      <button
        onClick={() => lib.remove(p.id)}
        aria-label="ลบรูป"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-violet-300/50 transition hover:bg-rose-500/20 hover:text-rose-300"
      >
        ✕
      </button>
    </motion.li>
  )
}
