import { motion } from 'framer-motion'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildPieces, gridFor, hashString } from './jigsaw'
import type { Puzzle } from './store'

/** คำนวณขนาดสูงสุดที่พอดีกับพื้นที่ โดยคงสัดส่วนรูป */
export function useFit(aspect: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const calc = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      let w = cw
      let h = cw / aspect
      if (h > ch) {
        h = ch
        w = ch * aspect
      }
      setSize({ w: Math.floor(w), h: Math.floor(h) })
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspect])
  return { ref, size }
}

interface Props {
  puzzle: Puzzle
  width: number
  height: number
  revealed: Set<number>
  wave: boolean
  showNumbers: boolean
  onReveal: (i: number) => void
}

const W = 1000
const EASE = [0.22, 1, 0.36, 1] as const

export default function Board({ puzzle, width, height, revealed, wave, showNumbers, onReveal }: Props) {
  const H = Math.round((W * puzzle.h) / puzzle.w)
  const { cols, rows } = gridFor(puzzle.pieces, puzzle.w / puzzle.h)
  const pieces = useMemo(
    () => buildPieces(cols, rows, W, H, hashString(puzzle.id)),
    [cols, rows, H, puzzle.id],
  )
  const fontSize = Math.min(W / cols, H / rows) * 0.3

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        width,
        height,
        boxShadow: '0 0 0 1px rgb(237 237 237 / 0.14), 0 24px 60px -24px rgb(0 0 0 / 0.8)',
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={width} height={height} className="block select-none">
        <image href={puzzle.url} x="0" y="0" width={W} height={H} preserveAspectRatio="none" />
        {pieces.map((p) => {
          const open = revealed.has(p.index)
          const dist = Math.hypot(p.cx - W / 2, p.cy - H / 2) / Math.hypot(W / 2, H / 2)
          return (
            <motion.g
              key={p.index}
              className={open ? undefined : 'piece'}
              role={open ? undefined : 'button'}
              tabIndex={open ? -1 : 0}
              aria-label={open ? undefined : `เปิดชิ้นที่ ${p.index + 1}`}
              aria-hidden={open || undefined}
              style={{ transformBox: 'fill-box', transformOrigin: 'center', pointerEvents: open ? 'none' : 'auto' }}
              initial={false}
              animate={open ? { opacity: 0, scale: 1.35 } : { opacity: 1, scale: 1 }}
              transition={{ duration: open ? 0.5 : 0.25, delay: open && wave ? dist * 0.9 : 0, ease: EASE }}
              onClick={() => onReveal(p.index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onReveal(p.index)
                }
              }}
            >
              <path className="cover" d={p.d} />
              {showNumbers && (
                <text
                  className="num"
                  x={p.cx}
                  y={p.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fontWeight="500"
                  fontFamily="'JetBrains Mono', ui-monospace, monospace"
                  pointerEvents="none"
                >
                  {p.index + 1}
                </text>
              )}
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}
