'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, RotateCcw, Pause, Play, Gamepad2, BookOpen, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'

// ── Types ──────────────────────────────────────────────────────────────────
type GameMode = 'classic' | 'infinite' | 'obstacles'
type Difficulty = 'slow' | 'normal' | 'fast' | 'accelerating'
type Direction = 'up' | 'down' | 'left' | 'right'
type GameState = 'menu' | 'playing' | 'paused' | 'gameover'
type SnakeSkin = 'green' | 'blue' | 'purple' | 'rainbow'
type FoodType = 'normal' | 'bonus' | 'special'

interface Position {
  x: number
  y: number
}

interface Food extends Position {
  type: FoodType
  spawnTime: number
}

// ── Constants ──────────────────────────────────────────────────────────────
const GRID_SIZE = 20

const SPEED_MAP: Record<Difficulty, number> = {
  slow: 150,
  normal: 100,
  fast: 70,
  accelerating: 150,
}

const FOOD_POINTS: Record<FoodType, number> = {
  normal: 1,
  bonus: 3,
  special: 5,
}

const SKIN_COLORS: Record<SnakeSkin, { head: string; body: string; tail: string }> = {
  green: { head: '#15803d', body: '#22c55e', tail: '#86efac' },
  blue: { head: '#1d4ed8', body: '#3b82f6', tail: '#93c5fd' },
  purple: { head: '#7e22ce', body: '#a855f7', tail: '#d8b4fe' },
  rainbow: { head: '#ef4444', body: '#eab308', tail: '#22c55e' },
}

const FOOD_COLORS: Record<FoodType, string> = {
  normal: '#ef4444',
  bonus: '#f97316',
  special: '#eab308',
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const DIRECTION_DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getHighScoreKey(mode: GameMode): string {
  return `snakeGame_highScore_${mode}`
}

function loadHighScore(mode: GameMode): number {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(localStorage.getItem(getHighScoreKey(mode)) || '0', 10)
  } catch {
    return 0
  }
}

function saveHighScore(mode: GameMode, score: number): void {
  try {
    localStorage.setItem(getHighScoreKey(mode), String(score))
  } catch { /* ignore */ }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function posEquals(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

function posInArray(pos: Position, arr: Position[]): boolean {
  return arr.some(p => p.x === pos.x && p.y === pos.y)
}

// ── Component ──────────────────────────────────────────────────────────────
export default function SnakeGame() {
  const t = useTranslations('snakeGame')

  // ── UI State (triggers re-renders) ──
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [mode, setMode] = useState<GameMode>('classic')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [skin, setSkin] = useState<SnakeSkin>('green')
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [deathFlash, setDeathFlash] = useState(false)

  const leaderboard = useLeaderboard('snakeGame', mode === 'classic' && difficulty !== 'accelerating' ? difficulty : undefined)
  const [showNameModal, setShowNameModal] = useState(false)
  const gameStartTimeRef = useRef<number>(Date.now())

  // ── Game State Refs (no re-renders during gameplay) ──
  const snakeRef = useRef<Position[]>([])
  const foodRef = useRef<Food | null>(null)
  const bonusFoodRef = useRef<Food | null>(null)
  const directionRef = useRef<Direction>('right')
  const nextDirectionRef = useRef<Direction>('right')
  const scoreRef = useRef(0)
  const obstaclesRef = useRef<Position[]>([])
  const intervalRef = useRef(SPEED_MAP.normal)
  const lastTickRef = useRef(0)
  const rafRef = useRef<number>(0)
  const gameStateRef = useRef<GameState>('menu')
  const modeRef = useRef<GameMode>('classic')
  const difficultyRef = useRef<Difficulty>('normal')
  const skinRef = useRef<SnakeSkin>('green')
  const highScoreRef = useRef(0)

  // ── Canvas ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cellSizeRef = useRef(0)

  // ── Touch ──
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Sync refs
  useEffect(() => { gameStateRef.current = gameState }, [gameState])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { difficultyRef.current = difficulty }, [difficulty])
  useEffect(() => { skinRef.current = skin }, [skin])

  // Detect touch
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Leaderboard: detect game over
  useEffect(() => {
    if (gameState === 'gameover' && mode === 'classic' && difficulty !== 'accelerating') {
      if (leaderboard.checkQualifies(score)) {
        setShowNameModal(true)
      }
      leaderboard.fetchLeaderboard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState])

  // ── Canvas sizing ──
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const maxW = container.clientWidth
    const maxH = Math.min(window.innerHeight * 0.65, maxW)
    const cellSize = Math.floor(Math.min(maxW, maxH) / GRID_SIZE)
    const size = cellSize * GRID_SIZE

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    cellSizeRef.current = cellSize

    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [])

  useEffect(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [updateCanvasSize])

  // ── Spawn food ──
  const spawnFood = useCallback((type: FoodType): Food | null => {
    const snake = snakeRef.current
    const obstacles = obstaclesRef.current
    const occupied = [...snake, ...(foodRef.current ? [foodRef.current] : []), ...(bonusFoodRef.current ? [bonusFoodRef.current] : []), ...obstacles]

    let attempts = 0
    while (attempts < 200) {
      const pos = { x: randomInt(0, GRID_SIZE - 1), y: randomInt(0, GRID_SIZE - 1) }
      if (!posInArray(pos, occupied)) {
        return { ...pos, type, spawnTime: Date.now() }
      }
      attempts++
    }
    return null
  }, [])

  // ── Generate obstacles ──
  const generateObstacles = useCallback((count: number): Position[] => {
    const snake = snakeRef.current
    const result: Position[] = []
    let attempts = 0
    while (result.length < count && attempts < 500) {
      const pos = { x: randomInt(0, GRID_SIZE - 1), y: randomInt(0, GRID_SIZE - 1) }
      // Don't place near snake start area
      if (pos.x < 6 && pos.y >= 9 && pos.y <= 11) { attempts++; continue }
      if (!posInArray(pos, snake) && !posInArray(pos, result)) {
        result.push(pos)
      }
      attempts++
    }
    return result
  }, [])

  // ── Draw ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cell = cellSizeRef.current
    if (cell === 0) return
    const size = cell * GRID_SIZE
    const isDark = document.documentElement.classList.contains('dark')

    // Clear
    ctx.clearRect(0, 0, size, size)

    // Grid background
    const bgColor = isDark ? '#1f2937' : '#f0fdf4'
    const gridColor = isDark ? '#374151' : '#dcfce7'
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, size)

    // Grid lines
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.5
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * cell, 0)
      ctx.lineTo(i * cell, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * cell)
      ctx.lineTo(size, i * cell)
      ctx.stroke()
    }

    // Obstacles
    const obstacles = obstaclesRef.current
    for (const obs of obstacles) {
      ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af'
      ctx.fillRect(obs.x * cell + 1, obs.y * cell + 1, cell - 2, cell - 2)
      // Inner detail
      ctx.fillStyle = isDark ? '#4b5563' : '#6b7280'
      ctx.fillRect(obs.x * cell + 3, obs.y * cell + 3, cell - 6, cell - 6)
    }

    // Food drawing helper
    const drawFood = (food: Food) => {
      const elapsed = Date.now() - food.spawnTime
      const scaleAnim = Math.min(1, elapsed / 200)
      const scale = 0.4 + 0.4 * scaleAnim
      const cx = food.x * cell + cell / 2
      const cy = food.y * cell + cell / 2
      const r = (cell / 2 - 2) * scale

      // Glow
      if (food.type !== 'normal') {
        const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 200)
        ctx.globalAlpha = pulse
        ctx.beginPath()
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
        ctx.fillStyle = food.type === 'bonus' ? '#fb923c' : '#fbbf24'
        ctx.fill()
        ctx.globalAlpha = 1
      }

      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = FOOD_COLORS[food.type]
      ctx.fill()

      // Shine
      ctx.beginPath()
      ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fill()

      // Label for special foods
      if (food.type === 'bonus') {
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.floor(cell * 0.4)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('3', cx, cy)
      } else if (food.type === 'special') {
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.floor(cell * 0.35)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('\u2605', cx, cy)
      }
    }

    // Draw foods
    if (foodRef.current) drawFood(foodRef.current)
    if (bonusFoodRef.current) drawFood(bonusFoodRef.current)

    // Snake
    const snake = snakeRef.current
    const currentSkin = skinRef.current
    const colors = SKIN_COLORS[currentSkin]

    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i]
      const t_ratio = snake.length > 1 ? i / (snake.length - 1) : 0

      let color: string
      if (currentSkin === 'rainbow') {
        const hue = (i * 25 + Date.now() / 20) % 360
        color = `hsl(${hue}, 80%, 55%)`
      } else {
        // Gradient from head to tail
        const r1 = parseInt(colors.head.slice(1, 3), 16)
        const g1 = parseInt(colors.head.slice(3, 5), 16)
        const b1 = parseInt(colors.head.slice(5, 7), 16)
        const r2 = parseInt(colors.tail.slice(1, 3), 16)
        const g2 = parseInt(colors.tail.slice(3, 5), 16)
        const b2 = parseInt(colors.tail.slice(5, 7), 16)
        const r = Math.round(r1 + (r2 - r1) * t_ratio)
        const g = Math.round(g1 + (g2 - g1) * t_ratio)
        const b = Math.round(b1 + (b2 - b1) * t_ratio)
        color = `rgb(${r},${g},${b})`
      }

      const padding = i === 0 ? 1 : 2
      const radius = i === 0 ? cell * 0.3 : cell * 0.2

      ctx.fillStyle = color
      const x = seg.x * cell + padding
      const y = seg.y * cell + padding
      const w = cell - padding * 2
      const h = cell - padding * 2

      // Rounded rect
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + w - radius, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
      ctx.lineTo(x + w, y + h - radius)
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
      ctx.lineTo(x + radius, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.fill()

      // Head: draw eyes
      if (i === 0) {
        const dir = directionRef.current
        const cx = seg.x * cell + cell / 2
        const cy = seg.y * cell + cell / 2
        const eyeOff = cell * 0.2
        const eyeR = cell * 0.1
        const pupilR = cell * 0.05

        let eye1: Position, eye2: Position
        let pupilOff: Position

        if (dir === 'up') {
          eye1 = { x: cx - eyeOff, y: cy - eyeOff * 0.5 }
          eye2 = { x: cx + eyeOff, y: cy - eyeOff * 0.5 }
          pupilOff = { x: 0, y: -pupilR }
        } else if (dir === 'down') {
          eye1 = { x: cx - eyeOff, y: cy + eyeOff * 0.5 }
          eye2 = { x: cx + eyeOff, y: cy + eyeOff * 0.5 }
          pupilOff = { x: 0, y: pupilR }
        } else if (dir === 'left') {
          eye1 = { x: cx - eyeOff * 0.5, y: cy - eyeOff }
          eye2 = { x: cx - eyeOff * 0.5, y: cy + eyeOff }
          pupilOff = { x: -pupilR, y: 0 }
        } else {
          eye1 = { x: cx + eyeOff * 0.5, y: cy - eyeOff }
          eye2 = { x: cx + eyeOff * 0.5, y: cy + eyeOff }
          pupilOff = { x: pupilR, y: 0 }
        }

        // Eye whites
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(eye1.x, eye1.y, eyeR, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(eye2.x, eye2.y, eyeR, 0, Math.PI * 2)
        ctx.fill()

        // Pupils
        ctx.fillStyle = '#1a1a1a'
        ctx.beginPath()
        ctx.arc(eye1.x + pupilOff.x, eye1.y + pupilOff.y, pupilR, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(eye2.x + pupilOff.x, eye2.y + pupilOff.y, pupilR, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Death flash overlay
    if (gameStateRef.current === 'gameover') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
      ctx.fillRect(0, 0, size, size)
    }
  }, [])

  // ── Game tick ──
  const tick = useCallback(() => {
    const snake = snakeRef.current
    if (snake.length === 0) return

    // Apply buffered direction
    const nextDir = nextDirectionRef.current
    if (nextDir !== OPPOSITE[directionRef.current]) {
      directionRef.current = nextDir
    }

    const head = snake[0]
    const delta = DIRECTION_DELTA[directionRef.current]
    let newHead: Position = { x: head.x + delta.x, y: head.y + delta.y }

    const currentMode = modeRef.current

    // Wrap-around for infinite mode
    if (currentMode === 'infinite') {
      newHead.x = ((newHead.x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE
      newHead.y = ((newHead.y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE
    }

    // Wall collision (classic & obstacles)
    if (currentMode !== 'infinite') {
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        endGame()
        return
      }
    }

    // Self collision (check against all but last segment, which will move)
    const bodyToCheck = snake.slice(0, -1) // exclude tail which may move away
    if (posInArray(newHead, bodyToCheck)) {
      endGame()
      return
    }

    // Obstacle collision
    if (posInArray(newHead, obstaclesRef.current)) {
      endGame()
      return
    }

    // Move snake
    const newSnake = [newHead, ...snake]

    // Check food
    let ate = false
    if (foodRef.current && posEquals(newHead, foodRef.current)) {
      scoreRef.current += FOOD_POINTS[foodRef.current.type]
      foodRef.current = spawnFood('normal')
      ate = true
    }
    if (bonusFoodRef.current && posEquals(newHead, bonusFoodRef.current)) {
      scoreRef.current += FOOD_POINTS[bonusFoodRef.current.type]
      bonusFoodRef.current = null
      ate = true
    }

    if (!ate) {
      newSnake.pop() // remove tail
    }

    snakeRef.current = newSnake

    // Update score state
    setScore(scoreRef.current)

    // Accelerating difficulty: speed up
    if (difficultyRef.current === 'accelerating') {
      intervalRef.current = Math.max(50, 150 - scoreRef.current * 2)
    }

    // Spawn bonus food randomly
    if (!bonusFoodRef.current && Math.random() < 0.02) {
      const type: FoodType = Math.random() < 0.3 ? 'special' : 'bonus'
      bonusFoodRef.current = spawnFood(type)
    }

    // Expire bonus food
    if (bonusFoodRef.current) {
      const elapsed = Date.now() - bonusFoodRef.current.spawnTime
      const timeout = bonusFoodRef.current.type === 'special' ? 3000 : 7000
      if (elapsed > timeout) {
        bonusFoodRef.current = null
      }
    }

    // Add more obstacles periodically in obstacle mode
    if (currentMode === 'obstacles' && scoreRef.current > 0 && scoreRef.current % 10 === 0) {
      const existing = obstaclesRef.current
      if (existing.length < 30) {
        const newObs = spawnFood('normal')
        if (newObs) {
          obstaclesRef.current = [...existing, { x: newObs.x, y: newObs.y }]
        }
      }
    }
  }, [spawnFood])

  const endGame = useCallback(() => {
    setGameState('gameover')
    gameStateRef.current = 'gameover'
    setDeathFlash(true)
    setTimeout(() => setDeathFlash(false), 300)

    const currentScore = scoreRef.current
    const currentMode = modeRef.current
    const best = highScoreRef.current

    if (currentScore > best) {
      highScoreRef.current = currentScore
      setHighScore(currentScore)
      saveHighScore(currentMode, currentScore)
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  // ── Game loop ──
  const gameLoop = useCallback((timestamp: number) => {
    if (gameStateRef.current !== 'playing') {
      draw()
      return
    }

    if (timestamp - lastTickRef.current >= intervalRef.current) {
      tick()
      lastTickRef.current = timestamp
    }

    draw()
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [tick, draw])

  // ── Start game ──
  const startGame = useCallback(() => {
    // Initialize snake at center-left
    const startY = Math.floor(GRID_SIZE / 2)
    snakeRef.current = [
      { x: 4, y: startY },
      { x: 3, y: startY },
      { x: 2, y: startY },
    ]
    directionRef.current = 'right'
    nextDirectionRef.current = 'right'
    scoreRef.current = 0
    setScore(0)
    gameStartTimeRef.current = Date.now()

    // Load high score for current mode
    const best = loadHighScore(mode)
    highScoreRef.current = best
    setHighScore(best)

    // Set speed
    intervalRef.current = SPEED_MAP[difficulty]

    // Generate obstacles
    if (mode === 'obstacles') {
      obstaclesRef.current = generateObstacles(10)
    } else {
      obstaclesRef.current = []
    }

    // Spawn initial food
    foodRef.current = spawnFood('normal')
    bonusFoodRef.current = null

    // Start
    setGameState('playing')
    gameStateRef.current = 'playing'
    lastTickRef.current = performance.now()
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [mode, difficulty, spawnFood, generateObstacles, gameLoop])

  // ── Pause / Resume ──
  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused')
      gameStateRef.current = 'paused'
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing')
      gameStateRef.current = 'playing'
      lastTickRef.current = performance.now()
      rafRef.current = requestAnimationFrame(gameLoop)
    }
  }, [gameLoop])

  // ── Keyboard ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'menu' || gameStateRef.current === 'gameover') return

      let dir: Direction | null = null

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': dir = 'up'; break
        case 'ArrowDown': case 's': case 'S': dir = 'down'; break
        case 'ArrowLeft': case 'a': case 'A': dir = 'left'; break
        case 'ArrowRight': case 'd': case 'D': dir = 'right'; break
        case ' ': case 'p': case 'P':
          e.preventDefault()
          togglePause()
          return
        default: return
      }

      if (dir) {
        e.preventDefault()
        if (dir !== OPPOSITE[directionRef.current]) {
          nextDirectionRef.current = dir
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [togglePause])

  // ── Touch / Swipe ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    const threshold = 30

    if (Math.max(absDx, absDy) < threshold) return

    let dir: Direction
    if (absDx > absDy) {
      dir = dx > 0 ? 'right' : 'left'
    } else {
      dir = dy > 0 ? 'down' : 'up'
    }

    if (gameStateRef.current === 'playing' && dir !== OPPOSITE[directionRef.current]) {
      nextDirectionRef.current = dir
    }
    touchStartRef.current = null
  }, [])

  // ── D-pad controls ──
  const handleDpad = useCallback((dir: Direction) => {
    if (gameStateRef.current !== 'playing') return
    if (dir !== OPPOSITE[directionRef.current]) {
      nextDirectionRef.current = dir
    }
  }, [])

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ── Speed label ──
  const getSpeedLabel = (): string => {
    if (difficulty === 'accelerating') {
      const currentSpeed = Math.max(50, 150 - score * 2)
      return `${currentSpeed}ms`
    }
    return `${SPEED_MAP[difficulty]}ms`
  }

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    const duration = Date.now() - gameStartTimeRef.current
    await leaderboard.submitScore(score, name, duration)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, score])

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Gamepad2 className="w-7 h-7" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left panel: Settings / Score */}
        <div className="lg:col-span-1 space-y-4">
          {/* Score panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('score')}</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                {t('highScore')}
              </span>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{highScore}</span>
            </div>
            {gameState === 'playing' && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('speed')}</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">{getSpeedLabel()}</span>
              </div>
            )}
          </div>

          {/* Mode / Difficulty / Skin (only in menu) */}
          {gameState === 'menu' && (
            <>
              {/* Mode */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('mode')}</h3>
                {(['classic', 'infinite', 'obstacles'] as GameMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      mode === m
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-semibold'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{t(`modes.${m}`)}</div>
                    <div className="text-xs opacity-70 mt-0.5">{t(`modes.${m}Desc`)}</div>
                  </button>
                ))}
              </div>

              {/* Difficulty */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('difficulty')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['slow', 'normal', 'fast', 'accelerating'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        difficulty === d
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t(`difficulties.${d}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('skin')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['green', 'blue', 'purple', 'rainbow'] as SnakeSkin[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setSkin(s)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        skin === s
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: s === 'rainbow' ? 'linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6)' : SKIN_COLORS[s].body }}
                      />
                      {t(`skins.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Controls during game */}
          {(gameState === 'playing' || gameState === 'paused') && (
            <div className="flex gap-2">
              <button
                onClick={togglePause}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {gameState === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {gameState === 'paused' ? t('resume') : t('pause')}
              </button>
              <button
                onClick={() => {
                  if (rafRef.current) cancelAnimationFrame(rafRef.current)
                  rafRef.current = 0
                  setGameState('menu')
                  gameStateRef.current = 'menu'
                }}
                className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Food legend */}
          {gameState !== 'menu' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('foods.title')}</h3>
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: FOOD_COLORS.normal }} />
                  {t('foods.normal')} (+1)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: FOOD_COLORS.bonus }} />
                  {t('foods.bonus')} (+3)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: FOOD_COLORS.special }} />
                  {t('foods.special')} (+5)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Game canvas area */}
        <div className="lg:col-span-3">
          <div
            ref={containerRef}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4"
          >
            {/* Canvas */}
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                className={`rounded-lg border-2 ${
                  deathFlash
                    ? 'border-red-500'
                    : 'border-gray-200 dark:border-gray-700'
                } transition-colors touch-none`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            {/* Menu overlay */}
            {gameState === 'menu' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-sm">
                <div className="text-center space-y-4">
                  <div className="text-4xl sm:text-5xl">&#x1F40D;</div>
                  <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
                  <p className="text-sm text-gray-200 max-w-xs">{t('startHint')}</p>
                  <button
                    onClick={startGame}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl px-8 py-3 font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {t('startGame')}
                  </button>
                </div>
              </div>
            )}

            {/* Paused overlay */}
            {gameState === 'paused' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
                <div className="text-center space-y-3">
                  <Pause className="w-16 h-16 text-white mx-auto" />
                  <h2 className="text-2xl font-bold text-white">{t('paused')}</h2>
                  <button
                    onClick={togglePause}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl px-6 py-2.5 font-medium hover:from-blue-600 hover:to-indigo-700 transition-all"
                  >
                    {t('resume')}
                  </button>
                </div>
              </div>
            )}

            {/* Game Over overlay */}
            {gameState === 'gameover' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm">
                <div className="text-center space-y-4 bg-white/10 backdrop-blur-md rounded-2xl p-8">
                  <h2 className="text-3xl font-bold text-white">{t('gameOver')}</h2>
                  <div className="space-y-1">
                    <p className="text-lg text-gray-200">{t('score')}: <span className="font-bold text-white text-2xl">{score}</span></p>
                    {score >= highScore && score > 0 && (
                      <p className="text-yellow-400 font-bold text-lg flex items-center justify-center gap-1">
                        <Trophy className="w-5 h-5" />
                        {t('newRecord')}
                      </p>
                    )}
                    <p className="text-sm text-gray-300">
                      {t('highScore')}: {highScore}
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={startGame}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl px-6 py-2.5 font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
                    >
                      {t('playAgain')}
                    </button>
                    <button
                      onClick={() => {
                        setGameState('menu')
                        gameStateRef.current = 'menu'
                      }}
                      className="bg-white/20 text-white rounded-xl px-6 py-2.5 font-medium hover:bg-white/30 transition-all"
                    >
                      {t('backToMenu')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile D-pad */}
          {isTouchDevice && (gameState === 'playing' || gameState === 'paused') && (
            <div className="mt-4 flex justify-center">
              <div className="grid grid-cols-3 gap-1 w-40">
                <div />
                <button
                  onTouchStart={(e) => { e.preventDefault(); handleDpad('up') }}
                  className="bg-gray-200 dark:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-xl p-3 flex items-center justify-center touch-none"
                >
                  <ChevronUp className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <div />
                <button
                  onTouchStart={(e) => { e.preventDefault(); handleDpad('left') }}
                  className="bg-gray-200 dark:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-xl p-3 flex items-center justify-center touch-none"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onTouchStart={(e) => { e.preventDefault(); togglePause() }}
                  className="bg-gray-200 dark:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-xl p-2 flex items-center justify-center touch-none"
                >
                  {gameState === 'paused' ? <Play className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Pause className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
                </button>
                <button
                  onTouchStart={(e) => { e.preventDefault(); handleDpad('right') }}
                  className="bg-gray-200 dark:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-xl p-3 flex items-center justify-center touch-none"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <div />
                <button
                  onTouchStart={(e) => { e.preventDefault(); handleDpad('down') }}
                  className="bg-gray-200 dark:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-xl p-3 flex items-center justify-center touch-none"
                >
                  <ChevronDown className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <div />
              </div>
            </div>
          )}
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

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Keyboard controls */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('guide.keyboard.title')}</h3>
            <ul className="space-y-1.5">
              {(t.raw('guide.keyboard.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Touch controls */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('guide.touch.title')}</h3>
            <ul className="space-y-1.5">
              {(t.raw('guide.touch.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Scoring */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('guide.scoring.title')}</h3>
            <ul className="space-y-1.5">
              {(t.raw('guide.scoring.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                  <span className="text-yellow-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
