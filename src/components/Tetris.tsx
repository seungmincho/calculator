'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, RotateCcw, Pause, Play, Gamepad2 } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'

// ── Types ──────────────────────────────────────────────────────────────────
type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
type GameState = 'idle' | 'playing' | 'paused' | 'gameover'
type Grid = (string | null)[][]

interface Piece {
  type: TetrominoType
  x: number
  y: number
  rotation: number
}

// ── Constants ──────────────────────────────────────────────────────────────
const COLS = 10
const ROWS = 20
const NEXT_COUNT = 3

const TETROMINOS: Record<TetrominoType, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
}

const COLORS: Record<TetrominoType, string> = {
  I: '#06b6d4', // cyan-500
  O: '#eab308', // yellow-500
  T: '#a855f7', // purple-500
  S: '#22c55e', // green-500
  Z: '#ef4444', // red-500
  J: '#3b82f6', // blue-500
  L: '#f97316', // orange-500
}

const DARK_COLORS: Record<TetrominoType, string> = {
  I: '#0891b2',
  O: '#ca8a04',
  T: '#9333ea',
  S: '#16a34a',
  Z: '#dc2626',
  J: '#2563eb',
  L: '#ea580c',
}

// Score table: lines cleared → points (×level)
const SCORE_TABLE = [0, 100, 300, 500, 800]

// Drop interval (ms) by level
const getDropInterval = (level: number) => Math.max(100, 1000 - (level - 1) * 80)

// SRS wall kick offsets for J, L, T, S, Z
const WALL_KICKS_JLTSZ: Record<string, [number, number][]> = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
}

// SRS wall kick offsets for I
const WALL_KICKS_I: Record<string, [number, number][]> = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
}

// ── Helpers ────────────────────────────────────────────────────────────────
function createBag(): TetrominoType[] {
  const pieces: TetrominoType[] = ['I','O','T','S','Z','J','L']
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]]
  }
  return pieces
}

function createEmptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function getShape(type: TetrominoType, rotation: number): number[][] {
  return TETROMINOS[type][rotation % TETROMINOS[type].length]
}

function isValidPosition(grid: Grid, type: TetrominoType, x: number, y: number, rotation: number): boolean {
  const shape = getShape(type, rotation)
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue
      const nx = x + col
      const ny = y + row
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false
      if (ny >= 0 && grid[ny][nx]) return false
    }
  }
  return true
}

function placePieceOnGrid(grid: Grid, type: TetrominoType, x: number, y: number, rotation: number): Grid {
  const newGrid = grid.map(row => [...row])
  const shape = getShape(type, rotation)
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue
      const ny = y + row
      const nx = x + col
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        newGrid[ny][nx] = type
      }
    }
  }
  return newGrid
}

function clearLines(grid: Grid): { newGrid: Grid; linesCleared: number } {
  const newGrid = grid.filter(row => row.some(cell => cell === null))
  const linesCleared = ROWS - newGrid.length
  const emptyRows = Array.from({ length: linesCleared }, () => Array(COLS).fill(null))
  return { newGrid: [...emptyRows, ...newGrid], linesCleared }
}

function getGhostY(grid: Grid, type: TetrominoType, x: number, y: number, rotation: number): number {
  let ghostY = y
  while (isValidPosition(grid, type, x, ghostY + 1, rotation)) {
    ghostY++
  }
  return ghostY
}

function getSpawnPosition(type: TetrominoType): { x: number; y: number } {
  // Center piece horizontally
  const shape = getShape(type, 0)
  const width = shape[0].length
  return { x: Math.floor((COLS - width) / 2), y: -1 }
}

function tryRotate(
  grid: Grid,
  piece: Piece,
  dir: 1 | -1
): Piece | null {
  const numRotations = TETROMINOS[piece.type].length
  const newRotation = ((piece.rotation + dir) % numRotations + numRotations) % numRotations
  const key = `${piece.rotation}>${newRotation}`
  const kicks = piece.type === 'I' ? WALL_KICKS_I[key] : (piece.type === 'O' ? [[0,0]] as [number,number][] : WALL_KICKS_JLTSZ[key])
  if (!kicks) return null
  for (const [dx, dy] of kicks) {
    const nx = piece.x + dx
    const ny = piece.y - dy // SRS uses inverted y
    if (isValidPosition(grid, piece.type, nx, ny, newRotation)) {
      return { ...piece, x: nx, y: ny, rotation: newRotation }
    }
  }
  return null
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Tetris() {
  const t = useTranslations('tetris')

  const [gameState, setGameState] = useState<GameState>('idle')
  const [grid, setGrid] = useState<Grid>(createEmptyGrid())
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [nextPieces, setNextPieces] = useState<TetrominoType[]>([])
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [clearingRows, setClearingRows] = useState<number[]>([])

  // Refs for game loop (avoid stale closures)
  const gridRef = useRef<Grid>(createEmptyGrid())
  const currentPieceRef = useRef<Piece | null>(null)
  const holdPieceRef = useRef<TetrominoType | null>(null)
  const canHoldRef = useRef(true)
  const nextPiecesRef = useRef<TetrominoType[]>([])
  const bagRef = useRef<TetrominoType[]>([])
  const scoreRef = useRef(0)
  const levelRef = useRef(1)
  const linesRef = useRef(0)
  const gameStateRef = useRef<GameState>('idle')
  const rafRef = useRef<number | null>(null)
  const lastDropRef = useRef<number>(0)
  const softDropRef = useRef(false)

  // Touch refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const leaderboard = useLeaderboard('tetris', undefined)
  const [showNameModal, setShowNameModal] = useState(false)
  const gameStartTimeRef = useRef<number>(Date.now())

  // Load best score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tetris-best-score')
      if (saved) setBestScore(parseInt(saved, 10))
    } catch {}
  }, [])

  // ── Piece bag ──────────────────────────────────────────────────────────
  const dequeue = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) bagRef.current = createBag()
    const piece = bagRef.current.shift()!
    // Refill preview
    while (bagRef.current.length < NEXT_COUNT + 1) {
      bagRef.current = [...bagRef.current, ...createBag()]
    }
    return piece
  }, [])

  const initBag = useCallback(() => {
    bagRef.current = [...createBag(), ...createBag()]
    // Pre-fill nextPieces
    const next: TetrominoType[] = []
    for (let i = 0; i < NEXT_COUNT; i++) next.push(bagRef.current[i])
    return next
  }, [])

  // ── Spawn piece ────────────────────────────────────────────────────────
  const spawnPiece = useCallback((type: TetrominoType): Piece => {
    const { x, y } = getSpawnPosition(type)
    return { type, x, y, rotation: 0 }
  }, [])

  // ── Lock piece & clear lines ───────────────────────────────────────────
  const lockPiece = useCallback(() => {
    const piece = currentPieceRef.current
    if (!piece) return

    const newGrid = placePieceOnGrid(gridRef.current, piece.type, piece.x, piece.y, piece.rotation)
    const { newGrid: clearedGrid, linesCleared } = clearLines(newGrid)

    // Find cleared row indices for animation
    const clearedIndices: number[] = []
    if (linesCleared > 0) {
      for (let r = 0; r < ROWS; r++) {
        if (newGrid[r].every(cell => cell !== null)) {
          clearedIndices.push(r)
        }
      }
      setClearingRows(clearedIndices)
      setTimeout(() => setClearingRows([]), 300)
    }

    const newLines = linesRef.current + linesCleared
    const newLevel = Math.floor(newLines / 10) + 1
    const pointsGained = (SCORE_TABLE[linesCleared] ?? 0) * levelRef.current
    const newScore = scoreRef.current + pointsGained

    gridRef.current = clearedGrid
    linesRef.current = newLines
    levelRef.current = newLevel
    scoreRef.current = newScore

    setGrid(clearedGrid)
    setLines(newLines)
    setLevel(newLevel)
    setScore(newScore)

    if (newScore > bestScore) {
      setBestScore(newScore)
      try { localStorage.setItem('tetris-best-score', String(newScore)) } catch {}
    }

    // Spawn next piece
    const nextType = bagRef.current[0]
    bagRef.current.shift()
    if (bagRef.current.length < NEXT_COUNT + 1) {
      bagRef.current = [...bagRef.current, ...createBag()]
    }

    const next = bagRef.current.slice(0, NEXT_COUNT) as TetrominoType[]
    nextPiecesRef.current = next
    setNextPieces([...next])

    const newPiece = spawnPiece(nextType)

    // Check game over
    if (!isValidPosition(clearedGrid, newPiece.type, newPiece.x, newPiece.y, newPiece.rotation)) {
      gameStateRef.current = 'gameover'
      setGameState('gameover')
      currentPieceRef.current = null
      setCurrentPiece(null)
      return
    }

    currentPieceRef.current = newPiece
    setCurrentPiece(newPiece)
    canHoldRef.current = true
    setCanHold(true)
    lastDropRef.current = performance.now()
  }, [bestScore, spawnPiece])

  // ── Move helpers ───────────────────────────────────────────────────────
  const movePiece = useCallback((dx: number, dy: number): boolean => {
    const piece = currentPieceRef.current
    if (!piece) return false
    const nx = piece.x + dx
    const ny = piece.y + dy
    if (isValidPosition(gridRef.current, piece.type, nx, ny, piece.rotation)) {
      const newPiece = { ...piece, x: nx, y: ny }
      currentPieceRef.current = newPiece
      setCurrentPiece(newPiece)
      return true
    }
    return false
  }, [])

  const rotatePiece = useCallback((dir: 1 | -1) => {
    const piece = currentPieceRef.current
    if (!piece) return
    const rotated = tryRotate(gridRef.current, piece, dir)
    if (rotated) {
      currentPieceRef.current = rotated
      setCurrentPiece(rotated)
    }
  }, [])

  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current
    if (!piece) return
    const ghostY = getGhostY(gridRef.current, piece.type, piece.x, piece.y, piece.rotation)
    // Add hard drop bonus (2 per row)
    const dropDistance = ghostY - piece.y
    scoreRef.current += dropDistance * 2
    setScore(scoreRef.current)
    currentPieceRef.current = { ...piece, y: ghostY }
    setCurrentPiece({ ...piece, y: ghostY })
    lockPiece()
  }, [lockPiece])

  const holdCurrentPiece = useCallback(() => {
    if (!canHoldRef.current) return
    const piece = currentPieceRef.current
    if (!piece) return

    const prevHold = holdPieceRef.current
    holdPieceRef.current = piece.type
    setHoldPiece(piece.type)
    canHoldRef.current = false
    setCanHold(false)

    let nextType: TetrominoType
    if (prevHold !== null) {
      nextType = prevHold
    } else {
      nextType = bagRef.current[0]
      bagRef.current.shift()
      if (bagRef.current.length < NEXT_COUNT + 1) {
        bagRef.current = [...bagRef.current, ...createBag()]
      }
      const next = bagRef.current.slice(0, NEXT_COUNT) as TetrominoType[]
      nextPiecesRef.current = next
      setNextPieces([...next])
    }

    const newPiece = spawnPiece(nextType)
    currentPieceRef.current = newPiece
    setCurrentPiece(newPiece)
    lastDropRef.current = performance.now()
  }, [spawnPiece])

  // ── Game loop ──────────────────────────────────────────────────────────
  const gameLoop = useCallback((timestamp: number) => {
    if (gameStateRef.current !== 'playing') return

    const interval = softDropRef.current
      ? Math.min(50, getDropInterval(levelRef.current))
      : getDropInterval(levelRef.current)

    if (timestamp - lastDropRef.current > interval) {
      lastDropRef.current = timestamp
      const moved = movePiece(0, 1)
      if (!moved) {
        lockPiece()
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [movePiece, lockPiece])

  // ── Start / Restart ────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const emptyGrid = createEmptyGrid()
    gridRef.current = emptyGrid
    scoreRef.current = 0
    levelRef.current = 1
    linesRef.current = 0
    holdPieceRef.current = null
    canHoldRef.current = true
    bagRef.current = []

    const nextList = initBag()

    // Pop first piece
    const firstType = bagRef.current[0]
    bagRef.current.shift()
    const next = bagRef.current.slice(0, NEXT_COUNT) as TetrominoType[]

    nextPiecesRef.current = next
    setNextPieces([...next])

    const firstPiece = spawnPiece(firstType)
    currentPieceRef.current = firstPiece

    setGrid(emptyGrid)
    setScore(0)
    setLevel(1)
    setLines(0)
    setHoldPiece(null)
    setCanHold(true)
    setCurrentPiece(firstPiece)
    setNextPieces([...next])
    setClearingRows([])
    gameStateRef.current = 'playing'
    setGameState('playing')
    lastDropRef.current = performance.now()
    softDropRef.current = false
    gameStartTimeRef.current = Date.now()

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(gameLoop)
    // suppress unused warning
    void nextList
  }, [initBag, spawnPiece, gameLoop])

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      gameStateRef.current = 'paused'
      setGameState('paused')
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    } else if (gameStateRef.current === 'paused') {
      gameStateRef.current = 'playing'
      setGameState('playing')
      lastDropRef.current = performance.now()
      rafRef.current = requestAnimationFrame(gameLoop)
    }
  }, [gameLoop])

  // ── Keyboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing' && e.key !== 'p' && e.key !== 'P') return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          movePiece(-1, 0)
          break
        case 'ArrowRight':
          e.preventDefault()
          movePiece(1, 0)
          break
        case 'ArrowDown':
          e.preventDefault()
          softDropRef.current = true
          if (movePiece(0, 1)) {
            scoreRef.current += 1
            setScore(scoreRef.current)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          rotatePiece(1)
          break
        case 'z':
        case 'Z':
          rotatePiece(-1)
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'c':
        case 'C':
          holdCurrentPiece()
          break
        case 'p':
        case 'P':
          if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
            togglePause()
          }
          break
        default:
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        softDropRef.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [movePiece, rotatePiece, hardDrop, holdCurrentPiece, togglePause])

  // ── Touch controls ─────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameStateRef.current !== 'playing') return
    e.preventDefault()
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (gameStateRef.current !== 'playing') return
    e.preventDefault()
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.time
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    const SWIPE_THRESHOLD = 30
    const TAP_THRESHOLD = 10

    if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
      // Tap → rotate
      rotatePiece(1)
    } else if (absDx > absDy && absDx > SWIPE_THRESHOLD) {
      // Horizontal swipe → move
      movePiece(dx > 0 ? 1 : -1, 0)
    } else if (dy > SWIPE_THRESHOLD) {
      // Swipe down → soft drop (multiple rows based on distance)
      const steps = Math.floor(absDy / 20)
      for (let i = 0; i < Math.max(1, steps); i++) {
        if (!movePiece(0, 1)) {
          lockPiece()
          break
        }
        scoreRef.current += 1
        setScore(scoreRef.current)
      }
    } else if (dy < -SWIPE_THRESHOLD && dt < 300) {
      // Fast swipe up → hard drop
      hardDrop()
    }

    touchStartRef.current = null
  }, [movePiece, rotatePiece, hardDrop, lockPiece])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Leaderboard: detect game over
  useEffect(() => {
    if (gameState === 'gameover') {
      if (leaderboard.checkQualifies(score)) {
        setShowNameModal(true)
      }
      leaderboard.fetchLeaderboard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState])

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    const duration = Date.now() - gameStartTimeRef.current
    await leaderboard.submitScore(score, name, duration)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, score])

  // ── Render helpers ─────────────────────────────────────────────────────
  const isDarkMode = typeof window !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : false

  const getColor = (type: TetrominoType): string => isDarkMode ? DARK_COLORS[type] : COLORS[type]

  // Build display grid (board + current piece + ghost)
  const buildDisplayGrid = (): (string | null)[][] => {
    const display: (string | null)[][] = grid.map(row => [...row])
    const piece = currentPiece

    if (piece) {
      const shape = getShape(piece.type, piece.rotation)
      const ghostY = getGhostY(grid, piece.type, piece.x, piece.y, piece.rotation)

      // Draw ghost
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (!shape[row][col]) continue
          const ny = ghostY + row
          const nx = piece.x + col
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && !display[ny][nx]) {
            display[ny][nx] = `ghost-${piece.type}`
          }
        }
      }

      // Draw current piece
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (!shape[row][col]) continue
          const ny = piece.y + row
          const nx = piece.x + col
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            display[ny][nx] = piece.type
          }
        }
      }
    }

    return display
  }

  // Mini grid for next/hold panels
  const MiniPiece = ({ type }: { type: TetrominoType }) => {
    const shape = getShape(type, 0)
    const rows = shape.length
    const cols = shape[0].length
    const color = COLORS[type]

    return (
      <div className="flex items-center justify-center p-2">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1px' }}>
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => (
              <div
                key={`${r}-${c}`}
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: shape[r][c] ? color : 'transparent',
                  borderRadius: shape[r][c] ? 2 : 0,
                  border: shape[r][c] ? `1px solid ${color}cc` : 'none',
                }}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  const displayGrid = buildDisplayGrid()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Gamepad2 className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main game area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">

        {/* Left panel: Hold + Stats (desktop) */}
        <div className="hidden lg:flex flex-col gap-4 w-36">
          {/* Hold */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('hold')}</p>
            <div className="h-16 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
              {holdPiece ? (
                <MiniPiece type={holdPiece} />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
            {!canHold && holdPiece && (
              <p className="text-xs text-gray-400 text-center mt-1">{t('holdUsed')}</p>
            )}
          </div>

          {/* Score */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('score')}</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{score.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('level')}</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{level}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('lines')}</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{lines}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Trophy className="w-3 h-3" />{t('bestScore')}
              </p>
              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{bestScore.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Game board */}
        <div className="relative">
          <div
            className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'none' }}
          >
            {/* Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gap: 1,
                padding: 4,
                backgroundColor: '#111827',
              }}
            >
              {displayGrid.map((row, rowIdx) =>
                row.map((cell, colIdx) => {
                  const isGhost = cell?.startsWith('ghost-')
                  const type = isGhost ? cell!.replace('ghost-', '') as TetrominoType : cell as TetrominoType | null
                  const isClearing = clearingRows.includes(rowIdx)

                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      style={{
                        width: 28,
                        height: 28,
                        backgroundColor: isGhost
                          ? `${COLORS[type!]}33`
                          : type
                            ? COLORS[type!]
                            : '#1f2937',
                        borderRadius: 2,
                        border: isGhost
                          ? `1px solid ${COLORS[type!]}66`
                          : type
                            ? `1px solid ${COLORS[type!]}aa`
                            : '1px solid #374151',
                        transition: isClearing ? 'background-color 0.15s ease' : undefined,
                        ...(isClearing && type ? { backgroundColor: '#fff', border: '1px solid #fff' } : {}),
                      }}
                    />
                  )
                })
              )}
            </div>

            {/* Idle overlay */}
            {gameState === 'idle' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 rounded-xl">
                <p className="text-white text-2xl font-bold">TETRIS</p>
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  {t('newGame')}
                </button>
              </div>
            )}

            {/* Paused overlay */}
            {gameState === 'paused' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 rounded-xl">
                <p className="text-white text-2xl font-bold">{t('paused')}</p>
                <button
                  onClick={togglePause}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />{t('resume')}
                </button>
              </div>
            )}

            {/* Game over overlay */}
            {gameState === 'gameover' && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4 rounded-xl">
                <p className="text-red-400 text-2xl font-bold">{t('gameOver')}</p>
                <div className="text-center">
                  <p className="text-gray-300 text-sm">{t('score')}</p>
                  <p className="text-white text-3xl font-bold">{score.toLocaleString()}</p>
                </div>
                {score >= bestScore && score > 0 && (
                  <div className="flex items-center gap-1 text-yellow-400 text-sm font-semibold">
                    <Trophy className="w-4 h-4" />
                    {t('newRecord')}
                  </div>
                )}
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />{t('newGame')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Next pieces */}
        <div className="hidden lg:flex flex-col gap-4 w-36">
          {/* Next */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('next')}</p>
            <div className="space-y-2">
              {(gameState !== 'idle' ? nextPieces : []).map((type, i) => (
                <div key={i} className={`h-14 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg ${i === 0 ? '' : 'opacity-60'}`}>
                  <MiniPiece type={type} />
                </div>
              ))}
              {gameState === 'idle' && Array(NEXT_COUNT).fill(null).map((_, i) => (
                <div key={i} className="h-14 bg-gray-50 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
            <div className="flex gap-2">
              {gameState === 'playing' ? (
                <button
                  onClick={togglePause}
                  className="flex-1 flex items-center justify-center gap-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg py-2 text-xs font-medium hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                >
                  <Pause className="w-3 h-3" />{t('pause')}
                </button>
              ) : gameState === 'paused' ? (
                <button
                  onClick={togglePause}
                  className="flex-1 flex items-center justify-center gap-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg py-2 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                >
                  <Play className="w-3 h-3" />{t('resume')}
                </button>
              ) : null}
              <button
                onClick={startGame}
                className="flex-1 flex items-center justify-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg py-2 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />{t('newGame')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: Stats row below board */}
        <div className="lg:hidden w-full max-w-xs mx-auto space-y-3">
          {/* Stats + Hold row */}
          <div className="flex gap-3">
            {/* Hold */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('hold')}</p>
              <div className="h-12 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                {holdPiece && <MiniPiece type={holdPiece} />}
              </div>
            </div>
            {/* Next */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('next')}</p>
              <div className="flex gap-1">
                {(gameState !== 'idle' ? nextPieces.slice(0, 2) : [null, null]).map((type, i) => (
                  <div key={i} className="flex-1 h-12 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {type && <MiniPiece type={type} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Score row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: t('score'), value: score.toLocaleString(), color: 'text-blue-600 dark:text-blue-400' },
              { label: t('level'), value: level, color: 'text-purple-600 dark:text-purple-400' },
              { label: t('lines'), value: lines, color: 'text-green-600 dark:text-green-400' },
              { label: t('bestScore'), value: bestScore.toLocaleString(), color: 'text-yellow-600 dark:text-yellow-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Mobile buttons */}
          <div className="flex gap-2">
            {gameState === 'playing' ? (
              <button onClick={togglePause} className="flex-1 flex items-center justify-center gap-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg py-2 text-sm font-medium">
                <Pause className="w-4 h-4" />{t('pause')}
              </button>
            ) : gameState === 'paused' ? (
              <button onClick={togglePause} className="flex-1 flex items-center justify-center gap-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg py-2 text-sm font-medium">
                <Play className="w-4 h-4" />{t('resume')}
              </button>
            ) : null}
            <button onClick={startGame} className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg py-2 text-sm font-medium">
              <RotateCcw className="w-4 h-4" />{t('newGame')}
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <LeaderboardPanel leaderboard={leaderboard} />
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={score}
        formatScore={leaderboard.config.formatScore}
        defaultName={leaderboard.savedPlayerName}
      />

      {/* Controls guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Keyboard controls */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('guide.keyboard.title')}</h3>
            <div className="space-y-1">
              {(t.raw('guide.keyboard.items') as string[]).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Touch controls */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('guide.touch.title')}</h3>
            <div className="space-y-1">
              {(t.raw('guide.touch.items') as string[]).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Scoring */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('guide.scoring.title')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(t.raw('guide.scoring.items') as string[]).map((item, i) => (
              <div key={i} className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2 text-center text-sm text-gray-700 dark:text-gray-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
