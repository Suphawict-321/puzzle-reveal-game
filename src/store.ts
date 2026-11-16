import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { processImage } from './image'

export interface PuzzleRecord {
  id: string
  answer: string
  pieces: number
  blob: Blob
  w: number
  h: number
}
export interface Puzzle extends PuzzleRecord {
  url: string
}

const KEY = 'puzzles'

export function usePuzzles() {
  const [items, setItems] = useState<Puzzle[]>([])
  const [ready, setReady] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    get<PuzzleRecord[]>(KEY)
      .then((recs) => {
        setItems((recs ?? []).map((r) => ({ ...r, url: URL.createObjectURL(r.blob) })))
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true
        setReady(true)
      })
  }, [])

  // บันทึกลง IndexedDB ทุกครั้งที่เปลี่ยนแปลง
  useEffect(() => {
    if (!loaded.current) return
    const t = setTimeout(() => {
      set(KEY, items.map(({ url: _url, ...rec }) => rec)).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [items])

  const add = useCallback(async (files: File[], defaultPieces: number) => {
    let failed = 0
    for (const f of files) {
      try {
        const { blob, w, h } = await processImage(f)
        const p: Puzzle = {
          id: crypto.randomUUID(),
          answer: f.name.replace(/\.[^.]+$/, ''),
          pieces: defaultPieces,
          blob,
          w,
          h,
          url: URL.createObjectURL(blob),
        }
        setItems((prev) => [...prev, p])
      } catch {
        failed++
      }
    }
    return failed
  }, [])

  const update = useCallback((id: string, patch: Partial<Pick<Puzzle, 'answer' | 'pieces'>>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const t = prev.find((p) => p.id === id)
      if (t) URL.revokeObjectURL(t.url)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const move = useCallback((from: number, to: number) => {
    setItems((prev) => arrayMove(prev, from, to))
  }, [])

  const setAllPieces = useCallback((n: number) => {
    setItems((prev) => prev.map((p) => ({ ...p, pieces: n })))
  }, [])

  const clear = useCallback(() => {
    setItems((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url))
      return []
    })
  }, [])

  return { items, ready, add, update, remove, move, setAllPieces, clear }
}
export type PuzzleLib = ReturnType<typeof usePuzzles>

/* ---------- ความคืบหน้าของเกม (เก็บใน localStorage) ---------- */
export type Progress = Record<string, { n: number; revealed: number[]; done: boolean }>

export function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem('jp-progress') ?? '{}')
  } catch {
    return {}
  }
}
export function saveProgress(p: Progress) {
  try {
    localStorage.setItem('jp-progress', JSON.stringify(p))
  } catch {
    /* ignore */
  }
}
export function loadIndex(): number {
  try {
    return Number(localStorage.getItem('jp-index') ?? 0) || 0
  } catch {
    return 0
  }
}
export function saveIndex(i: number) {
  try {
    localStorage.setItem('jp-index', String(i))
  } catch {
    /* ignore */
  }
}
export function loadDefaultPieces(): number {
  try {
    return Number(localStorage.getItem('jp-default-pieces') ?? 24) || 24
  } catch {
    return 24
  }
}
export function saveDefaultPieces(n: number) {
  try {
    localStorage.setItem('jp-default-pieces', String(n))
  } catch {
    /* ignore */
  }
}
