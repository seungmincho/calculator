'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, RotateCcw } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type BoardSize = 3 | 4 | 5

interface BestRecord {
  moves: number
  time: number // seconds
}

// ── Solvability helpers ────────────────────────────────────────────────────

/**
 * Count inversions in the tile array (ignoring the 0/blank tile).
 * An inversion is a pair (i, j) where i < j but tiles[i] > tiles[j].
 */
function countInversions(tiles: number[]): number {
  const arr = tiles.filter(t => t !== 0)
  let count = 0
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) count++
    }
  }
  return count
}

/**
 * Returns true if the given tile arrangement is solvable.
 * For odd-width boards: solvable iff inversions count is even.
 * For even-width boards: solvable iff (inversions + blank row from bottom) is even.
 */
function isSolvable(tiles: number[], size: BoardSize): boolean {
  const inversions = countInversions(tiles)
  if (size % 2 === 1) {
    // odd width: solvable iff inversions is even
    return inversions % 2 === 0
  } else {
    // even width: find blank row from bottom (1-indexed)
    const blankIndex = tiles.indexOf(0)
    const blankRow = Math.floor(blankIndex / size)
    const rowFromBottom = size - blankRow // 1-indexed from bottom
    return (inversions + rowFromBottom) % 2 === 0
  }
}

/** Fisher-Yates shuffle, returns new array */
function shuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Generate a solvable shuffled board of given size */
function generateSolvableBoard(size: BoardSize): number[] {
  const total = size * size
  const solved = Array.from({ length: total }, (_, i) => (i === total - 1 ? 0 : i + 1))
  let tiles = shuffle(solved)
  while (!isSolvable(tiles, size)) {
    tiles = shuffle(solved)
  }
  return tiles
}

/** Check if board is in solved state */
function isSolved(tiles: number[], size: BoardSize): boolean {
  const total = size * size
  for (let i = 0; i < total - 1; i++) {
    if (tiles[i] !== i + 1) return false
  }
  return tiles[total - 1] === 0
}

/** Format seconds as MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── localStorage helpers ───────────────────────────────────────────────────

const BEST_KEY = 'fifteenPuzzle_best'

function loadBestRecords(): Record<BoardSize, BestRecord | null> {
  if (typeof window === 'undefined') return { 3: null, 4: null, 5: null }
  try {
    const raw = localStorage.getItem(BEST_KEY)
    return raw ? JSON.parse(raw) : { 3: null, 4: null, 5: null }
  } catch {
    return { 3: null, 4: null, 5: null }
  }
}

function saveBestRecord(size: BoardSize, record: BestRecord): void {
  try {
    const all = loadBestRecords()
    all[size] = record
    localStorage.setItem(BEST_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

// ── Confetti ───────────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  opacity: number
}

function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      particlesRef.current = []
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#f97316']
    particlesRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.3 - canvas.height * 0.1,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1,
    }))

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.01)

      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.rotation += p.rotationSpeed
        if (p.y > canvas.height * 0.7) p.opacity -= 0.02

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        ctx.restore()
      }

      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 10 }}
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function FifteenPuzzle() {
  const t = useTranslations('fifteenPuzzle')

  const [size, setSize] = useState<BoardSize>(4)
  const [tiles, setTiles] = useState<number[]>(() => generateSolvableBoard(4))
  const [moves, setMoves] = useState(0)
  const [time, setTime] = useState(0)
  const [running, setRunning] = useState(false)
  const [solved, setSolved] = useState(false)
  const [bestRecords, setBestRecords] = useState<Record<BoardSize, BestRecord | null>>({ 3: null, 4: null, 5: null })
  const [showConfetti, setShowConfetti] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load best records on mount
  useEffect(() => {
    setBestRecords(loadBestRecords())
  }, [])

  // Timer
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [running])

  const startNewGame = useCallback((newSize?: BoardSize) => {
    const s = newSize ?? size
    if (timerRef.current) clearInterval(timerRef.current)
    setSize(s)
    setTiles(generateSolvableBoard(s))
    setMoves(0)
    setTime(0)
    setRunning(false)
    setSolved(false)
    setShowConfetti(false)
  }, [size])

  const handleTileClick = useCallback((index: number) => {
    if (solved) return

    setTiles(prev => {
      const blankIndex = prev.indexOf(0)
      const tileRow = Math.floor(index / size)
      const tileCol = index % size
      const blankRow = Math.floor(blankIndex / size)
      const blankCol = blankIndex % size

      // Check adjacency
      const isAdjacent =
        (tileRow === blankRow && Math.abs(tileCol - blankCol) === 1) ||
        (tileCol === blankCol && Math.abs(tileRow - blankRow) === 1)

      if (!isAdjacent) return prev

      const next = [...prev]
      ;[next[index], next[blankIndex]] = [next[blankIndex], next[index]]
      return next
    })

    setMoves(m => {
      const newMoves = m + 1
      // Start timer on first move
      if (m === 0) setRunning(true)
      return newMoves
    })
  }, [size, solved])

  // Win detection
  useEffect(() => {
    if (moves === 0) return
    if (isSolved(tiles, size)) {
      setRunning(false)
      setSolved(true)
      setShowConfetti(true)

      // Update best record
      const currentBest = bestRecords[size]
      const isBetter = !currentBest || moves < currentBest.moves || (moves === currentBest.moves && time < currentBest.time)
      if (isBetter) {
        const record: BestRecord = { moves, time }
        saveBestRecord(size, record)
        setBestRecords(prev => ({ ...prev, [size]: record }))
      }

      setTimeout(() => setShowConfetti(false), 4000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles])

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.preventDefault()
      if (solved) return

      setTiles(prev => {
        const blankIndex = prev.indexOf(0)
        const blankRow = Math.floor(blankIndex / size)
        const blankCol = blankIndex % size

        // Arrow key direction = direction of tile movement into blank
        // e.g. ArrowRight means the tile to the LEFT of blank slides right (into blank)
        let tileIndex = -1
        if (e.key === 'ArrowRight' && blankCol > 0) {
          tileIndex = blankIndex - 1
        } else if (e.key === 'ArrowLeft' && blankCol < size - 1) {
          tileIndex = blankIndex + 1
        } else if (e.key === 'ArrowDown' && blankRow > 0) {
          tileIndex = blankIndex - size
        } else if (e.key === 'ArrowUp' && blankRow < size - 1) {
          tileIndex = blankIndex + size
        }

        if (tileIndex < 0) return prev
        const next = [...prev]
        ;[next[blankIndex], next[tileIndex]] = [next[tileIndex], next[blankIndex]]
        return next
      })

      setMoves(m => {
        if (m === 0) setRunning(true)
        return m + 1
      })
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [size, solved])

  const currentBest = bestRecords[size]

  // Tile cell size based on board size
  const tileSizeClass = size === 3 ? 'text-2xl' : size === 4 ? 'text-xl' : 'text-base'
  const gapClass = size === 5 ? 'gap-1' : 'gap-2'

  // Check if tile is in correct position
  const isCorrect = (index: number, value: number) => {
    if (value === 0) return false
    return value === index + 1
  }

  const sizeOptions: { key: BoardSize; label: string }[] = [
    { key: 3, label: t('size3') },
    { key: 4, label: t('size4') },
    { key: 5, label: t('size5') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Board size selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('boardSize')}:</span>
          {sizeOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => startNewGame(key)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                size === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('moves')}</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{moves}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('time')}</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatTime(time)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
            <Trophy className="w-3 h-3" />
            {t('best')}
          </div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {currentBest ? `${currentBest.moves}` : '—'}
          </div>
          {currentBest && (
            <div className="text-xs text-gray-400">{formatTime(currentBest.time)}</div>
          )}
        </div>
      </div>

      {/* Game board */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative overflow-hidden">
        <ConfettiCanvas active={showConfetti} />

        {/* Win message */}
        {solved && (
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 flex flex-col items-center justify-center z-20 rounded-xl">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('congratulations')}</h2>
            <p className="text-lg text-green-600 dark:text-green-400 font-semibold mb-2">{t('solved')}</p>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              {moves} {t('moves')} · {formatTime(time)}
            </p>
            <button
              onClick={() => startNewGame()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t('newGame')}
            </button>
          </div>
        )}

        {/* The puzzle grid */}
        <div className="flex items-center justify-center">
          <div
            className={`grid ${gapClass}`}
            style={{
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              width: size === 3 ? '270px' : size === 4 ? '320px' : '350px',
              maxWidth: '100%',
            }}
          >
            {tiles.map((value, index) => {
              const isBlank = value === 0
              const correct = !isBlank && isCorrect(index, value)
              const blankIndex = tiles.indexOf(0)
              const blankRow = Math.floor(blankIndex / size)
              const blankCol = blankIndex % size
              const tileRow = Math.floor(index / size)
              const tileCol = index % size
              const adjacent =
                !isBlank &&
                ((tileRow === blankRow && Math.abs(tileCol - blankCol) === 1) ||
                  (tileCol === blankCol && Math.abs(tileRow - blankRow) === 1))

              return (
                <button
                  key={index}
                  onClick={() => !isBlank && handleTileClick(index)}
                  disabled={isBlank || solved}
                  aria-label={isBlank ? 'empty' : `tile ${value}`}
                  style={{
                    aspectRatio: '1',
                    transition: 'all 0.12s ease',
                  }}
                  className={[
                    'flex items-center justify-center rounded-lg font-bold select-none',
                    tileSizeClass,
                    isBlank
                      ? 'invisible cursor-default'
                      : correct
                      ? 'bg-green-500 text-white shadow-md hover:bg-green-600 cursor-pointer'
                      : adjacent
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-500 cursor-pointer active:scale-95'
                      : 'bg-blue-600 text-white shadow-md hover:bg-blue-700 cursor-pointer active:scale-95',
                  ].join(' ')}
                >
                  {isBlank ? '' : value}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* New Game button */}
      <div className="flex justify-center">
        <button
          onClick={() => startNewGame()}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-md"
        >
          <RotateCcw className="w-4 h-4" />
          {t('newGame')}
        </button>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('guide.title')}</h2>
        <div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('guide.rules.title')}</h3>
          <ul className="space-y-1">
            {(t.raw('guide.rules.items') as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <strong>팁:</strong> 방향키(↑↓←→)를 사용하면 더 빠르게 조작할 수 있습니다. 초록색 타일은 정확한 위치에 있는 것입니다.
          </div>
        </div>
      </div>
    </div>
  )
}
