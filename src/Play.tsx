import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Board, { useFit } from './Board'
import { gridFor } from './jigsaw'
import { loadProgress, saveIndex, saveProgress, type Progress, type Puzzle } from './store'

interface Props {
  puzzles: Puzzle[]
  startIndex: number
  onExit: () => void
}

function celebrate() {
  const end = Date.now() + 900
  const colors = ['#8b5cf6', '#ec4899', '#fbbf24', '#22d3ee', '#ffffff']
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0, y: 0.75 }, colors })
    confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1, y: 0.75 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
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
    <div className="flex h-full flex-col px-4 pb-4 pt-3 sm:px-8">
      {/* แถบบน */}
      <div className="flex items-center justify-between gap-3">
        <button className="btn btn-ghost px-4 py-2 text-sm" onClick={onExit}>
          ← ตั้งค่า
        </button>
        <div className="text-center">
          <div className="text-sm text-violet-200/60">
            ภาพที่ <b className="text-lg text-white">{idx + 1}</b> / {puzzles.length}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost px-3 py-2 text-sm"
            onClick={() => setShowNumbers((v) => !v)}
            title="แสดง/ซ่อนเลขชิ้น (N)"
          >
            #{showNumbers ? '' : '̸'}
          </button>
          <button className="btn btn-ghost px-3 py-2 text-sm" onClick={toggleFullscreen} title="เต็มจอ (F)">
            ⛶
          </button>
        </div>
      </div>

      {/* กระดาน */}
      <div ref={ref} className="my-3 flex min-h-0 flex-1 items-center justify-center">
        {size.w > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.3 }}
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

      {/* คำตอบ */}
      <div className="flex h-20 items-center justify-center text-center sm:h-24">
        <AnimatePresence mode="wait">
          {entry.done ? (
            <motion.div
              key={p.id + 'a'}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.5 }}
              className="bg-gradient-to-r from-amber-200 via-pink-300 to-violet-300 bg-clip-text text-4xl font-extrabold leading-tight text-transparent sm:text-6xl"
            >
              {p.answer || '—'}
            </motion.div>
          ) : (
            <motion.div key={p.id + 'q'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-2xl font-semibold text-violet-100/90 sm:text-3xl">ภาพนี้คืออะไร? ที่ไหน? 🤔</div>
              <div className="mt-1 text-sm text-violet-200/50">
                เปิดแล้ว {revealed.size} / {total} ชิ้น
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ปุ่มควบคุม */}
      <div className="mt-2 flex items-center justify-center gap-3">
        <button className="btn btn-ghost h-12 w-12 text-xl" disabled={idx === 0} onClick={() => go(idx - 1)} aria-label="ก่อนหน้า">
          ‹
        </button>
        <button className="btn btn-ghost px-4 py-3 text-sm" onClick={resetCurrent} disabled={!revealed.size}>
          ปิดใหม่
        </button>
        <button className="btn btn-primary min-w-48 px-8 py-3 text-lg" onClick={primary}>
          {!entry.done ? '✨ เฉลย' : isLast ? '🏁 จบเกม' : 'ภาพถัดไป →'}
        </button>
        <button className="btn btn-ghost h-12 w-12 text-xl" disabled={isLast} onClick={() => go(idx + 1)} aria-label="ถัดไป">
          ›
        </button>
      </div>

      {/* ตัวชี้ความคืบหน้า */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {puzzles.map((q, i) => (
          <button
            key={q.id}
            onClick={() => go(i)}
            aria-label={`ภาพที่ ${i + 1}`}
            className={`h-2.5 rounded-full transition-all ${
              i === idx ? 'w-8 bg-gradient-to-r from-violet-400 to-pink-400' : prog[q.id]?.done ? 'w-2.5 bg-emerald-400/80' : 'w-2.5 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
        <span className="ml-2 text-xs text-violet-200/40">เฉลยแล้ว {doneCount}/{puzzles.length}</span>
      </div>
      <div className="mt-1 text-center text-[11px] text-violet-200/30">Space = เฉลย/ถัดไป · ← → เปลี่ยนภาพ · F เต็มจอ · N เลขชิ้น</div>
    </div>
  )
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen?.().catch(() => {})
}
