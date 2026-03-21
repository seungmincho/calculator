'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, RotateCcw } from 'lucide-react'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

// ── Types ──────────────────────────────────────────────────────────────────
type GameState = 'ready' | 'playing' | 'gameover'

interface Bird {
  x: number
  y: number
  vy: number
  radius: number
  rotation: number // visual tilt in radians
}

interface Pipe {
  x: number
  gapTop: number   // y of top of gap
  gapBottom: number // y of bottom of gap
  scored: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────
const CANVAS_W = 400
const CANVAS_H = 600
const GROUND_H = 60
const BIRD_X_RATIO = 0.25
const BIRD_RADIUS = 15
const GRAVITY = 0.25
const FLAP_VELOCITY = -5.5
const PIPE_WIDTH = 60
const PIPE_GAP = 175
const PIPE_SPEED = 2.5
const PIPE_SPAWN_INTERVAL = 120 // frames
const MIN_GAP_TOP = 80
const MAX_GAP_TOP = CANVAS_H - GROUND_H - PIPE_GAP - 80

// ── Helpers ─────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function makePipe(x: number): Pipe {
  const gapTop = Math.floor(Math.random() * (MAX_GAP_TOP - MIN_GAP_TOP + 1)) + MIN_GAP_TOP
  return { x, gapTop, gapBottom: gapTop + PIPE_GAP, scored: false }
}

function circleRectCollide(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  // nearest point on rect to circle center
  const nearX = clamp(cx, rx, rx + rw)
  const nearY = clamp(cy, ry, ry + rh)
  const dx = cx - nearX
  const dy = cy - nearY
  return dx * dx + dy * dy < cr * cr
}

// ── Drawing helpers ─────────────────────────────────────────────────────────
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawBird(ctx: CanvasRenderingContext2D, bird: Bird) {
  ctx.save()
  ctx.translate(bird.x, bird.y)
  // clamp rotation for visual appeal
  ctx.rotate(clamp(bird.rotation, -0.4, 0.9))

  // Body (yellow circle)
  ctx.beginPath()
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2)
  const bodyGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, bird.radius)
  bodyGrad.addColorStop(0, '#FFE033')
  bodyGrad.addColorStop(1, '#F5A623')
  ctx.fillStyle = bodyGrad
  ctx.fill()
  ctx.strokeStyle = '#D4880A'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Wing (slightly darker ellipse on left-bottom)
  ctx.save()
  ctx.translate(-4, 5)
  ctx.scale(1, 0.55)
  ctx.beginPath()
  ctx.arc(0, 0, bird.radius * 0.65, 0, Math.PI * 2)
  ctx.fillStyle = '#F09020'
  ctx.fill()
  ctx.restore()

  // Eye white
  ctx.beginPath()
  ctx.arc(6, -5, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Eye pupil
  ctx.beginPath()
  ctx.arc(7.5, -5.5, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#222'
  ctx.fill()

  // Pupil shine
  ctx.beginPath()
  ctx.arc(8.5, -7, 1.2, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()

  // Beak (orange triangle pointing right)
  ctx.beginPath()
  ctx.moveTo(bird.radius - 1, -2)
  ctx.lineTo(bird.radius + 10, 1)
  ctx.lineTo(bird.radius - 1, 5)
  ctx.closePath()
  ctx.fillStyle = '#FF8C00'
  ctx.fill()
  ctx.strokeStyle = '#CC6600'
  ctx.lineWidth = 0.8
  ctx.stroke()

  ctx.restore()
}

function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe) {
  const pipeGreen = '#5DB832'
  const pipeDark = '#3A8A1A'
  const pipeShadow = '#2E6E14'
  const capH = 20
  const capOverhang = 6

  // ── Top pipe body ──
  ctx.fillStyle = pipeGreen
  ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop - capH)

  // Top pipe highlight stripe
  ctx.fillStyle = '#7FD84E'
  ctx.fillRect(pipe.x + 5, 0, 10, pipe.gapTop - capH)

  // Top pipe shadow
  ctx.fillStyle = pipeDark
  ctx.fillRect(pipe.x + PIPE_WIDTH - 10, 0, 10, pipe.gapTop - capH)

  // Top pipe cap
  ctx.fillStyle = pipeDark
  ctx.fillRect(pipe.x - capOverhang, pipe.gapTop - capH, PIPE_WIDTH + capOverhang * 2, capH)
  ctx.fillStyle = pipeGreen
  ctx.fillRect(pipe.x - capOverhang + 4, pipe.gapTop - capH, 10, capH)
  ctx.fillStyle = pipeShadow
  ctx.fillRect(pipe.x - capOverhang + PIPE_WIDTH + capOverhang * 2 - 12, pipe.gapTop - capH, 12, capH)

  // Bottom pipe body
  ctx.fillStyle = pipeGreen
  ctx.fillRect(pipe.x, pipe.gapBottom + capH, PIPE_WIDTH, CANVAS_H - GROUND_H - pipe.gapBottom - capH)

  // Bottom pipe highlight stripe
  ctx.fillStyle = '#7FD84E'
  ctx.fillRect(pipe.x + 5, pipe.gapBottom + capH, 10, CANVAS_H - GROUND_H - pipe.gapBottom - capH)

  // Bottom pipe shadow
  ctx.fillStyle = pipeDark
  ctx.fillRect(pipe.x + PIPE_WIDTH - 10, pipe.gapBottom + capH, 10, CANVAS_H - GROUND_H - pipe.gapBottom - capH)

  // Bottom pipe cap
  ctx.fillStyle = pipeDark
  ctx.fillRect(pipe.x - capOverhang, pipe.gapBottom, PIPE_WIDTH + capOverhang * 2, capH)
  ctx.fillStyle = pipeGreen
  ctx.fillRect(pipe.x - capOverhang + 4, pipe.gapBottom, 10, capH)
  ctx.fillStyle = pipeShadow
  ctx.fillRect(pipe.x - capOverhang + PIPE_WIDTH + capOverhang * 2 - 12, pipe.gapBottom, 12, capH)
}

function drawBackground(ctx: CanvasRenderingContext2D, groundOffset: number) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H - GROUND_H)
  skyGrad.addColorStop(0, '#5AC8FA')
  skyGrad.addColorStop(1, '#87CEEB')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H - GROUND_H)

  // Simple cloud-like puffs (static)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  drawCloudGroup(ctx, 60, 80)
  drawCloudGroup(ctx, 250, 120)
  drawCloudGroup(ctx, 340, 60)

  // Ground
  const groundY = CANVAS_H - GROUND_H
  ctx.fillStyle = '#78C94C'
  ctx.fillRect(0, groundY, CANVAS_W, 18)
  ctx.fillStyle = '#5EA832'
  ctx.fillRect(0, groundY + 18, CANVAS_W, GROUND_H - 18)

  // Scrolling ground stripe pattern
  const stripeW = 40
  ctx.fillStyle = '#6DBC45'
  for (let sx = (-groundOffset % stripeW) - stripeW; sx < CANVAS_W + stripeW; sx += stripeW * 2) {
    ctx.fillRect(sx, groundY + 18, stripeW, GROUND_H - 18)
  }
}

function drawCloudGroup(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const puffs = [
    [0, 0, 22],
    [20, -8, 18],
    [38, 0, 20],
    [55, -4, 16],
  ]
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath()
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawScore(ctx: CanvasRenderingContext2D, score: number) {
  ctx.save()
  ctx.font = 'bold 42px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillText(String(score), CANVAS_W / 2 + 2, 22)

  // White text
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(String(score), CANVAS_W / 2, 20)
  ctx.restore()
}

// ── Component ───────────────────────────────────────────────────────────────
export default function FlappyBird() {
  const t = useTranslations('flappyBird')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const stateRef = useRef<GameState>('ready')
  const birdRef = useRef<Bird>({
    x: CANVAS_W * BIRD_X_RATIO,
    y: CANVAS_H / 2,
    vy: 0,
    radius: BIRD_RADIUS,
    rotation: 0,
  })
  const pipesRef = useRef<Pipe[]>([])
  const scoreRef = useRef(0)
  const frameRef = useRef(0)
  const groundOffsetRef = useRef(0)
  const bobFrameRef = useRef(0)

  const [gameState, setGameState] = useState<GameState>('ready')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)

  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const resultRecordedRef = useRef(false)

  // Load best score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flappybird-best')
      if (saved) setBestScore(parseInt(saved, 10))
    } catch {
      // ignore
    }
  }, [])

  const saveBest = useCallback((s: number) => {
    try {
      localStorage.setItem('flappybird-best', String(s))
    } catch {
      // ignore
    }
  }, [])

  const resetGame = useCallback(() => {
    birdRef.current = {
      x: CANVAS_W * BIRD_X_RATIO,
      y: CANVAS_H / 2,
      vy: 0,
      radius: BIRD_RADIUS,
      rotation: 0,
    }
    pipesRef.current = []
    scoreRef.current = 0
    frameRef.current = 0
    groundOffsetRef.current = 0
    bobFrameRef.current = 0
  }, [])

  const flap = useCallback(() => {
    if (stateRef.current === 'ready') {
      stateRef.current = 'playing'
      setGameState('playing')
    }
    if (stateRef.current === 'playing') {
      birdRef.current.vy = FLAP_VELOCITY
    }
  }, [])

  const startOver = useCallback(() => {
    resetGame()
    stateRef.current = 'ready'
    setGameState('ready')
    setScore(0)
    resultRecordedRef.current = false
  }, [resetGame])

  // ── Game Loop ────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const state = stateRef.current
    const bird = birdRef.current
    frameRef.current++
    groundOffsetRef.current = (groundOffsetRef.current + PIPE_SPEED) % 80

    // ── Update physics ──
    if (state === 'playing') {
      bird.vy += GRAVITY
      bird.y += bird.vy
      bird.rotation = Math.atan2(bird.vy, 8)

      // Spawn pipes
      if (frameRef.current % PIPE_SPAWN_INTERVAL === 0) {
        pipesRef.current.push(makePipe(CANVAS_W + PIPE_WIDTH))
      }

      // Move pipes + score
      let newScore = scoreRef.current
      for (const pipe of pipesRef.current) {
        pipe.x -= PIPE_SPEED
        if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x - bird.radius) {
          pipe.scored = true
          newScore++
        }
      }
      // Remove off-screen pipes
      pipesRef.current = pipesRef.current.filter(p => p.x + PIPE_WIDTH + 10 > 0)

      if (newScore !== scoreRef.current) {
        scoreRef.current = newScore
        setScore(newScore)
      }

      // ── Collision detection ──
      const groundY = CANVAS_H - GROUND_H
      const hitGround = bird.y + bird.radius >= groundY
      const hitCeiling = bird.y - bird.radius <= 0

      let hitPipe = false
      for (const pipe of pipesRef.current) {
        // Top pipe body (x, 0, PIPE_WIDTH, gapTop - capH)
        if (circleRectCollide(bird.x, bird.y, bird.radius - 2, pipe.x - 6, 0, PIPE_WIDTH + 12, pipe.gapTop)) {
          hitPipe = true
          break
        }
        // Bottom pipe body
        if (circleRectCollide(bird.x, bird.y, bird.radius - 2, pipe.x - 6, pipe.gapBottom, PIPE_WIDTH + 12, CANVAS_H - pipe.gapBottom)) {
          hitPipe = true
          break
        }
      }

      if (hitGround || hitCeiling || hitPipe) {
        if (hitGround) bird.y = groundY - bird.radius
        stateRef.current = 'gameover'
        setGameState('gameover')

        if (!resultRecordedRef.current) {
          resultRecordedRef.current = true
          const final = scoreRef.current
          recordGameResult({
            gameType: 'flappybird',
            result: final >= 10 ? 'win' : 'loss',
            difficulty: 'normal',
            moves: final,
          })
        }

        const final = scoreRef.current
        setBestScore(prev => {
          const next = Math.max(prev, final)
          if (next > prev) saveBest(next)
          return next
        })
      }
    } else if (state === 'ready') {
      // Bob animation
      bobFrameRef.current++
      bird.y = CANVAS_H / 2 + Math.sin(bobFrameRef.current * 0.07) * 8
      bird.rotation = Math.sin(bobFrameRef.current * 0.07) * 0.15
    }

    // ── Draw ────────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    drawBackground(ctx, groundOffsetRef.current)

    for (const pipe of pipesRef.current) {
      drawPipe(ctx, pipe)
    }

    drawBird(ctx, bird)

    if (state === 'playing' || state === 'gameover') {
      drawScore(ctx, scoreRef.current)
    }

    // ── Overlay messages ──
    if (state === 'ready') {
      // Score = 0 shown subtly
      ctx.save()
      ctx.font = 'bold 30px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillText('0', CANVAS_W / 2 + 2, 22)
      ctx.fillStyle = '#FFF'
      ctx.fillText('0', CANVAS_W / 2, 20)
      ctx.restore()

      // "Tap to Start" pill
      const pillW = 200
      const pillH = 44
      const pillX = CANVAS_W / 2 - pillW / 2
      const pillY = CANVAS_H / 2 + 60
      ctx.save()
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 22)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fill()
      ctx.font = 'bold 17px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#FFF'
      ctx.fillText(t('start'), CANVAS_W / 2, pillY + pillH / 2)
      ctx.restore()
    }

    if (state === 'gameover') {
      // Semi-transparent overlay
      ctx.save()
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H - GROUND_H)

      // Game Over card
      const cardW = 280
      const cardH = 140
      const cardX = CANVAS_W / 2 - cardW / 2
      const cardY = CANVAS_H / 2 - cardH / 2 - 20
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fill()

      // "Game Over" title
      ctx.font = 'bold 28px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#E53935'
      ctx.fillText(t('gameOver'), CANVAS_W / 2, cardY + 16)

      // Score row
      ctx.font = '16px Arial, sans-serif'
      ctx.fillStyle = '#555'
      ctx.fillText(t('score'), CANVAS_W / 2 - 60, cardY + 60)
      ctx.font = 'bold 24px Arial, sans-serif'
      ctx.fillStyle = '#222'
      ctx.fillText(String(scoreRef.current), CANVAS_W / 2 - 60, cardY + 80)

      // Best row
      ctx.font = '16px Arial, sans-serif'
      ctx.fillStyle = '#555'
      ctx.fillText(t('best'), CANVAS_W / 2 + 60, cardY + 60)
      ctx.font = 'bold 24px Arial, sans-serif'
      ctx.fillStyle = '#F5A623'
      // best shown after setBestScore - use the ref version
      const displayBest = Math.max(scoreRef.current, bestScore)
      ctx.fillText(String(displayBest), CANVAS_W / 2 + 60, cardY + 80)

      ctx.restore()
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [t, saveBest, bestScore])

  // Start/restart loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [gameLoop])

  // ── Input handling ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        if (stateRef.current !== 'gameover') flap()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flap])

  const handleCanvasInteract = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (stateRef.current !== 'gameover') {
      flap()
    }
  }, [flap])

  // Scale canvas to container width for mobile
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasScale, setCanvasScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerW = containerRef.current.clientWidth
        const maxW = Math.min(containerW, CANVAS_W)
        setCanvasScale(maxW / CANVAS_W)
      }
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Game Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
        {/* Score bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('best')}: <span className="text-yellow-600 dark:text-yellow-400">{bestScore}</span>
            </span>
          </div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('score')}: <span className="text-blue-600 dark:text-blue-400">{score}</span>
          </div>
        </div>

        {/* Canvas container */}
        <div ref={containerRef} className="flex justify-center">
          <div
            style={{
              width: CANVAS_W * canvasScale,
              height: CANVAS_H * canvasScale,
              position: 'relative',
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onClick={handleCanvasInteract}
              onTouchStart={handleCanvasInteract}
              style={{
                width: CANVAS_W * canvasScale,
                height: CANVAS_H * canvasScale,
                display: 'block',
                borderRadius: 12,
                cursor: 'pointer',
                touchAction: 'none',
                userSelect: 'none',
              }}
            />
          </div>
        </div>

        {/* Game over controls */}
        {gameState === 'gameover' && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={startOver}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              {t('retry')}
            </button>
          </div>
        )}

        {/* Hint text */}
        {gameState !== 'gameover' && (
          <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
            {t('tap')}
          </p>
        )}
      </div>

      {/* Achievements */}
      <GameAchievements
        achievements={achievements}
        unlockedCount={unlockedCount}
        totalCount={totalCount}
      />

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div>
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
            {t('guide.rules.title')}
          </h3>
          <ul className="space-y-1">
            {(t.raw('guide.rules.items') as string[]).map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="mt-0.5 text-blue-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <AchievementToast
        achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null}
        onDismiss={dismissNewAchievements}
      />
    </div>
  )
}
