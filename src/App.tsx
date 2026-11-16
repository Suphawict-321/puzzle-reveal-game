import { useState } from 'react'
import Play from './Play'
import Setup from './Setup'
import { loadIndex, loadProgress, saveIndex, saveProgress, usePuzzles } from './store'

export default function App() {
  const lib = usePuzzles()
  const [mode, setMode] = useState<'setup' | 'play'>('setup')
  const [startIndex, setStartIndex] = useState(0)
  const [progressTick, setProgressTick] = useState(0)

  if (!lib.ready) return <div className="grid h-full place-items-center text-violet-200/60">กำลังโหลด…</div>

  const hasProgress = (() => {
    void progressTick
    const prog = loadProgress()
    return lib.items.some((p) => prog[p.id]?.revealed.length)
  })()

  const startFresh = () => {
    saveProgress({})
    saveIndex(0)
    setStartIndex(0)
    setProgressTick((t) => t + 1)
    setMode('play')
  }
  const resume = () => {
    setStartIndex(loadIndex())
    setMode('play')
  }

  return mode === 'setup' ? (
    <Setup lib={lib} hasProgress={hasProgress} resumeIndex={loadIndex()} onStart={startFresh} onResume={resume} />
  ) : (
    <Play
      puzzles={lib.items}
      startIndex={startIndex}
      onExit={() => {
        setProgressTick((t) => t + 1)
        setMode('setup')
      }}
    />
  )
}
