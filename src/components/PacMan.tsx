'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'

// ── Maze layout: 0=dot, 1=wall, 2=power pellet, 3=empty path
const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,2,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,2,1],
  [1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,3,3,1,3,3,1,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,3,3,3,3,3,3,3,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,1,1,3,3,1,1,3,1,1,0,1,1,1,1],
  [3,3,3,3,0,3,3,1,3,3,3,3,1,3,3,3,0,3,3,3,3],
  [1,1,1,1,0,1,3,1,1,1,1,1,1,3,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,3,3,3,3,3,3,3,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,3,1,1,1,1,1,3,1,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1],
  [1,2,0,1,0,0,0,0,0,0,3,0,0,0,0,0,0,1,0,2,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

const ROWS = MAZE_TEMPLATE.length
const COLS = MAZE_TEMPLATE[0].length
const CELL = 22
const CANVAS_W = COLS * CELL
const CANVAS_H = ROWS * CELL

type Dir = { x: number; y: number }
const UP: Dir = { x: 0, y: -1 }
const DOWN: Dir = { x: 0, y: 1 }
const LEFT: Dir = { x: -1, y: 0 }
const RIGHT: Dir = { x: 1, y: 0 }
const NONE: Dir = { x: 0, y: 0 }

type GhostType = 'blinky' | 'pinky' | 'inky' | 'clyde'
interface Ghost {
  type: GhostType
  x: number
  y: number
  dir: Dir
  color: string
  frightened: boolean
  eaten: boolean
  moveTimer: number
  homeX: number
  homeY: number
}

type GameState = 'ready' | 'playing' | 'paused' | 'gameover' | 'levelclear'

function cloneMaze(): number[][] {
  return MAZE_TEMPLATE.map(row => [...row])
}

function countDots(maze: number[][]): number {
  let count = 0
  for (const row of maze) for (const c of row) if (c === 0 || c === 2) count++
  return count
}

function canMove(maze: number[][], x: number, y: number): boolean {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return false
  return maze[y][x] !== 1
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

function getTarget(ghost: Ghost, px: number, py: number, pd: Dir): { tx: number; ty: number } {
  switch (ghost.type) {
    case 'blinky': return { tx: px, ty: py }
    case 'pinky': return { tx: px + pd.x * 4, ty: py + pd.y * 4 }
    case 'inky': return { tx: ghost.homeX, ty: ghost.homeY }
    case 'clyde':
      return dist(ghost.x, ghost.y, px, py) > 8
        ? { tx: px, ty: py }
        : { tx: ghost.homeX, ty: ghost.homeY }
  }
}

function bestDir(ghost: Ghost, maze: number[][], tx: number, ty: number): Dir {
  const dirs: Dir[] = [UP, DOWN, LEFT, RIGHT]
  const opposite: Dir = { x: -ghost.dir.x, y: -ghost.dir.y }
  let best: Dir = ghost.dir
  let bestScore = Infinity
  for (const d of dirs) {
    if (d.x === opposite.x && d.y === opposite.y) continue
    const nx = ghost.x + d.x
    const ny = ghost.y + d.y
    if (!canMove(maze, nx, ny)) continue
    const score = dist(nx, ny, tx, ty)
    if (score < bestScore) { bestScore = score; best = d }
  }
  return best
}

function randomDir(ghost: Ghost, maze: number[][]): Dir {
  const dirs: Dir[] = [UP, DOWN, LEFT, RIGHT]
  const opposite: Dir = { x: -ghost.dir.x, y: -ghost.dir.y }
  const valid = dirs.filter(d => {
    if (d.x === opposite.x && d.y === opposite.y) return false
    return canMove(maze, ghost.x + d.x, ghost.y + d.y)
  })
  if (valid.length === 0) return { x: -ghost.dir.x, y: -ghost.dir.y }
  return valid[Math.floor(Math.random() * valid.length)]
}

function makeGhosts(): Ghost[] {
  return [
    { type: 'blinky', x: 10, y: 9, dir: LEFT, color: '#FF0000', frightened: false, eaten: false, moveTimer: 0, homeX: 19, homeY: 1 },
    { type: 'pinky',  x: 9,  y: 10, dir: UP,   color: '#FFB8FF', frightened: false, eaten: false, moveTimer: 0, homeX: 1,  homeY: 1 },
    { type: 'inky',   x: 10, y: 10, dir: DOWN,  color: '#00FFFF', frightened: false, eaten: false, moveTimer: 0, homeX: 1,  homeY: 19 },
    { type: 'clyde',  x: 11, y: 10, dir: RIGHT, color: '#FFB852', frightened: false, eaten: false, moveTimer: 0, homeX: 19, homeY: 19 },
  ]
}

export default function PacMan() {
  const t = useTranslations('pacMan')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>('ready')
  const mazeRef = useRef<number[][]>(cloneMaze())
  const pacRef = useRef({ x: 10, y: 16, dir: NONE, nextDir: NONE, mouthAngle: 0, mouthOpen: true })
  const ghostsRef = useRef<Ghost[]>(makeGhosts())
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const levelRef = useRef(1)
  const dotsRef = useRef(countDots(cloneMaze()))
  const frightenedTimerRef = useRef(0)
  const ghostComboRef = useRef(0)
  const pacMoveTimerRef = useRef(0)
  const readyTimerRef = useRef(0)
  const frameRef = useRef(0)
  const lastTimeRef = useRef(0)
  const [displayState, setDisplayState] = useState<GameState>('ready')
  const [displayScore, setDisplayScore] = useState(0)
  const [displayBest, setDisplayBest] = useState(0)
  const [displayLives, setDisplayLives] = useState(3)
  const [displayLevel, setDisplayLevel] = useState(1)

  const getBest = useCallback(() => {
    try { return parseInt(localStorage.getItem('pacman-best') || '0', 10) } catch { return 0 }
  }, [])
  const saveBest = useCallback((s: number) => {
    try { localStorage.setItem('pacman-best', String(s)) } catch {}
  }, [])

  const resetLevel = useCallback(() => {
    mazeRef.current = cloneMaze()
    dotsRef.current = countDots(mazeRef.current)
    pacRef.current = { x: 10, y: 16, dir: NONE, nextDir: NONE, mouthAngle: 0, mouthOpen: true }
    ghostsRef.current = makeGhosts()
    frightenedTimerRef.current = 0
    ghostComboRef.current = 0
    pacMoveTimerRef.current = 0
    readyTimerRef.current = 120
  }, [])

  const resetGame = useCallback(() => {
    scoreRef.current = 0
    livesRef.current = 3
    levelRef.current = 1
    resetLevel()
    stateRef.current = 'ready'
    setDisplayScore(0)
    setDisplayLives(3)
    setDisplayLevel(1)
    setDisplayBest(getBest())
    setDisplayState('ready')
  }, [resetLevel, getBest])

  const drawMaze = useCallback((ctx: CanvasRenderingContext2D) => {
    const maze = mazeRef.current
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    const pulse = Math.sin(Date.now() / 300) * 0.5 + 0.5

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = maze[row][col]
        const cx = col * CELL + CELL / 2
        const cy = row * CELL + CELL / 2

        if (cell === 1) {
          // Wall
          ctx.fillStyle = '#1a1aff'
          ctx.beginPath()
          const r = 3
          const x = col * CELL + 1
          const y = row * CELL + 1
          const w = CELL - 2
          const h = CELL - 2
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
          ctx.fill()
        } else if (cell === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)'
          ctx.beginPath()
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
          ctx.fill()
        } else if (cell === 2) {
          const r = 5 + pulse * 2
          ctx.fillStyle = `rgba(255,255,255,${0.7 + pulse * 0.3})`
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }, [])

  const drawPacman = useCallback((ctx: CanvasRenderingContext2D) => {
    const p = pacRef.current
    const cx = p.x * CELL + CELL / 2
    const cy = p.y * CELL + CELL / 2
    const radius = CELL / 2 - 2

    // Mouth animation
    const mouth = p.mouthAngle

    // Rotation based on direction
    let rotation = 0
    if (p.dir.x === 1) rotation = 0
    else if (p.dir.x === -1) rotation = Math.PI
    else if (p.dir.y === -1) rotation = -Math.PI / 2
    else if (p.dir.y === 1) rotation = Math.PI / 2

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)

    ctx.fillStyle = '#FFE000'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, radius, mouth, Math.PI * 2 - mouth)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }, [])

  const drawGhost = useCallback((ctx: CanvasRenderingContext2D, g: Ghost) => {
    const cx = g.x * CELL + CELL / 2
    const cy = g.y * CELL + CELL / 2
    const r = CELL / 2 - 2

    if (g.eaten) {
      // Draw eyes only for eaten ghosts
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(cx - 4, cy - 2, 4, 5, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 4, cy - 2, 4, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#00f'
      ctx.beginPath()
      ctx.arc(cx - 4 + g.dir.x * 2, cy - 2 + g.dir.y * 2, 2, 0, Math.PI * 2)
      ctx.arc(cx + 4 + g.dir.x * 2, cy - 2 + g.dir.y * 2, 2, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    const flash = frightenedTimerRef.current < 120 && Math.floor(Date.now() / 200) % 2 === 0
    const bodyColor = g.frightened ? (flash ? '#fff' : '#0000CC') : g.color

    ctx.fillStyle = bodyColor
    // Top dome
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, 0)
    // Wavy bottom
    const waveY = cy + r
    const segments = 3
    const segW = (r * 2) / segments
    ctx.lineTo(cx + r, waveY)
    for (let i = 0; i < segments; i++) {
      const x1 = cx + r - i * segW - segW / 2
      const x2 = cx + r - (i + 1) * segW
      ctx.quadraticCurveTo(x1, waveY + (i % 2 === 0 ? 4 : -4), x2, waveY)
    }
    ctx.closePath()
    ctx.fill()

    if (g.frightened) {
      // Frightened eyes: wavy mouth
      ctx.strokeStyle = flash ? '#00f' : '#fff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx - 5, cy + 2)
      for (let i = 0; i <= 4; i++) {
        ctx.lineTo(cx - 5 + i * 2.5, cy + 2 + (i % 2 === 0 ? -2 : 2))
      }
      ctx.stroke()
      ctx.fillStyle = flash ? '#00f' : '#fff'
      ctx.beginPath()
      ctx.arc(cx - 4, cy - 3, 2, 0, Math.PI * 2)
      ctx.arc(cx + 4, cy - 3, 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Normal eyes
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(cx - 4, cy - 2, 4, 5, -0.3, 0, Math.PI * 2)
      ctx.ellipse(cx + 4, cy - 2, 4, 5, 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#00f'
      ctx.beginPath()
      ctx.arc(cx - 4 + g.dir.x * 2, cy - 2 + g.dir.y * 2, 2.5, 0, Math.PI * 2)
      ctx.arc(cx + 4 + g.dir.x * 2, cy - 2 + g.dir.y * 2, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const drawHUD = useCallback((ctx: CanvasRenderingContext2D) => {
    // Overlay score/lives/level text at bottom
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, CANVAS_H - 24, CANVAS_W, 24)
    ctx.fillStyle = '#FFE000'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`SCORE:${scoreRef.current}`, 4, CANVAS_H - 8)
    ctx.textAlign = 'center'
    ctx.fillText(`LV:${levelRef.current}`, CANVAS_W / 2, CANVAS_H - 8)
    ctx.textAlign = 'right'
    // Draw pac icons for lives
    for (let i = 0; i < livesRef.current; i++) {
      const lx = CANVAS_W - 8 - i * 16
      ctx.fillStyle = '#FFE000'
      ctx.beginPath()
      ctx.moveTo(lx, CANVAS_H - 12)
      ctx.arc(lx, CANVAS_H - 12, 6, 0.3, Math.PI * 2 - 0.3)
      ctx.closePath()
      ctx.fill()
    }
  }, [])

  const drawOverlay = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.textAlign = 'center'

    if (state === 'ready') {
      ctx.fillStyle = '#FFE000'
      ctx.font = 'bold 22px monospace'
      ctx.fillText('PAC-MAN', CANVAS_W / 2, CANVAS_H / 2 - 40)
      ctx.fillStyle = '#fff'
      ctx.font = '13px monospace'
      ctx.fillText(t('start'), CANVAS_W / 2, CANVAS_H / 2)
      ctx.fillStyle = '#aaa'
      ctx.font = '11px monospace'
      ctx.fillText(t('controls'), CANVAS_W / 2, CANVAS_H / 2 + 20)
      const best = getBest()
      if (best > 0) {
        ctx.fillStyle = '#FFB8FF'
        ctx.fillText(`${t('best')}: ${best}`, CANVAS_W / 2, CANVAS_H / 2 + 40)
      }
    } else if (state === 'gameover') {
      ctx.fillStyle = '#FF4444'
      ctx.font = 'bold 20px monospace'
      ctx.fillText(t('gameOver'), CANVAS_W / 2, CANVAS_H / 2 - 30)
      ctx.fillStyle = '#FFE000'
      ctx.font = '14px monospace'
      ctx.fillText(`${t('score')}: ${scoreRef.current}`, CANVAS_W / 2, CANVAS_H / 2)
      ctx.fillStyle = '#FFB8FF'
      ctx.fillText(`${t('best')}: ${getBest()}`, CANVAS_W / 2, CANVAS_H / 2 + 22)
      ctx.fillStyle = '#fff'
      ctx.font = '12px monospace'
      ctx.fillText(t('retry'), CANVAS_W / 2, CANVAS_H / 2 + 48)
    } else if (state === 'levelclear') {
      ctx.fillStyle = '#00FF88'
      ctx.font = 'bold 18px monospace'
      ctx.fillText('LEVEL CLEAR!', CANVAS_W / 2, CANVAS_H / 2 - 10)
      ctx.fillStyle = '#FFE000'
      ctx.font = '13px monospace'
      ctx.fillText(`${t('score')}: ${scoreRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 16)
    } else if (state === 'paused') {
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 18px monospace'
      ctx.fillText(t('paused'), CANVAS_W / 2, CANVAS_H / 2 - 10)
      ctx.fillStyle = '#aaa'
      ctx.font = '12px monospace'
      ctx.fillText(t('resume'), CANVAS_W / 2, CANVAS_H / 2 + 14)
    }
  }, [t, getBest])

  const updatePacman = useCallback((dt: number) => {
    const p = pacRef.current
    const maze = mazeRef.current

    // Mouth animation
    if (p.mouthOpen) {
      p.mouthAngle += 0.15
      if (p.mouthAngle >= 0.45) p.mouthOpen = false
    } else {
      p.mouthAngle -= 0.15
      if (p.mouthAngle <= 0.02) p.mouthOpen = true
    }

    pacMoveTimerRef.current += dt
    const speed = Math.max(100, 160 - levelRef.current * 10)
    if (pacMoveTimerRef.current < speed) return
    pacMoveTimerRef.current = 0

    // Try next direction first
    if (p.nextDir.x !== 0 || p.nextDir.y !== 0) {
      const nx = p.x + p.nextDir.x
      const ny = p.y + p.nextDir.y
      const wrapX = (nx + COLS) % COLS
      if (canMove(maze, wrapX, ny)) {
        p.dir = p.nextDir
        p.nextDir = NONE
      }
    }

    if (p.dir.x === 0 && p.dir.y === 0) return

    const nx = (p.x + p.dir.x + COLS) % COLS
    const ny = p.y + p.dir.y
    if (canMove(maze, nx, ny)) {
      p.x = nx
      p.y = ny

      const cell = maze[p.y][p.x]
      if (cell === 0) {
        maze[p.y][p.x] = 3
        scoreRef.current += 10
        dotsRef.current--
      } else if (cell === 2) {
        maze[p.y][p.x] = 3
        scoreRef.current += 50
        dotsRef.current--
        frightenedTimerRef.current = 420 // ~7s at 60fps
        ghostComboRef.current = 0
        for (const g of ghostsRef.current) {
          if (!g.eaten) { g.frightened = true; g.dir = { x: -g.dir.x, y: -g.dir.y } }
        }
      }
    } else {
      p.dir = NONE
    }
  }, [])

  const updateGhosts = useCallback((dt: number) => {
    const p = pacRef.current
    const maze = mazeRef.current

    if (frightenedTimerRef.current > 0) {
      frightenedTimerRef.current -= dt / (1000 / 60)
      if (frightenedTimerRef.current <= 0) {
        frightenedTimerRef.current = 0
        for (const g of ghostsRef.current) {
          g.frightened = false
          g.eaten = false
        }
      }
    }

    const ghostSpeed = Math.max(120, 200 - levelRef.current * 10)
    for (const g of ghostsRef.current) {
      g.moveTimer += dt
      const spd = g.frightened ? ghostSpeed * 1.5 : g.eaten ? ghostSpeed * 0.5 : ghostSpeed
      if (g.moveTimer < spd) continue
      g.moveTimer = 0

      // Eaten ghost returns to home
      if (g.eaten) {
        if (g.x === Math.round(g.homeX) && g.y === Math.round(g.homeY)) {
          g.eaten = false
          g.frightened = false
        } else {
          const { tx, ty } = { tx: g.homeX, ty: g.homeY }
          g.dir = bestDir(g, maze, tx, ty)
        }
      } else if (g.frightened) {
        g.dir = randomDir(g, maze)
      } else {
        const { tx, ty } = getTarget(g, p.x, p.y, p.dir.x === 0 && p.dir.y === 0 ? RIGHT : p.dir)
        g.dir = bestDir(g, maze, tx, ty)
      }

      const nx = (g.x + g.dir.x + COLS) % COLS
      const ny = g.y + g.dir.y
      if (ny >= 0 && ny < ROWS && maze[ny][nx] !== 1) {
        g.x = nx
        g.y = ny
      }
    }
  }, [])

  const checkCollisions = useCallback(() => {
    const p = pacRef.current
    for (const g of ghostsRef.current) {
      if (g.eaten) continue
      if (g.x === p.x && g.y === p.y) {
        if (g.frightened) {
          g.eaten = true
          g.frightened = false
          ghostComboRef.current++
          const bonus = 200 * Math.pow(2, ghostComboRef.current - 1)
          scoreRef.current += bonus
        } else {
          // Pac-Man dies
          livesRef.current--
          setDisplayLives(livesRef.current)
          if (livesRef.current <= 0) {
            const best = getBest()
            if (scoreRef.current > best) saveBest(scoreRef.current)
            stateRef.current = 'gameover'
            setDisplayState('gameover')
            setDisplayScore(scoreRef.current)
            setDisplayBest(getBest())
          } else {
            // Reset positions
            pacRef.current = { x: 10, y: 16, dir: NONE, nextDir: NONE, mouthAngle: 0, mouthOpen: true }
            ghostsRef.current = makeGhosts()
            frightenedTimerRef.current = 0
            readyTimerRef.current = 90
            stateRef.current = 'ready'
            setDisplayState('ready')
          }
          return
        }
      }
    }
  }, [getBest, saveBest])

  const gameLoop = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dt = Math.min(time - lastTimeRef.current, 50)
    lastTimeRef.current = time

    const state = stateRef.current

    drawMaze(ctx)
    drawPacman(ctx)
    for (const g of ghostsRef.current) drawGhost(ctx, g)
    drawHUD(ctx)

    if (state === 'playing') {
      if (readyTimerRef.current > 0) {
        readyTimerRef.current--
        // Show "READY!" text
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(0, CANVAS_H / 2 - 18, CANVAS_W, 30)
        ctx.fillStyle = '#FFE000'
        ctx.font = 'bold 16px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('READY!', CANVAS_W / 2, CANVAS_H / 2 + 6)
      } else {
        updatePacman(dt)
        updateGhosts(dt)
        checkCollisions()
        setDisplayScore(scoreRef.current)

        if (dotsRef.current <= 0) {
          const best = getBest()
          if (scoreRef.current > best) saveBest(scoreRef.current)
          stateRef.current = 'levelclear'
          setDisplayState('levelclear')
          setDisplayScore(scoreRef.current)
          setDisplayBest(getBest())
          setTimeout(() => {
            levelRef.current++
            setDisplayLevel(levelRef.current)
            resetLevel()
            stateRef.current = 'playing'
            setDisplayState('playing')
          }, 2000)
        }
      }
    }

    if (state !== 'playing') {
      drawOverlay(ctx, state)
    }

    frameRef.current = requestAnimationFrame(gameLoop)
  }, [drawMaze, drawPacman, drawGhost, drawHUD, drawOverlay, updatePacman, updateGhosts, checkCollisions, getBest, saveBest, resetLevel])

  // Keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = stateRef.current
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)) {
        e.preventDefault()
      }

      if (state === 'ready' || state === 'gameover' || state === 'levelclear') {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)) {
          if (state === 'gameover') resetGame()
          else {
            stateRef.current = 'playing'
            setDisplayState('playing')
          }
          return
        }
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (state === 'playing') { stateRef.current = 'paused'; setDisplayState('paused') }
        else if (state === 'paused') { stateRef.current = 'playing'; setDisplayState('playing') }
        return
      }

      if (state !== 'playing') return
      const p = pacRef.current
      if (e.key === 'ArrowUp') p.nextDir = UP
      else if (e.key === 'ArrowDown') p.nextDir = DOWN
      else if (e.key === 'ArrowLeft') p.nextDir = LEFT
      else if (e.key === 'ArrowRight') p.nextDir = RIGHT
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resetGame])

  // Start game loop
  useEffect(() => {
    setDisplayBest(getBest())
    lastTimeRef.current = performance.now()
    frameRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [gameLoop, getBest])

  const handleCanvasClick = useCallback(() => {
    const state = stateRef.current
    if (state === 'gameover') { resetGame(); return }
    if (state === 'ready' || state === 'levelclear') { stateRef.current = 'playing'; setDisplayState('playing'); return }
    if (state === 'playing') { stateRef.current = 'paused'; setDisplayState('paused'); return }
    if (state === 'paused') { stateRef.current = 'playing'; setDisplayState('playing'); return }
  }, [resetGame])

  const handleDpad = useCallback((dir: Dir) => {
    const state = stateRef.current
    if (state === 'ready' || state === 'levelclear') { stateRef.current = 'playing'; setDisplayState('playing') }
    if (state === 'gameover') { resetGame(); return }
    if (state === 'paused') { stateRef.current = 'playing'; setDisplayState('playing') }
    pacRef.current.nextDir = dir
  }, [resetGame])

  const DpadBtn = ({ dir, label }: { dir: Dir; label: string }) => (
    <button
      onPointerDown={(e) => { e.preventDefault(); handleDpad(dir) }}
      className="w-12 h-12 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-lg text-white text-xl flex items-center justify-center select-none touch-none"
      aria-label={label}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Score bar */}
      <div className="flex items-center justify-between bg-black rounded-xl px-4 py-2 text-sm font-mono">
        <span className="text-yellow-300">{t('score')}: <span className="font-bold">{displayScore}</span></span>
        <span className="text-green-300">{t('level')}: <span className="font-bold">{displayLevel}</span></span>
        <span className="text-pink-300">{t('best')}: <span className="font-bold">{displayBest}</span></span>
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <svg key={i} width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M7 7 A5 5 0 1 1 7 6.9"
                stroke="none"
                fill={i < displayLives ? '#FFE000' : '#333'}
              />
            </svg>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <div className="bg-black rounded-xl overflow-hidden cursor-pointer" style={{ lineHeight: 0 }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={handleCanvasClick}
            style={{ display: 'block', maxWidth: '100%' }}
            aria-label="Pac-Man game"
          />
        </div>
      </div>

      {/* Mobile D-pad */}
      <div className="lg:hidden flex flex-col items-center gap-1 mt-2">
        <DpadBtn dir={UP} label="↑" />
        <div className="flex gap-1">
          <DpadBtn dir={LEFT} label="←" />
          <DpadBtn dir={DOWN} label="↓" />
          <DpadBtn dir={RIGHT} label="→" />
        </div>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleCanvasClick() }}
          className="mt-2 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm select-none touch-none"
        >
          {displayState === 'paused' ? t('resume') : t('paused')}
        </button>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('guide.title')}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('guide.rules.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.rules.items') as string[]).map((item: string, i: number) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">점수 시스템</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">•</span>일반 점(·): 10점</li>
              <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">•</span>파워 펠릿: 50점</li>
              <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">•</span>유령 먹기: 200 → 400 → 800 → 1600점</li>
              <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">•</span>P키 또는 Esc: 일시정지</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
