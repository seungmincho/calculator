'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, RotateCcw, Pause, Play, Gamepad2, Volume2, VolumeX } from 'lucide-react'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GuideSection from '@/components/GuideSection'

// ── Types ──────────────────────────────────────────────────────────────────
type GameState = 'idle' | 'playing' | 'paused' | 'gameover' | 'levelclear'

interface Brick {
  x: number
  y: number
  w: number
  h: number
  color: string
  darkColor: string
  hits: number // 0 = destroyed, 1 = one hit left, 2 = two hits left
  points: number
  row: number
}

interface Ball {
  x: number
  y: number
  dx: number
  dy: number
  radius: number
  speed: number
}

interface PowerUp {
  x: number
  y: number
  w: number
  h: number
  type: 'wide' | 'multi' | 'life'
  dy: number
}

interface Particle {
  x: number
  y: number
  dx: number
  dy: number
  life: number
  maxLife: number
  color: string
  size: number
}

// ── Constants ──────────────────────────────────────────────────────────────
const PADDLE_HEIGHT = 14
const PADDLE_WIDTH_NORMAL = 100
const PADDLE_WIDTH_WIDE = 160
const BALL_RADIUS = 6
const BALL_SPEED_BASE = 5
const BRICK_ROWS = 6
const BRICK_COLS = 10
const BRICK_PADDING = 4
const BRICK_TOP_OFFSET = 60
const POWERUP_SIZE = 20
const POWERUP_SPEED = 2.5
const POWERUP_CHANCE = 0.15
const MAX_LIVES = 5
const WIDE_PADDLE_DURATION = 10000

const ROW_COLORS = [
  { color: '#ef4444', dark: '#b91c1c' },
  { color: '#f97316', dark: '#c2410c' },
  { color: '#eab308', dark: '#a16207' },
  { color: '#22c55e', dark: '#15803d' },
  { color: '#3b82f6', dark: '#1d4ed8' },
  { color: '#8b5cf6', dark: '#6d28d9' },
  { color: '#ec4899', dark: '#be185d' },
  { color: '#14b8a6', dark: '#0f766e' },
]

const POWERUP_COLORS: Record<string, string> = {
  wide: '#3b82f6',
  multi: '#f97316',
  life: '#ef4444',
}

const POWERUP_SYMBOLS: Record<string, string> = {
  wide: 'W',
  multi: 'M',
  life: '+',
}

// ── Level Layouts ──────────────────────────────────────────────────────────
// 0 = empty, 1 = normal brick, 2 = 2-hit brick
function generateLevel(level: number, cols: number, rows: number): number[][] {
  const grid: number[][] = []

  switch ((level - 1) % 5) {
    case 0: // Full grid, top row 2-hit
      for (let r = 0; r < rows; r++) {
        const row: number[] = []
        for (let c = 0; c < cols; c++) {
          row.push(r === 0 ? 2 : 1)
        }
        grid.push(row)
      }
      break
    case 1: // Checkerboard with 2-hit
      for (let r = 0; r < rows; r++) {
        const row: number[] = []
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 === 0) {
            row.push(r < 2 ? 2 : 1)
          } else {
            row.push(0)
          }
        }
        grid.push(row)
      }
      break
    case 2: // Diamond pattern
      for (let r = 0; r < rows; r++) {
        const row: number[] = []
        const midC = Math.floor(cols / 2)
        const midR = Math.floor(rows / 2)
        for (let c = 0; c < cols; c++) {
          const dist = Math.abs(c - midC) + Math.abs(r - midR)
          if (dist <= Math.min(midC, midR)) {
            row.push(dist <= 1 ? 2 : 1)
          } else {
            row.push(0)
          }
        }
        grid.push(row)
      }
      break
    case 3: // Pyramid
      for (let r = 0; r < rows; r++) {
        const row: number[] = []
        const halfW = r + 1
        const start = Math.floor((cols - halfW * 2 + 1) / 2)
        for (let c = 0; c < cols; c++) {
          if (c >= start && c < start + halfW * 2 - 1) {
            row.push(r < 2 ? 2 : 1)
          } else {
            row.push(0)
          }
        }
        grid.push(row)
      }
      break
    case 4: // Fortress
      for (let r = 0; r < rows; r++) {
        const row: number[] = []
        for (let c = 0; c < cols; c++) {
          const isEdge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1
          const isMid = r === Math.floor(rows / 2) || c === Math.floor(cols / 2)
          if (isEdge) {
            row.push(2)
          } else if (isMid) {
            row.push(2)
          } else {
            row.push(1)
          }
        }
        grid.push(row)
      }
      break
  }

  return grid
}

// ── localStorage helpers ───────────────────────────────────────────────────
function loadSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = localStorage.getItem('breakout_sound_enabled')
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

function saveSoundEnabled(v: boolean): void {
  try { localStorage.setItem('breakout_sound_enabled', String(v)) } catch {}
}

function loadHighScore(): number {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(localStorage.getItem('breakout_highScore') || '0', 10)
  } catch { return 0 }
}

function saveHighScore(score: number): void {
  try { localStorage.setItem('breakout_highScore', String(score)) } catch {}
}

// ── Component ──────────────────────────────────────────────────────────────
export default function BreakoutGame() {
  const t = useTranslations('breakoutGame')

  // ── UI State ──
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [highScore, setHighScore] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showGuide, setShowGuide] = useState(false)

  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const resultRecordedRef = useRef(false)

  // ── Refs for game loop (no re-renders during gameplay) ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gameStateRef = useRef<GameState>('idle')
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const levelRef = useRef(1)
  const highScoreRef = useRef(0)
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)

  // Game objects refs
  const paddleRef = useRef({ x: 0, w: PADDLE_WIDTH_NORMAL, targetX: 0 })
  const ballsRef = useRef<Ball[]>([])
  const bricksRef = useRef<Brick[]>([])
  const powerUpsRef = useRef<PowerUp[]>([])
  const particlesRef = useRef<Particle[]>([])

  // Canvas dimensions ref
  const canvasDimsRef = useRef({ w: 0, h: 0, scale: 1 })

  // Wide paddle timer
  const widePaddleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sound ref
  const soundEnabledRef = useRef(true)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Mouse/touch tracking
  const mouseXRef = useRef(0)
  const usingMouseRef = useRef(false)

  // Keyboard state ref
  const keysDownRef = useRef(new Set<string>())

  // ── Sync refs ──
  useEffect(() => { gameStateRef.current = gameState }, [gameState])
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])

  // ── Audio Context ──
  const getAudioCtx = useCallback((): AudioContext | null => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
      return audioCtxRef.current
    } catch { return null }
  }, [])

  // ── Sound Effects ──
  const playBounce = useCallback(() => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getAudioCtx()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.04)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.06)
    } catch {}
  }, [getAudioCtx])

  const playBrickBreak = useCallback(() => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getAudioCtx()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    } catch {}
  }, [getAudioCtx])

  const playPowerUp = useCallback(() => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getAudioCtx()
      if (!ctx) return
      const notes = [523, 659, 784]
      notes.forEach((freq, i) => {
        const t0 = ctx.currentTime + i * 0.07
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, t0)
        gain.gain.setValueAtTime(0, t0)
        gain.gain.linearRampToValueAtTime(0.2, t0 + 0.01)
        gain.gain.linearRampToValueAtTime(0, t0 + 0.06)
        osc.start(t0)
        osc.stop(t0 + 0.06)
      })
    } catch {}
  }, [getAudioCtx])

  const playGameOver = useCallback(() => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getAudioCtx()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }, [getAudioCtx])

  const playLevelClear = useCallback(() => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getAudioCtx()
      if (!ctx) return
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        const t0 = ctx.currentTime + i * 0.1
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, t0)
        gain.gain.setValueAtTime(0, t0)
        gain.gain.linearRampToValueAtTime(0.25, t0 + 0.01)
        gain.gain.linearRampToValueAtTime(0, t0 + 0.09)
        osc.start(t0)
        osc.stop(t0 + 0.09)
      })
    } catch {}
  }, [getAudioCtx])

  const playWallBounce = useCallback(() => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getAudioCtx()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.04)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.04)
    } catch {}
  }, [getAudioCtx])

  // ── Canvas Sizing ──
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const maxW = container.clientWidth
    const GAME_W = 600
    const GAME_H = 500
    const scale = Math.min(maxW / GAME_W, 1)
    const displayW = Math.floor(GAME_W * scale)
    const displayH = Math.floor(GAME_H * scale)

    const dpr = window.devicePixelRatio || 1
    canvas.width = GAME_W * dpr
    canvas.height = GAME_H * dpr
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    canvasDimsRef.current = { w: GAME_W, h: GAME_H, scale }

    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [])

  useEffect(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [updateCanvasSize])

  // ── Brick Creation ──
  const createBricks = useCallback((lvl: number): Brick[] => {
    const { w } = canvasDimsRef.current
    if (w === 0) return []

    const layout = generateLevel(lvl, BRICK_COLS, BRICK_ROWS)
    const brickW = (w - BRICK_PADDING * (BRICK_COLS + 1)) / BRICK_COLS
    const brickH = 18
    const bricks: Brick[] = []

    for (let r = 0; r < layout.length; r++) {
      for (let c = 0; c < layout[r].length; c++) {
        if (layout[r][c] === 0) continue
        const colorIdx = r % ROW_COLORS.length
        bricks.push({
          x: BRICK_PADDING + c * (brickW + BRICK_PADDING),
          y: BRICK_TOP_OFFSET + r * (brickH + BRICK_PADDING),
          w: brickW,
          h: brickH,
          color: ROW_COLORS[colorIdx].color,
          darkColor: ROW_COLORS[colorIdx].dark,
          hits: layout[r][c],
          points: layout[r][c] === 2 ? 20 : 10,
          row: r,
        })
      }
    }

    return bricks
  }, [])

  // ── Create Ball ──
  const createBall = useCallback((x: number, y: number, angle?: number): Ball => {
    const speed = BALL_SPEED_BASE + (levelRef.current - 1) * 0.6
    const a = angle ?? -(Math.PI / 4 + Math.random() * Math.PI / 4)
    return {
      x,
      y,
      dx: speed * Math.cos(a),
      dy: speed * Math.sin(a),
      radius: BALL_RADIUS,
      speed,
    }
  }, [])

  // ── Spawn Particles ──
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      newParticles.push({
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 2 + Math.random() * 3,
      })
    }
    particlesRef.current.push(...newParticles)
  }, [])

  // ── Initialize Level ──
  const initLevel = useCallback((lvl: number) => {
    const { w, h } = canvasDimsRef.current
    if (w === 0) return

    const bricks = createBricks(lvl)
    bricksRef.current = bricks
    powerUpsRef.current = []
    particlesRef.current = []

    const paddleW = PADDLE_WIDTH_NORMAL
    paddleRef.current = { x: (w - paddleW) / 2, w: paddleW, targetX: (w - paddleW) / 2 }

    if (widePaddleTimerRef.current) {
      clearTimeout(widePaddleTimerRef.current)
      widePaddleTimerRef.current = null
    }

    const ballX = w / 2
    const ballY = h - PADDLE_HEIGHT - 20 - BALL_RADIUS
    ballsRef.current = [createBall(ballX, ballY)]
  }, [createBricks, createBall])

  // ── Start Game ──
  const startGame = useCallback(() => {
    const { w } = canvasDimsRef.current
    if (w === 0) {
      updateCanvasSize()
    }
    scoreRef.current = 0
    livesRef.current = 3
    levelRef.current = 1
    highScoreRef.current = loadHighScore()

    setScore(0)
    setLives(3)
    setLevel(1)
    setHighScore(highScoreRef.current)

    initLevel(1)
    setGameState('playing')
    lastTimeRef.current = 0
    resultRecordedRef.current = false
  }, [initLevel, updateCanvasSize])

  // ── Next Level ──
  const nextLevel = useCallback(() => {
    const newLevel = levelRef.current + 1
    levelRef.current = newLevel
    setLevel(newLevel)

    initLevel(newLevel)
    setGameState('playing')
    lastTimeRef.current = 0
  }, [initLevel])

  // ── Toggle Pause ──
  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused')
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing')
      lastTimeRef.current = 0
    }
  }, [])

  // ── Toggle Sound ──
  const toggleSound = useCallback(() => {
    const next = !soundEnabledRef.current
    setSoundEnabled(next)
    soundEnabledRef.current = next
    saveSoundEnabled(next)
  }, [])

  // ── Load initial state ──
  useEffect(() => {
    const hs = loadHighScore()
    setHighScore(hs)
    highScoreRef.current = hs
    const se = loadSoundEnabled()
    setSoundEnabled(se)
    soundEnabledRef.current = se
  }, [])

  // ── Cleanup audio ──
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      if (widePaddleTimerRef.current) {
        clearTimeout(widePaddleTimerRef.current)
      }
    }
  }, [])

  // ── Keyboard Input ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        if (gameStateRef.current === 'idle') {
          startGame()
        } else if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
          togglePause()
        }
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        keysDownRef.current.add(e.key)
        usingMouseRef.current = false
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.key)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [startGame, togglePause])

  // ── Mouse / Touch Input ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getCanvasX = (clientX: number): number => {
      const rect = canvas.getBoundingClientRect()
      const { scale } = canvasDimsRef.current
      return (clientX - rect.left) / scale
    }

    const onMouseMove = (e: MouseEvent) => {
      usingMouseRef.current = true
      mouseXRef.current = getCanvasX(e.clientX)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        usingMouseRef.current = true
        mouseXRef.current = getCanvasX(e.touches[0].clientX)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        usingMouseRef.current = true
        mouseXRef.current = getCanvasX(e.touches[0].clientX)
      }
    }

    const onClick = () => {
      if (gameStateRef.current === 'idle') {
        startGame()
      }
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('click', onClick)
    }
  }, [startGame])

  // ── Game Loop ──
  useEffect(() => {
    const PADDLE_SPEED = 8
    const PADDLE_SMOOTH = 0.15

    const gameLoop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(gameLoop)

      const state = gameStateRef.current
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { w, h } = canvasDimsRef.current
      if (w === 0) return

      const isDark = document.documentElement.classList.contains('dark')

      // ── Update ──
      if (state === 'playing') {
        if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
        const rawDt = timestamp - lastTimeRef.current
        lastTimeRef.current = timestamp
        const dt = Math.min(rawDt, 33) / 16.67

        // Paddle movement
        const paddle = paddleRef.current
        if (keysDownRef.current.has('ArrowLeft')) {
          paddle.targetX -= PADDLE_SPEED * dt
        }
        if (keysDownRef.current.has('ArrowRight')) {
          paddle.targetX += PADDLE_SPEED * dt
        }

        if (usingMouseRef.current) {
          paddle.targetX = mouseXRef.current - paddle.w / 2
        }

        paddle.targetX = Math.max(0, Math.min(w - paddle.w, paddle.targetX))

        if (usingMouseRef.current) {
          paddle.x += (paddle.targetX - paddle.x) * PADDLE_SMOOTH * dt * 3
        } else {
          paddle.x = paddle.targetX
        }
        paddle.x = Math.max(0, Math.min(w - paddle.w, paddle.x))

        // Balls update
        const balls = ballsRef.current
        const bricks = bricksRef.current
        const ballsToRemove: number[] = []

        for (let bi = 0; bi < balls.length; bi++) {
          const ball = balls[bi]

          ball.x += ball.dx * dt
          ball.y += ball.dy * dt

          // Wall collisions
          if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius
            ball.dx = Math.abs(ball.dx)
            playWallBounce()
          }
          if (ball.x + ball.radius >= w) {
            ball.x = w - ball.radius
            ball.dx = -Math.abs(ball.dx)
            playWallBounce()
          }
          if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius
            ball.dy = Math.abs(ball.dy)
            playWallBounce()
          }

          // Bottom - ball lost
          if (ball.y + ball.radius >= h) {
            ballsToRemove.push(bi)
            continue
          }

          // Paddle collision
          const paddleTop = h - PADDLE_HEIGHT - 10
          if (
            ball.dy > 0 &&
            ball.y + ball.radius >= paddleTop &&
            ball.y + ball.radius <= paddleTop + PADDLE_HEIGHT + 4 &&
            ball.x >= paddle.x - ball.radius &&
            ball.x <= paddle.x + paddle.w + ball.radius
          ) {
            const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)
            const maxAngle = Math.PI / 3
            const angle = hitPos * maxAngle
            const speed = ball.speed

            ball.dx = speed * Math.sin(angle)
            ball.dy = -speed * Math.cos(angle)

            if (Math.abs(ball.dy) < speed * 0.3) {
              ball.dy = -speed * 0.3
            }

            ball.y = paddleTop - ball.radius
            playBounce()
          }

          // Brick collision
          for (let bri = bricks.length - 1; bri >= 0; bri--) {
            const brick = bricks[bri]
            if (brick.hits <= 0) continue

            const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w))
            const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h))
            const distX = ball.x - closestX
            const distY = ball.y - closestY

            if (distX * distX + distY * distY <= ball.radius * ball.radius) {
              const overlapX = ball.radius - Math.abs(distX)
              const overlapY = ball.radius - Math.abs(distY)

              if (overlapX < overlapY) {
                ball.dx = -ball.dx
                ball.x += distX > 0 ? overlapX : -overlapX
              } else {
                ball.dy = -ball.dy
                ball.y += distY > 0 ? overlapY : -overlapY
              }

              brick.hits--
              if (brick.hits <= 0) {
                scoreRef.current += brick.points
                setScore(scoreRef.current)
                playBrickBreak()
                spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 8)

                if (scoreRef.current > highScoreRef.current) {
                  highScoreRef.current = scoreRef.current
                  setHighScore(highScoreRef.current)
                  saveHighScore(highScoreRef.current)
                }

                if (Math.random() < POWERUP_CHANCE) {
                  const types: PowerUp['type'][] = ['wide', 'multi', 'life']
                  const type = types[Math.floor(Math.random() * types.length)]
                  powerUpsRef.current.push({
                    x: brick.x + brick.w / 2 - POWERUP_SIZE / 2,
                    y: brick.y,
                    w: POWERUP_SIZE,
                    h: POWERUP_SIZE,
                    type,
                    dy: POWERUP_SPEED,
                  })
                }
              } else {
                playBounce()
                spawnParticles(closestX, closestY, brick.color, 3)
              }

              break
            }
          }
        }

        // Remove dead balls
        for (let i = ballsToRemove.length - 1; i >= 0; i--) {
          balls.splice(ballsToRemove[i], 1)
        }

        // If no balls left, lose a life
        if (balls.length === 0) {
          livesRef.current--
          setLives(livesRef.current)

          if (livesRef.current <= 0) {
            playGameOver()
            setGameState('gameover')
            if (!resultRecordedRef.current) {
              resultRecordedRef.current = true
              recordGameResult({
                gameType: 'breakout',
                result: 'loss',
                difficulty: 'normal',
                moves: scoreRef.current,
              })
            }
            return
          }

          paddle.w = PADDLE_WIDTH_NORMAL
          paddle.x = (w - paddle.w) / 2
          paddle.targetX = paddle.x
          if (widePaddleTimerRef.current) {
            clearTimeout(widePaddleTimerRef.current)
            widePaddleTimerRef.current = null
          }

          const ballX = w / 2
          const ballY = h - PADDLE_HEIGHT - 20 - BALL_RADIUS
          ballsRef.current = [createBall(ballX, ballY)]
          powerUpsRef.current = []
        }

        // Power-ups update
        const pups = powerUpsRef.current
        for (let i = pups.length - 1; i >= 0; i--) {
          const pu = pups[i]
          pu.y += pu.dy * dt

          const paddleTop = h - PADDLE_HEIGHT - 10
          if (
            pu.y + pu.h >= paddleTop &&
            pu.y <= paddleTop + PADDLE_HEIGHT &&
            pu.x + pu.w >= paddle.x &&
            pu.x <= paddle.x + paddle.w
          ) {
            playPowerUp()

            if (pu.type === 'wide') {
              paddle.w = PADDLE_WIDTH_WIDE
              paddle.x = Math.min(paddle.x, w - paddle.w)
              paddle.targetX = paddle.x
              if (widePaddleTimerRef.current) clearTimeout(widePaddleTimerRef.current)
              widePaddleTimerRef.current = setTimeout(() => {
                paddleRef.current.w = PADDLE_WIDTH_NORMAL
                paddleRef.current.x = Math.min(paddleRef.current.x, w - PADDLE_WIDTH_NORMAL)
                paddleRef.current.targetX = paddleRef.current.x
                widePaddleTimerRef.current = null
              }, WIDE_PADDLE_DURATION)
            } else if (pu.type === 'multi') {
              const newBalls: Ball[] = []
              for (const b of balls) {
                const angle = Math.atan2(b.dy, b.dx) + (Math.random() * 0.6 - 0.3)
                newBalls.push({
                  x: b.x,
                  y: b.y,
                  dx: b.speed * Math.cos(angle),
                  dy: b.speed * Math.sin(angle),
                  radius: b.radius,
                  speed: b.speed,
                })
              }
              ballsRef.current.push(...newBalls)
            } else if (pu.type === 'life') {
              if (livesRef.current < MAX_LIVES) {
                livesRef.current++
                setLives(livesRef.current)
              }
            }

            pups.splice(i, 1)
            continue
          }

          if (pu.y > h) {
            pups.splice(i, 1)
          }
        }

        // Particles update
        const particles = particlesRef.current
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          p.x += p.dx * dt
          p.y += p.dy * dt
          p.dy += 0.1 * dt
          p.life -= dt
          if (p.life <= 0) {
            particles.splice(i, 1)
          }
        }

        // Remove destroyed bricks
        const activeBricks = bricks.filter(b => b.hits > 0)
        bricksRef.current = activeBricks

        // Check level clear
        if (activeBricks.length === 0) {
          playLevelClear()
          setGameState('levelclear')
          if (!resultRecordedRef.current) {
            resultRecordedRef.current = true
            recordGameResult({
              gameType: 'breakout',
              result: 'win',
              difficulty: 'normal',
              moves: scoreRef.current,
            })
          }
          return
        }
      }

      // ── Draw ──
      const bgColor = isDark ? '#111827' : '#f0f4ff'
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, w, h)

      // Subtle grid
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
      ctx.lineWidth = 1
      for (let gx = 0; gx < w; gx += 30) {
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, h)
        ctx.stroke()
      }
      for (let gy = 0; gy < h; gy += 30) {
        ctx.beginPath()
        ctx.moveTo(0, gy)
        ctx.lineTo(w, gy)
        ctx.stroke()
      }

      // Draw bricks
      const bricks = bricksRef.current
      for (const brick of bricks) {
        if (brick.hits <= 0) continue

        const isDouble = brick.hits >= 2
        ctx.fillStyle = isDouble ? brick.darkColor : brick.color

        // Rounded rect
        ctx.beginPath()
        const br = 3
        ctx.moveTo(brick.x + br, brick.y)
        ctx.lineTo(brick.x + brick.w - br, brick.y)
        ctx.quadraticCurveTo(brick.x + brick.w, brick.y, brick.x + brick.w, brick.y + br)
        ctx.lineTo(brick.x + brick.w, brick.y + brick.h - br)
        ctx.quadraticCurveTo(brick.x + brick.w, brick.y + brick.h, brick.x + brick.w - br, brick.y + brick.h)
        ctx.lineTo(brick.x + br, brick.y + brick.h)
        ctx.quadraticCurveTo(brick.x, brick.y + brick.h, brick.x, brick.y + brick.h - br)
        ctx.lineTo(brick.x, brick.y + br)
        ctx.quadraticCurveTo(brick.x, brick.y, brick.x + br, brick.y)
        ctx.fill()

        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(brick.x + 2, brick.y + 1, brick.w - 4, 3)

        // 2-hit indicator
        if (isDouble) {
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'
          ctx.lineWidth = 1.5
          ctx.strokeRect(brick.x + 3, brick.y + 3, brick.w - 6, brick.h - 6)
        }
      }

      // Draw particles
      const particles = particlesRef.current
      for (const p of particles) {
        const alpha = Math.max(0, p.life / p.maxLife)
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Draw power-ups
      const pups = powerUpsRef.current
      for (const pu of pups) {
        const color = POWERUP_COLORS[pu.type]
        const symbol = POWERUP_SYMBOLS[pu.type]

        ctx.shadowColor = color
        ctx.shadowBlur = 10
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(pu.x + pu.w / 2, pu.y + pu.h / 2, pu.w / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(symbol, pu.x + pu.w / 2, pu.y + pu.h / 2)
      }

      // Draw paddle
      const paddle = paddleRef.current
      const paddleTop = h - PADDLE_HEIGHT - 10
      const paddleGrad = ctx.createLinearGradient(paddle.x, paddleTop, paddle.x, paddleTop + PADDLE_HEIGHT)
      paddleGrad.addColorStop(0, isDark ? '#60a5fa' : '#3b82f6')
      paddleGrad.addColorStop(1, isDark ? '#2563eb' : '#1d4ed8')
      ctx.fillStyle = paddleGrad

      ctx.beginPath()
      const pr = 6
      ctx.moveTo(paddle.x + pr, paddleTop)
      ctx.lineTo(paddle.x + paddle.w - pr, paddleTop)
      ctx.quadraticCurveTo(paddle.x + paddle.w, paddleTop, paddle.x + paddle.w, paddleTop + pr)
      ctx.lineTo(paddle.x + paddle.w, paddleTop + PADDLE_HEIGHT - pr)
      ctx.quadraticCurveTo(paddle.x + paddle.w, paddleTop + PADDLE_HEIGHT, paddle.x + paddle.w - pr, paddleTop + PADDLE_HEIGHT)
      ctx.lineTo(paddle.x + pr, paddleTop + PADDLE_HEIGHT)
      ctx.quadraticCurveTo(paddle.x, paddleTop + PADDLE_HEIGHT, paddle.x, paddleTop + PADDLE_HEIGHT - pr)
      ctx.lineTo(paddle.x, paddleTop + pr)
      ctx.quadraticCurveTo(paddle.x, paddleTop, paddle.x + pr, paddleTop)
      ctx.fill()

      // Paddle highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillRect(paddle.x + 4, paddleTop + 2, paddle.w - 8, 3)

      // Draw balls
      const balls = ballsRef.current
      for (const ball of balls) {
        ctx.shadowColor = isDark ? '#93c5fd' : '#3b82f6'
        ctx.shadowBlur = 8
        ctx.fillStyle = isDark ? '#e0e7ff' : '#ffffff'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.fillStyle = isDark ? '#93c5fd' : '#3b82f6'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius - 2, 0, Math.PI * 2)
        ctx.fill()

        // Specular
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.beginPath()
        ctx.arc(ball.x - 1.5, ball.y - 1.5, ball.radius * 0.35, 0, Math.PI * 2)
        ctx.fill()
      }

      // HUD on canvas
      ctx.fillStyle = isDark ? '#e5e7eb' : '#1f2937'
      ctx.font = 'bold 14px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('Lv.' + levelRef.current, 10, 10)

      ctx.textAlign = 'center'
      ctx.fillText(String(scoreRef.current), w / 2, 10)

      ctx.textAlign = 'right'
      let heartsStr = ''
      for (let i = 0; i < livesRef.current; i++) heartsStr += '\u2764 '
      ctx.fillStyle = '#ef4444'
      ctx.fillText(heartsStr.trim(), w - 10, 10)

      // Overlays
      if (state === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('BREAKOUT', w / 2, h / 2 - 30)

        ctx.font = '16px system-ui, sans-serif'
        ctx.fillStyle = '#d1d5db'
        ctx.fillText('Click or press Space to start', w / 2, h / 2 + 10)
      }

      if (state === 'paused') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 24px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('PAUSED', w / 2, h / 2)
      }

      if (state === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 28px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('GAME OVER', w / 2, h / 2 - 20)

        ctx.fillStyle = '#d1d5db'
        ctx.font = '16px system-ui, sans-serif'
        ctx.fillText('Score: ' + scoreRef.current, w / 2, h / 2 + 15)
      }

      if (state === 'levelclear') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = '#22c55e'
        ctx.font = 'bold 28px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('LEVEL CLEAR!', w / 2, h / 2 - 20)

        ctx.fillStyle = '#d1d5db'
        ctx.font = '16px system-ui, sans-serif'
        ctx.fillText('Score: ' + scoreRef.current, w / 2, h / 2 + 15)
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [
    playBounce, playBrickBreak, playPowerUp, playGameOver, playLevelClear,
    playWallBounce, spawnParticles, createBall,
  ])

  // ── Render ──
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            {/* Stats Bar */}
            <div className="flex flex-wrap items-center justify-between mb-4 gap-2 text-sm">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('score')}: <span className="text-blue-600 dark:text-blue-400 font-bold">{score}</span>
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('level')}: <span className="text-green-600 dark:text-green-400 font-bold">{level}</span>
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('lives')}: <span className="text-red-500 font-bold">{'\u2764'.repeat(lives)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('highScore')}: <span className="text-yellow-600 dark:text-yellow-400 font-bold">{highScore}</span>
                </span>
              </div>
            </div>

            {/* Canvas Container */}
            <div
              ref={containerRef}
              className="w-full flex justify-center"
              style={{ touchAction: 'none' }}
            >
              <canvas
                ref={canvasRef}
                className="rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-none"
              />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              {gameState === 'idle' && (
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {t('start')}
                </button>
              )}

              {gameState === 'playing' && (
                <button
                  onClick={togglePause}
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 font-medium flex items-center gap-2 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  {t('pause')}
                </button>
              )}

              {gameState === 'paused' && (
                <button
                  onClick={togglePause}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {t('resume')}
                </button>
              )}

              {gameState === 'gameover' && (
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('restart')}
                </button>
              )}

              {gameState === 'levelclear' && (
                <button
                  onClick={nextLevel}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-4 py-3 font-medium hover:from-green-700 hover:to-emerald-700 flex items-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {t('nextLevel')}
                </button>
              )}

              {(gameState === 'playing' || gameState === 'paused') && (
                <button
                  onClick={startGame}
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 font-medium flex items-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('restart')}
                </button>
              )}

              <button
                onClick={toggleSound}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg p-2.5 transition-colors"
                aria-label={soundEnabled ? t('soundOn') : t('soundOff')}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Game Over Info */}
          {gameState === 'gameover' && (
            <div className="bg-red-50 dark:bg-red-950 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">{t('gameOver')}</h3>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p>{t('score')}: <span className="font-bold">{score}</span></p>
                <p>{t('level')}: <span className="font-bold">{level}</span></p>
                <p>{t('highScore')}: <span className="font-bold text-yellow-600 dark:text-yellow-400">{highScore}</span></p>
              </div>
            </div>
          )}

          {/* Level Clear Info */}
          {gameState === 'levelclear' && (
            <div className="bg-green-50 dark:bg-green-950 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-green-600 dark:text-green-400 mb-2">{t('levelClear')}</h3>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p>{t('score')}: <span className="font-bold">{score}</span></p>
                <p>{t('level')}: <span className="font-bold">{level}</span> &rarr; <span className="font-bold">{level + 1}</span></p>
              </div>
            </div>
          )}

          {/* Power-up Legend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Power-Ups</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">W</span>
                <span className="text-gray-700 dark:text-gray-300">{t('powerUpWide')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">M</span>
                <span className="text-gray-700 dark:text-gray-300">{t('powerUpMulti')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">+</span>
                <span className="text-gray-700 dark:text-gray-300">{t('powerUpLife')}</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <GameAchievements
            achievements={achievements}
            unlockedCount={unlockedCount}
            totalCount={totalCount}
          />

          {/* Controls Guide */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-base font-semibold text-gray-900 dark:text-white"
            >
              <span>{t('controls')}</span>
              <span className="text-gray-400">{showGuide ? '\u25B2' : '\u25BC'}</span>
            </button>
            {showGuide && (
              <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">KB</span>
                  <span>{t('controlsKeyboard')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">MS</span>
                  <span>{t('controlsMouse')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">TC</span>
                  <span>{t('controlsTouch')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <AchievementToast
        achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null}
        onDismiss={dismissNewAchievements}
      />

      <GuideSection namespace="breakoutGame" />
    </div>
  )
}
