import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Eye, Flag, Hash, Maximize, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Board, { useFit } from './Board'
import { gridFor } from './jigsaw'
import { loadProgress, saveIndex, saveProgress, type Progress, type Puzzle } from './store'

interface Props {
  puzzles: Puzzle[]
  startIndex: number
  onExit: () => void
}

const EASE = [0.22, 1, 0.36, 1] as const
const Num = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono tabular-nums">{children}</span>
)

function celebrate() {
  const end = Date.now() + 900
  const colors = ['#f0b44c', '#ffd98a', '#ededed', '#a1a1a6']
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0, y: 0.75 }, colors })
    confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1, y: 0.75 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen?.().catch(() => {})
}

export default function Play({ puzzles, startIndex, onExit }: Props) {
  const [idx, setIdx] = useState(Math.min(startIndex, puzzles.length - 1))
  const [prog, setProg] = useState<Progress>(loadProgress)
  const [wave, setWave] = useState(false)
  const [showNumbers, setShowNumbers] = useState(true)

  const p = puzzles[idx]
  const { cols, rows } = gridFor(p.pieces, p.w / p.h)
  const total = cols * rows
  const saved = prog[p.id]
  const entry = saved && saved.n === total ? saved : { n: total, revealed: [] as number[], done: false }
  const revealed = useMemo(() => new Set(entry.revealed), [entry.revealed])
  const isLast = idx === puzzles.length - 1
  const { ref, size } = useFit(p.w / p.h)

  const commit = useCallback(
    (next: { revealed: number[]; done: boolean }) => {
      setProg((prev) => {
        const out = { ...prev, [p.id]: { n: total, ...next } }
        saveProgress(out)
        return out
      })
    },
    [p.id, total],
  )

  useEffect(() => saveIndex(idx), [idx])

  const revealPiece = (i: number) => {
    if (entry.done || revealed.has(i)) return
    setWave(false)
    commit({ revealed: [...entry.revealed, i], done: false })
  }

  const revealAll = useCallback(() => {
    setWave(true)
    commit({ revealed: Array.from({ length: total }, (_, i) => i), done: true })
    setTimeout(celebrate, 450)
  }, [commit, total])

  const resetCurrent = () => {
    setWave(false)
    commit({ revealed: [], done: false })
  }

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= puzzles.length) return
      setWave(false)
      setIdx(to)
    },
    [puzzles.length],
  )

  const primary = useCallback(() => {
    if (!entry.done) revealAll()
    else if (!isLast) go(idx + 1)
    else onExit()
  }, [entry.done, isLast, idx, go, revealAll, onExit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ชิ้นจิ๊กซอที่โฟกัสอยู่จัดการ Enter/Space ของตัวเอง
      if ((e.target as Element | null)?.closest?.('.piece')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        primary()
      } else if (e.key === 'ArrowRight') go(idx + 1)
      else if (e.key === 'ArrowLeft') go(idx - 1)
      else if (e.key.toLowerCase() === 'f') toggleFullscreen()
      else if (e.key.toLowerCase() === 'n') setShowNumbers((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [primary, go, idx])

  const doneCount = puzzles.filter((q) => prog[q.id]?.done).length

  return (
    <div className="flex h-full flex-col px-6 pb-4 pt-4 sm:px-8">
      {/* แถบบน */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <button className="btn btn-ghost h-10 gap-2 px-3 text-sm" onClick={onExit}>
            <ArrowLeft size={16} strokeWidth={1.5} />
            ตั้งค่า
          </button>
        </div>
        <div className="text-base text-fg2">
          ภาพที่ <span className="font-mono text-lg tabular-nums text-fg">{idx + 1}</span> /{' '}
          <Num>{puzzles.length}</Num>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className={`btn btn-ghost h-10 w-10 ${showNumbers ? 'text-fg' : 'text-fg3'}`}
            onClick={() => setShowNumbers((v) => !v)}
            aria-pressed={showNumbers}
            title="แสดง/ซ่อนเลขชิ้น (N)"
            aria-label="แสดงหรือซ่อนเลขชิ้น"
          >
            <Hash size={16} strokeWidth={1.5} />
          </button>
          <button className="btn btn-ghost h-10 w-10" onClick={toggleFullscreen} title="เต็มจอ (F)" aria-label="เต็มจอ">
            <Maximize size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* กระดาน */}
      <div ref={ref} className="my-4 flex min-h-0 flex-1 items-center justify-center">
        {size.w > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <Board
                puzzle={p}
                width={size.w}
                height={size.h}
                revealed={revealed}
                wave={wave}
                showNumbers={showNumbers}
                onReveal={revealPiece}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* คำถาม / คำตอบ */}
      <div className="flex h-32 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {entry.done ? (
            <motion.div
              key={p.id + 'a'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.5 }}
            >
              <div className="text-sm text-fg3">คำตอบ</div>
              <div className="mt-1 text-4xl font-medium leading-tight tracking-tight text-fg sm:text-6xl">
                {p.answer || '—'}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={p.id + 'q'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <div className="text-3xl font-medium sm:text-4xl">ภาพนี้คืออะไร? ที่ไหน?</div>
              <div className="mt-2 text-sm text-fg3">
                เปิดแล้ว <Num>{revealed.size}</Num> / <Num>{total}</Num> ชิ้น
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ปุ่มควบคุม */}
      <div className="flex items-center justify-center gap-3">
        <button className="btn btn-ghost h-11 w-11" disabled={idx === 0} onClick={() => go(idx - 1)} aria-label="ย้อนไปภาพก่อน">
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <button className="btn btn-ghost h-11 px-4 text-sm" onClick={resetCurrent} disabled={!revealed.size}>
          <RotateCcw size={16} strokeWidth={1.5} />
          ปิดใหม่
        </button>
        <button className="btn btn-primary h-12 min-w-44 px-6 text-lg" onClick={primary}>
          {!entry.done ? (
            <>
              <Eye size={18} strokeWidth={1.5} />
              เฉลย
            </>
          ) : isLast ? (
            <>
              <Flag size={18} strokeWidth={1.5} />
              จบเกม
            </>
          ) : (
            <>
              ภาพถัดไป
              <ArrowRight size={18} strokeWidth={1.5} />
            </>
          )}
        </button>
        <button className="btn btn-ghost h-11 w-11" disabled={isLast} onClick={() => go(idx + 1)} aria-label="ข้ามไปภาพต่อไป">
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* ท้ายจอ: ความคืบหน้า + คีย์ลัด ในแถวเดียว */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-3 text-[13px] text-fg3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {puzzles.map((q, i) => (
              <button
                key={q.id}
                onClick={() => go(i)}
                aria-label={`ภาพที่ ${i + 1}`}
                aria-current={i === idx}
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-150 ${
                  i === idx ? 'bg-accent' : prog[q.id]?.done ? 'bg-fg2' : 'bg-line-strong hover:bg-fg3'
                }`}
              />
            ))}
          </div>
          <span>
            เฉลยแล้ว <Num>{doneCount}</Num>/<Num>{puzzles.length}</Num>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">Space</kbd> เฉลย / ถัดไป
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">←</kbd>
            <kbd className="kbd">→</kbd> เปลี่ยนภาพ
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">F</kbd> เต็มจอ
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">N</kbd> เลขชิ้น
          </span>
        </div>
      </div>
    </div>
  )
}
