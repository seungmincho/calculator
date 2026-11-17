'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gameSounds'
import '@/lib/i18n/ns/tetris'
import {
  Trophy, RotateCcw, RotateCw, Pause, Play, ArrowLeft, ArrowRight, ArrowDown, ChevronsDown, Volume2, VolumeX,
} from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GameConfetti from '@/components/GameConfetti'
import ShareResult from '@/components/ShareResult'
import {
  COLS, ROWS, HIDDEN, LOCK_DELAY, newGame, step, move, rotate, hardDrop, holdPiece, softDropOne,
  cells, previewCells, dropDistance, onGround, type Game, type PieceType, type ClearInfo,
} from '@/utils/tetrisEngine'
import { createTetrisInputOwners, createTetrisActivationGate, tetrisKeyIntent, type TetrisInputAction as Action, type TetrisInputSource, type TetrisInputToken, type TetrisPointerActivation, type TetrisHeldSnapshot } from '@/utils/tetrisInput'
import { createTetrisGesture, type TetrisGestureToken, type TetrisGestureAction } from '@/utils/tetrisGesture'

// ── 게임 콘텐츠 색 (가이드라인 표준색) ───────────────────────────────────
const COLORS: Record<PieceType, string> = {
  I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#22c55e', Z: '#ef4444', J: '#3b82f6', L: '#f97316',
}
const BOARD_BG = '#111827'
const GRID_LINE = '#1f2937'
const VIS = ROWS - HIDDEN
const CELL = 32 // 캔버스 내부 해상도(px). CSS로 화면에 맞춰 축소/확대
const NEXT_SHOWN = 5
const DEFAULT_HANDLING = { das: 170, arr: 50 }

type Status = 'idle' | 'playing' | 'paused' | 'over'
interface Hud { score: number; lines: number; level: number; hold: PieceType | null; canHold: boolean; queue: PieceType[] }
interface Result {
  score: number; lines: number; level: number; pieces: number; tetrises: number; tspins: number
  maxCombo: number; ms: number; newBest: boolean
}
interface Saved { games: number; totalLines: number; bestLines: number }

const hudOf = (g: Game): Hud => ({
  score: g.score, lines: g.lines, level: g.level, hold: g.hold, canHold: g.canHold, queue: g.queue.slice(0, NEXT_SHOWN),
})
const fmtTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`

function MiniPiece({ type, dim }: { type: PieceType; dim?: boolean }) {
  const { cells: cs, w, h } = previewCells(type)
  return (
    <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${w}, 1fr)`, opacity: dim ? 0.35 : 1 }}>
      {Array.from({ length: w * h }, (_, i) => {
        const on = cs.some(([x, y]) => x === i % w && y === Math.floor(i / w))
        return <div key={i} className="w-2 h-2 sm:w-3 sm:h-3 rounded-[2px]" style={{ backgroundColor: on ? COLORS[type] : 'transparent' }} />
      })}
    </div>
  )
}

export default function Tetris() {
  const t = useTranslations('tetris')
  const tSounds = useTranslations('gameSounds')

  const [status, setStatus] = useState<Status>('idle')
  const [hud, setHud] = useState<Hud>({ score: 0, lines: 0, level: 1, hold: null, canHold: true, queue: [] })
  const [best, setBest] = useState(0)
  const [saved, setSaved] = useState<Saved>({ games: 0, totalLines: 0, bestLines: 0 })
  const [handling, setHandling] = useState(DEFAULT_HANDLING)
  const [popup, setPopup] = useState<{ id: number; main: string; sub: string; pts: number } | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [runRevision, setRunRevision] = useState(0)

  const gameRef = useRef<Game | null>(null)
  const statusRef = useRef<Status>('idle')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef(0)
  const playMsRef = useRef(0)
  const heldRef = useRef({ left: false, right: false, down: false })
  const dirRef = useRef<0 | 1 | -1>(0)
  const dasRef = useRef({ t: 0, arr: 0 })
  const handlingRef = useRef(DEFAULT_HANDLING)
  const bestRef = useRef(0)
  const savedRef = useRef(saved)
  const hudKeyRef = useRef('')
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(false), gameEpochRef = useRef(0), loopEpochRef = useRef(0), popupEpochRef = useRef(0)
  const inputRef = useRef(createTetrisInputOwners()), activationRef = useRef(createTetrisActivationGate()), gestureRef = useRef(createTetrisGesture(COLS, ROWS))
  const padPointers = useRef(new Map<number, { input: TetrisInputToken; activation: TetrisPointerActivation; element: HTMLButtonElement }>())
  const boardCapture = useRef<{ token: TetrisGestureToken; element: HTMLCanvasElement } | null>(null)

  const leaderboard = useLeaderboard('tetris', undefined)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const sounds = useGameSounds()
  const gameStartRef = useRef(0)
  const showNameModalRef = useRef(false)
  showNameModalRef.current = showNameModal

  const releaseCapture = useCallback((element: HTMLElement, pointerId: number) => {
    try { if (typeof element.hasPointerCapture !== 'function' || element.hasPointerCapture(pointerId)) element.releasePointerCapture?.(pointerId) } catch { /* The browser may have already released it. */ }
  }, [])
  const applyHeld = useCallback((snapshot: TetrisHeldSnapshot, resetDas = false) => {
    heldRef.current = { left: snapshot.left, right: snapshot.right, down: snapshot.down }; dirRef.current = snapshot.direction
    if (resetDas) dasRef.current = { t: 0, arr: 0 }
  }, [])
  const resetInput = useCallback((active: boolean, render = true) => {
    const snapshot = inputRef.current.reset(active)
    activationRef.current.reset(snapshot.epoch, active); gestureRef.current.reset(snapshot.epoch, active); applyHeld(snapshot, true)
    const oldPads = [...padPointers.current.values()], oldBoard = boardCapture.current
    padPointers.current.clear(); boardCapture.current = null
    for (const entry of oldPads) releaseCapture(entry.element, entry.activation.pointerId)
    if (oldBoard) releaseCapture(oldBoard.element, oldBoard.token.pointerId)
    if (render) setRunRevision(snapshot.epoch)
  }, [applyHeld, releaseCapture])
  const stopLoop = useCallback(() => {
    loopEpochRef.current++
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])
  const clearPopup = useCallback((render = true) => {
    popupEpochRef.current++
    if (popupTimerRef.current !== null) clearTimeout(popupTimerRef.current)
    popupTimerRef.current = null
    if (render) setPopup(null)
  }, [])
  useLayoutEffect(() => {
    mountedRef.current = true; resetInput(statusRef.current === 'playing')
    return () => { mountedRef.current = false; resetInput(false, false); stopLoop(); clearPopup(false) }
  }, [resetInput, stopLoop, clearPopup])

  // ── 저장값 로드 (마운트 후) ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const b = parseInt(localStorage.getItem('tetris-best-score') ?? '0', 10) || 0
      bestRef.current = b; setBest(b)
      const s = JSON.parse(localStorage.getItem('tetris-stats') ?? 'null')
      if (s && typeof s.games === 'number') { savedRef.current = s; setSaved(s) }
      const h = JSON.parse(localStorage.getItem('tetris-handling') ?? 'null')
      if (h && typeof h.das === 'number' && typeof h.arr === 'number') { handlingRef.current = h; setHandling(h) }
    } catch { /* 저장소 차단: 기본값 */ }
  }, [])

  const updateHandling = (h: typeof DEFAULT_HANDLING) => {
    handlingRef.current = h; setHandling(h)
    try { localStorage.setItem('tetris-handling', JSON.stringify(h)) } catch { /* noop */ }
  }

  // ── 그리기 ──────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const g = gameRef.current
    ctx.fillStyle = BOARD_BG
    ctx.fillRect(0, 0, COLS * CELL, VIS * CELL)
    ctx.strokeStyle = GRID_LINE
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 1; x < COLS; x++) { ctx.moveTo(x * CELL + 0.5, 0); ctx.lineTo(x * CELL + 0.5, VIS * CELL) }
    for (let y = 1; y < VIS; y++) { ctx.moveTo(0, y * CELL + 0.5); ctx.lineTo(COLS * CELL, y * CELL + 0.5) }
    ctx.stroke()
    if (!g) return
    const block = (x: number, y: number, color: string, alpha = 1) => {
      if (y < HIDDEN) return
      const px = x * CELL, py = (y - HIDDEN) * CELL
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.fillRect(px + 1, py + 1, CELL - 2, 4)
      ctx.globalAlpha = 1
    }
    g.board.forEach((row, y) => row.forEach((c, x) => { if (c) block(x, y, COLORS[c]) }))
    const p = g.piece
    if (!p) return
    const d = dropDistance(g.board, p)
    if (d > 0) {
      ctx.strokeStyle = COLORS[p.type]
      ctx.lineWidth = 2
      for (const [x, y] of cells(p.type, p.rot, p.x, p.y + d)) {
        if (y < HIDDEN) continue
        ctx.globalAlpha = 0.18
        ctx.fillStyle = COLORS[p.type]
        ctx.fillRect(x * CELL + 1, (y - HIDDEN) * CELL + 1, CELL - 2, CELL - 2)
        ctx.globalAlpha = 0.6
        ctx.strokeRect(x * CELL + 2, (y - HIDDEN) * CELL + 2, CELL - 4, CELL - 4)
      }
      ctx.globalAlpha = 1
    }
    // 바닥에 닿아 굳어가는 동안 살짝 흐려짐 → 락 딜레이가 눈에 보임
    const fade = onGround(g) ? 1 - 0.45 * Math.min(g.lockMs / LOCK_DELAY, 1) : 1
    for (const [x, y] of cells(p.type, p.rot, p.x, p.y)) block(x, y, COLORS[p.type], fade)
  }, [])

  // ── 한 판 종료 처리 ─────────────────────────────────────────────────────
  const finish = (g: Game) => {
    if (!mountedRef.current || gameRef.current !== g || statusRef.current !== 'playing') return
    statusRef.current = 'over'
    setStatus('over')
    resetInput(false); stopLoop(); clearPopup()
    const newBest = g.score > bestRef.current
    if (newBest) {
      bestRef.current = g.score; setBest(g.score)
      try { localStorage.setItem('tetris-best-score', String(g.score)) } catch { /* noop */ }
    }
    const s = savedRef.current
    const ns: Saved = { games: s.games + 1, totalLines: s.totalLines + g.lines, bestLines: Math.max(s.bestLines, g.lines) }
    savedRef.current = ns; setSaved(ns)
    try { localStorage.setItem('tetris-stats', JSON.stringify(ns)) } catch { /* noop */ }
    setResult({
      score: g.score, lines: g.lines, level: g.level, pieces: g.stats.pieces, tetrises: g.stats.tetrises,
      tspins: g.stats.tspins, maxCombo: g.stats.maxCombo, ms: playMsRef.current, newBest,
    })
    recordGameResult({ gameType: 'tetris', result: g.lines >= 10 ? 'win' : 'loss', difficulty: 'normal', moves: g.lines })
    if (leaderboard.checkQualifies(g.score)) setShowNameModal(true)
    leaderboard.fetchLeaderboard()
  }

  const showClear = (c: ClearInfo) => {
    const lineKey = ['', 'single', 'double', 'triple', 'tetris'][c.lines]
    const main = [
      c.b2b ? t('action.b2b') : '',
      c.tspin === 'full' ? t('action.tspin') : c.tspin === 'mini' ? t('action.tspinMini') : '',
      lineKey ? t(`action.${lineKey}`) : '',
    ].filter(Boolean).join(' ')
    const token = ++popupEpochRef.current, game = gameRef.current, epoch = gameEpochRef.current
    setPopup({ id: token, main, sub: c.combo > 0 ? t('action.combo', { n: c.combo }) : '', pts: c.points })
    if (popupTimerRef.current !== null) clearTimeout(popupTimerRef.current)
    popupTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || popupEpochRef.current !== token || gameRef.current !== game || gameEpochRef.current !== epoch) return
      popupTimerRef.current = null; setPopup(null)
    }, 1200)
  }

  // 엔진 이벤트 → 소리·HUD·팝업·그리기. 매 입력/프레임 후 호출
  const sync = () => {
    const g = gameRef.current
    if (!g) return
    const ev = g.events
    if (ev.length) {
      g.events = []
      if (ev.includes('gameover')) sounds.playLose()
      else if (ev.includes('tetris') || ev.includes('tspin') || ev.includes('levelup')) sounds.playWin()
      else if (ev.includes('clear')) sounds.playCapture()
      else if (ev.includes('lock')) sounds.playMove()
    }
    if (g.lastClear) { showClear(g.lastClear); g.lastClear = null }
    const h = hudOf(g)
    const key = JSON.stringify(h)
    if (key !== hudKeyRef.current) { hudKeyRef.current = key; setHud(h) }
    draw()
    if (g.over && statusRef.current === 'playing') finish(g)
  }
  const syncRef = useRef(sync)
  syncRef.current = sync

  // ── 입력 (키보드·버튼·제스처 공용) ─────────────────────────────────────
  const act = useCallback((a: Action) => {
    const g = gameRef.current
    if (!mountedRef.current || !g || statusRef.current !== 'playing') return
    switch (a) {
      case 'left': move(g, -1); break
      case 'right': move(g, 1); break
      case 'down': softDropOne(g); break
      case 'cw': rotate(g, 1); break
      case 'ccw': rotate(g, -1); break
      case 'hard': hardDrop(g); break
      case 'hold': holdPiece(g); break
    }
    syncRef.current()
  }, [])
  const press = useCallback((a: Action, source: TetrisInputSource, epoch: number) => {
    if (!mountedRef.current || statusRef.current !== 'playing') return null
    const accepted = inputRef.current.press(source, a, epoch)
    if (!accepted) return null
    applyHeld(accepted.snapshot, accepted.resetDas); act(a); return accepted.token
  }, [act, applyHeld])
  const release = useCallback((token: TetrisInputToken) => {
    const released = inputRef.current.release(token)
    if (released) applyHeld(released.snapshot, released.resetDas)
  }, [applyHeld])
  const pulse = useCallback((a: Action, epoch: number) => { if (inputRef.current.pulse(a, epoch)) act(a) }, [act])

  // ── 시작/일시정지 ───────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (!mountedRef.current) return
    stopLoop(); clearPopup(); gameEpochRef.current++
    gameRef.current = newGame()
    resetInput(true)
    playMsRef.current = 0
    gameStartRef.current = Date.now()
    setResult(null)
    setShowNameModal(false)
    statusRef.current = 'playing'
    setStatus('playing')
    syncRef.current()
    areaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [resetInput, stopLoop, clearPopup])

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return
    statusRef.current = 'paused'
    setStatus('paused')
    resetInput(false); stopLoop(); clearPopup()
  }, [resetInput, stopLoop, clearPopup])

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return
    statusRef.current = 'playing'
    resetInput(true)
    setStatus('playing')
  }, [resetInput])

  // ── 게임 루프 (플레이 중에만) ──────────────────────────────────────────
  useEffect(() => {
    const g = gameRef.current
    if (status !== 'playing' || !g || !mountedRef.current) return
    const loopOwner = loopEpochRef
    const loop = ++loopEpochRef.current, epoch = gameEpochRef.current
    const current = () => mountedRef.current && gameRef.current === g && gameEpochRef.current === epoch && loopEpochRef.current === loop && statusRef.current === 'playing' && inputRef.current.getSnapshot().epoch === runRevision
    lastTsRef.current = performance.now()
    const queue = () => { const reservation = requestAnimationFrame(ts => frame(ts, reservation)); rafRef.current = reservation }
    const frame = (ts: number, reservation: number) => {
      if (!current() || rafRef.current !== reservation) return
      rafRef.current = null
      const elapsed = ts - lastTsRef.current
      const dt = Number.isFinite(elapsed) && elapsed >= 0 ? Math.min(elapsed, 100) : 0
      if (Number.isFinite(ts) && ts >= lastTsRef.current) lastTsRef.current = ts
      playMsRef.current += dt
      // DAS/ARR: 누르는 순간 1칸, DAS 후 1칸, 이후 ARR 간격 (ARR 0 = 벽까지 즉시)
      const dir = dirRef.current
      if (dir) {
        const d = dasRef.current, { das, arr } = handlingRef.current
        const before = d.t
        d.t += dt
        if (d.t >= das) {
          if (arr === 0) { while (move(g, dir)) { /* 벽까지 */ } }
          else if (before < das) { move(g, dir); d.arr = 0 }
          else { d.arr += dt; while (d.arr >= arr) { d.arr -= arr; if (!move(g, dir)) { d.arr = 0; break } } }
        }
      }
      step(g, dt, heldRef.current.down)
      syncRef.current()
      if (current()) queue()
    }
    if (current()) queue()
    return () => { if (loopOwner.current === loop) stopLoop() }
  }, [status, runRevision, stopLoop])

  // 일시정지/종료 화면도 한 번 그려 둠
  useEffect(() => { draw() }, [status, draw])

  // 탭 전환·창 포커스 잃으면 자동 일시정지
  useEffect(() => {
    const onHide = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [pause])

  // ── 키보드 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const epoch = inputRef.current.getSnapshot().epoch
    const down = (e: KeyboardEvent) => {
      if (!mountedRef.current || inputRef.current.getSnapshot().epoch !== epoch) return
      const intent = tetrisKeyIntent(e, statusRef.current, showNameModalRef.current)
      if (!intent) return
      e.preventDefault()
      if (intent.kind === 'action') press(intent.action, intent.source, epoch)
      else if (intent.kind === 'pause') pause()
      else if (intent.kind === 'resume') resume()
      else if (intent.kind === 'start') start()
    }
    const up = (e: KeyboardEvent) => { if (inputRef.current.getSnapshot().epoch !== epoch) return; const token = inputRef.current.getToken({ kind: 'key', code: e.code }); if (token) release(token) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [press, release, pause, resume, start, runRevision])
  // ── 보드 제스처: 탭=회전, 좌우 드래그=칸 단위 이동, 아래 드래그=소프트, 아래로 튕기기=하드, 위로 튕기기=홀드 ─
  const gesturePoint = (e: React.PointerEvent<HTMLCanvasElement>) => ({ pointerId: e.pointerId, target: 'board', x: e.clientX, y: e.clientY, at: e.timeStamp, width: e.currentTarget.getBoundingClientRect().width })
  const applyGesture = (plan: readonly TetrisGestureAction[]) => {
    const g = gameRef.current
    if (!g || !mountedRef.current || statusRef.current !== 'playing' || inputRef.current.getSnapshot().epoch !== runRevision || !plan.length) return
    for (const action of plan) {
      if (action.type === 'move') for (let i = 0; i < action.count; i++) move(g, action.direction)
      else if (action.type === 'soft') for (let i = 0; i < action.count; i++) softDropOne(g)
      else if (action.type === 'rotate') rotate(g, 1)
      else if (action.type === 'hard') hardDrop(g)
      else if (action.type === 'hold') holdPiece(g)
    }
    syncRef.current()
  }
  const releaseBoard = (token: TetrisGestureToken) => {
    const captured = boardCapture.current
    if (captured?.token !== token) return
    boardCapture.current = null; releaseCapture(captured.element, token.pointerId)
  }
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mountedRef.current || statusRef.current !== 'playing') return
    const token = gestureRef.current.begin(gesturePoint(e), runRevision)
    if (!token) return
    boardCapture.current = { token, element: e.currentTarget }
    try { if (typeof e.currentTarget.setPointerCapture !== 'function') throw new Error('capture'); e.currentTarget.setPointerCapture(e.pointerId) }
    catch { gestureRef.current.cancel(token); releaseBoard(token) }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const token = gestureRef.current.getToken()
    if (!token || token.epoch !== runRevision) return
    applyGesture(gestureRef.current.move(token, gesturePoint(e)))
    if (gestureRef.current.getToken() !== token) releaseBoard(token)
  }
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const token = gestureRef.current.getToken()
    if (!token || token.epoch !== runRevision || token.pointerId !== e.pointerId) return
    const plan = gestureRef.current.end(token, gesturePoint(e)); releaseBoard(token); applyGesture(plan)
  }
  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const token = gestureRef.current.getToken()
    if (token?.epoch === runRevision && gestureRef.current.cancel(token, e.pointerId, 'board')) releaseBoard(token)
  }

  // 화면 버튼: 꾹 누르면 DAS/ARR·소프트 드롭 연속
  const endPadPointer = (a: Action, e: React.PointerEvent<HTMLButtonElement>) => {
    const entry = padPointers.current.get(e.pointerId)
    if (!entry || entry.activation.epoch !== runRevision || entry.activation.target !== a || entry.element !== e.currentTarget || e.timeStamp < entry.activation.at) return
    padPointers.current.delete(e.pointerId); activationRef.current.pointerEnd(entry.activation, e.timeStamp); release(entry.input); releaseCapture(entry.element, e.pointerId)
  }
  const pad = (a: Action) => ({
    'data-tetris-pad': a,
    disabled: status !== 'playing',
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!mountedRef.current || statusRef.current !== 'playing') return
      const activation = activationRef.current.pointerDown(e.pointerId, a, e.timeStamp, runRevision)
      if (!activation) return
      e.preventDefault()
      const accepted = inputRef.current.press({ kind: 'pointer', pointerId: e.pointerId, target: a }, a, runRevision)
      if (!accepted) { activationRef.current.pointerEnd(activation, e.timeStamp); return }
      applyHeld(accepted.snapshot, accepted.resetDas)
      const entry = { input: accepted.token, activation, element: e.currentTarget }; padPointers.current.set(e.pointerId, entry)
      try { if (typeof e.currentTarget.setPointerCapture !== 'function') throw new Error('capture'); e.currentTarget.setPointerCapture(e.pointerId) }
      catch { padPointers.current.delete(e.pointerId); activationRef.current.pointerEnd(activation, e.timeStamp); release(accepted.token) }
      act(a)
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => endPadPointer(a, e),
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => endPadPointer(a, e),
    onLostPointerCapture: (e: React.PointerEvent<HTMLButtonElement>) => endPadPointer(a, e),
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      const native = e.nativeEvent as MouseEvent & { pointerId?: number; pointerType?: string }
      if (activationRef.current.click({ epoch: runRevision, target: a, at: e.timeStamp, pointerId: native.pointerId, pointerType: native.pointerType, detail: e.detail, defaultPrevented: e.defaultPrevented }) === 'activate') pulse(a, runRevision)
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.defaultPrevented) return
      if (e.nativeEvent.isComposing || e.keyCode === 229) { e.preventDefault(); return }
      if (!activationRef.current.keyDown(e.code, a, runRevision, e.repeat)) e.preventDefault()
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLButtonElement>) => { if (!activationRef.current.keyUp(e.code, a, runRevision)) e.preventDefault() },
    onBlur: () => activationRef.current.cancelKeys(a),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { touchAction: 'manipulation' as const },
  })

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    await leaderboard.submitScore(hud.score, name, Date.now() - gameStartRef.current)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, hud.score])

  const pps = result && result.ms > 0 ? (result.pieces / (result.ms / 1000)).toFixed(2) : '0'
  const padBtn = 'ui-btn-soft h-14 rounded-xl flex items-center justify-center select-none text-sm font-medium disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  return (
    <div className="space-y-6" data-tetris-status={status} data-tetris-run={runRevision}>
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <button
          type="button"
          onClick={() => sounds.setEnabled(!sounds.enabled)}
          title={sounds.enabled ? tSounds('disabled') : tSounds('enabled')}
          aria-label={sounds.enabled ? tSounds('disabled') : tSounds('enabled')}
          className="ui-btn-soft min-h-11 min-w-11 p-2.5 rounded-xl shrink-0"
        >
          {sounds.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* 플레이 영역 */}
      <div ref={areaRef} className="space-y-3">
        {/* 점수 줄 */}
        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          {[
            { label: t('score'), value: hud.score.toLocaleString() },
            { label: t('level'), value: hud.level },
            { label: t('lines'), value: hud.lines },
            { label: t('bestScore'), value: best.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="ui-card px-2 py-2 text-center">
              <p className="text-xs text-muted truncate">{label}</p>
              <p className="text-sm sm:text-base font-bold text-fg tabular-nums truncate">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center items-start gap-2 sm:gap-4">
          {/* 홀드 */}
          <div className="w-14 sm:w-24 shrink-0">
            <div className="ui-card p-1.5 sm:p-3">
              <p className="text-xs font-semibold text-muted mb-1.5 text-center">{t('hold')}</p>
              <div className="h-10 sm:h-14 flex items-center justify-center bg-subtle rounded-lg">
                {hud.hold && <MiniPiece type={hud.hold} dim={!hud.canHold} />}
              </div>
            </div>
          </div>

          {/* 보드 */}
          <div className="relative flex-1 min-w-0" style={{ maxWidth: 'min(320px, 42vh)' }}>
            <canvas
              data-tetris-board=""
              ref={canvasRef}
              width={COLS * CELL}
              height={VIS * CELL}
              className="block w-full h-auto rounded-xl select-none"
              style={{ touchAction: 'none', backgroundColor: BOARD_BG }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={onPointerCancel}
              onContextMenu={e => e.preventDefault()}
              aria-label={t('title')}
            />

            {popup && (
              <div key={popup.id} data-tetris-popup={popup.id} className="pointer-events-none absolute inset-x-0 top-1/4 text-center text-white">
                {popup.main && <p className="text-lg sm:text-2xl font-extrabold tracking-wide drop-shadow">{popup.main}</p>}
                {popup.sub && <p className="text-sm sm:text-base font-bold text-yellow-300">{popup.sub}</p>}
                {popup.pts > 0 && <p className="text-sm font-semibold tabular-nums">+{popup.pts.toLocaleString()}</p>}
              </div>
            )}

            {status === 'idle' && (
              <div className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center gap-4 p-4 text-center">
                <p className="text-white text-2xl font-bold">TETRIS</p>
                <button type="button" data-tetris-start="" onClick={start} className="ui-btn min-h-11 px-6 py-3">{t('newGame')}</button>
                <p className="text-xs text-gray-300 hidden lg:block">{t('idleHintKeys')}</p>
                <p className="text-xs text-gray-300 lg:hidden">{t('idleHintTouch')}</p>
              </div>
            )}
            {status === 'paused' && (
              <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-4" style={{ backgroundColor: BOARD_BG }}>
                <p className="text-white text-2xl font-bold">{t('paused')}</p>
                <button type="button" data-tetris-resume="" onClick={resume} className="ui-btn min-h-11 px-6 py-3"><Play className="w-4 h-4" />{t('resume')}</button>
              </div>
            )}
            {status === 'over' && result && (
              <div className="absolute inset-0 bg-black/75 rounded-xl flex flex-col items-center justify-center gap-3 p-4 text-center">
                <p className="text-red-400 text-2xl font-bold">{t('gameOver')}</p>
                <p className="text-white text-3xl font-bold tabular-nums">{result.score.toLocaleString()}</p>
                {result.newBest && (
                  <p className="flex items-center gap-1 text-yellow-300 text-sm font-semibold"><Trophy className="w-4 h-4" />{t('newRecord')}</p>
                )}
                <button type="button" data-tetris-start="" onClick={start} className="ui-btn min-h-11 px-6 py-3"><RotateCcw className="w-4 h-4" />{t('playAgain')}</button>
              </div>
            )}
          </div>

          {/* 넥스트 */}
          <div className="w-14 sm:w-24 shrink-0">
            <div className="ui-card p-1.5 sm:p-3">
              <p className="text-xs font-semibold text-muted mb-1.5 text-center">{t('next')}</p>
              <div className="space-y-1.5">
                {Array.from({ length: NEXT_SHOWN }, (_, i) => (
                  <div key={i} className={`flex items-center justify-center bg-subtle rounded-lg ${i === 0 ? 'h-10 sm:h-14' : 'h-8 sm:h-11'}`}>
                    {status !== 'idle' && hud.queue[i] && <MiniPiece type={hud.queue[i]} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 터치 버튼 (모바일·태블릿) */}
        <div className="lg:hidden max-w-md mx-auto grid grid-cols-4 gap-2">
          <button type="button" className={padBtn} aria-label={t('hold')} {...pad('hold')}>{t('hold')}</button>
          <button type="button" className={padBtn} aria-label={t('controls.rotateCcw')} {...pad('ccw')}><RotateCcw className="w-6 h-6" /></button>
          <button type="button" className={padBtn} aria-label={t('controls.rotateCw')} {...pad('cw')}><RotateCw className="w-6 h-6" /></button>
          <button type="button" className={padBtn} aria-label={t('controls.hardDrop')} {...pad('hard')}><ChevronsDown className="w-6 h-6" /></button>
          <button type="button" className={`${padBtn} col-span-1`} aria-label={t('controls.left')} {...pad('left')}><ArrowLeft className="w-6 h-6" /></button>
          <button type="button" className={`${padBtn} col-span-2`} aria-label={t('controls.softDrop')} {...pad('down')}><ArrowDown className="w-6 h-6" /></button>
          <button type="button" className={padBtn} aria-label={t('controls.right')} {...pad('right')}><ArrowRight className="w-6 h-6" /></button>
        </div>
        <p className="lg:hidden mx-auto max-w-md text-xs text-muted">{t('input.padHint')}</p>

        {/* 일시정지/새 게임 */}
        <div className="flex justify-center gap-2">
          {status === 'playing' && (
            <button type="button" data-tetris-pause="" onClick={pause} className="ui-btn-soft min-h-11 px-4 py-2 text-sm"><Pause className="w-4 h-4" />{t('pause')}</button>
          )}
          {status === 'paused' && (
            <button type="button" data-tetris-resume="" onClick={resume} className="ui-btn-soft min-h-11 px-4 py-2 text-sm"><Play className="w-4 h-4" />{t('resume')}</button>
          )}
          {status !== 'idle' && (
            <button type="button" data-tetris-start="" onClick={start} className="ui-btn-soft min-h-11 px-4 py-2 text-sm"><RotateCcw className="w-4 h-4" />{t('newGame')}</button>
          )}
        </div>
      </div>

      {/* 결과 */}
      {status === 'over' && result && (
        <div className="ui-card p-6 space-y-4 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold text-fg">{t('result.title')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              [t('lines'), result.lines],
              [t('level'), result.level],
              [t('result.time'), fmtTime(result.ms)],
              [t('result.pps'), pps],
              [t('result.tetrises'), result.tetrises],
              [t('result.tspins'), result.tspins],
              [t('result.maxCombo'), result.maxCombo],
              [t('result.pieces'), result.pieces],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-subtle rounded-xl p-3 text-center">
                <p className="text-xs text-muted">{label}</p>
                <p className="text-lg font-bold text-fg tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted">{t('result.career', { games: saved.games, lines: saved.totalLines.toLocaleString(), bestLines: saved.bestLines })}</p>
          <ShareResult
            card={{
              tool: t('title'),
              label: t('share.label'),
              headline: result.score.toLocaleString(),
              sub: t('share.sub', { lines: result.lines, level: result.level }),
              rows: [
                { label: t('result.tetrises'), value: String(result.tetrises) },
                { label: t('result.maxCombo'), value: String(result.maxCombo) },
                { label: t('result.pps'), value: pps },
                { label: t('bestScore'), value: best.toLocaleString() },
              ],
              cta: t('share.cta'),
            }}
            url={`${window.location.origin}${window.location.pathname}`}
            text={t('share.text', { score: result.score.toLocaleString() })}
            fileName="tetris"
          />
        </div>
      )}

      {/* 조작 감도 */}
      <details className="ui-card p-4 max-w-xl mx-auto">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-body">{t('settings.title')}</summary>
        <div className="mt-4 space-y-4">
          {(['das', 'arr'] as const).map(k => (
            <label key={k} className="block">
              <span className="flex justify-between text-sm text-body">
                <span>{t(`settings.${k}`)}</span>
                <span className="tabular-nums text-fg font-medium">{handling[k]}ms</span>
              </span>
              <input
                type="range"
                data-tetris-handling={k}
                min={k === 'das' ? 50 : 0}
                max={k === 'das' ? 300 : 100}
                step={k === 'das' ? 10 : 5}
                value={handling[k]}
                onChange={e => updateHandling({ ...handling, [k]: Number(e.target.value) })}
                className="w-full mt-2 accent-primary"
              />
            </label>
          ))}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('settings.hint')}</p>
            <button type="button" onClick={() => updateHandling(DEFAULT_HANDLING)} className="ui-btn-soft min-h-11 px-3 py-1.5 text-xs shrink-0">{t('settings.reset')}</button>
          </div>
        </div>
      </details>

      <LeaderboardPanel leaderboard={leaderboard} />
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={hud.score}
        formatScore={leaderboard.config.formatScore}
        defaultName={leaderboard.savedPlayerName}
      />

      {/* 조작 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-4">{t('guide.title')}</h2>
        <p className="mb-4 text-sm text-sub">{t('input.focusHint')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['keyboard', 'touch'] as const).map(sec => (
            <div key={sec}>
              <h3 className="text-sm font-semibold text-body mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-1 text-sm text-sub list-disc list-inside">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-line">
          <h3 className="text-sm font-semibold text-body mb-3">{t('guide.scoring.title')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(t.raw('guide.scoring.items') as string[]).map((item, i) => (
              <div key={i} className="bg-subtle rounded-lg p-2 text-center text-sm text-body">{item}</div>
            ))}
          </div>
        </div>
      </div>

      <GameAchievements achievements={achievements} unlockedCount={unlockedCount} totalCount={totalCount} />
      <AchievementToast achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null} onDismiss={dismissNewAchievements} />
      <GameConfetti active={status === 'over' && !!result?.newBest} />
    </div>
  )
}
