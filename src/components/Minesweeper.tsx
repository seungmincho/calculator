'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gameSounds'
import '@/lib/i18n/ns/minesweeper'
import { Flag, Volume2, VolumeX, Copy, Check } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GameConfetti from '@/components/GameConfetti'
import ShareResult from '@/components/ShareResult'
import {
  PRESETS, type Preset, type Layout, type Mark, mulberry32, clampConfig, generate, generateNoGuess,
  openCell, chord, isWon, bbbv, dayNumber, msToNextDay, dailyBoard, DAILY_PRESET, dailyStats, fmtTime,
  type DailyRecords,
} from '@/utils/minesweeper'
import {
  captureClassicReplaySource, createClassicPractice, canPracticeClassic, shouldRecordMinesweeperResult,
  createMinesweeperScoreEligibility, canSubmitMinesweeperScore, isCurrentMinesweeperInput,
  type ClassicReplaySource, type MinesweeperScoreEligibility,
} from '@/utils/minesweeperReplay'

type Mode = 'classic' | 'daily'
type Diff = Preset | 'custom'
type Status = 'ready' | 'playing' | 'won' | 'lost'

interface Game {
  w: number; h: number; mines: number
  layout: Layout | null
  open: boolean[]; marks: Mark[]
  status: Status; boom: number
  start: number; end: number; clicks: number
  noGuessFailed: boolean
  generation: number; practice: boolean; first: number | null; replaySource: ClassicReplaySource | null
}

const PREFS = 'toolhub-minesweeper-prefs'
const BEST = 'toolhub-minesweeper-best'
const DAILY = 'toolhub-minesweeper-daily'
const LONG_PRESS = 350

const load = <T,>(key: string, fallback: T): T => {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') } } catch { return fallback }
}
const save = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 저장 불가 */ } }

const fresh = (w: number, h: number, mines: number): Game => ({
  w, h, mines, layout: null,
  open: new Array(w * h).fill(false), marks: new Array(w * h).fill(0),
  status: 'ready', boom: -1, start: 0, end: 0, clicks: 0, noGuessFailed: false,
  generation: 0, practice: false, first: null, replaySource: null,
})

const NUMBER_COLORS = [
  '', 'text-blue-600 dark:text-blue-400', 'text-green-600 dark:text-green-400', 'text-red-600 dark:text-red-400',
  'text-purple-600 dark:text-purple-400', 'text-yellow-700 dark:text-yellow-500', 'text-teal-600 dark:text-teal-400',
  'text-fg', 'text-sub',
]
const defaultCell = (w: number) => (w <= 9 ? 36 : w <= 16 ? 30 : 26)

/** 1초에 여러 번 갱신되는 시계는 따로 렌더 (보드 480칸 재렌더 방지) */
function Clock({ start, end, running }: { start: number; end: number; running: boolean }) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 47)
    return () => clearInterval(id)
  }, [running])
  const ms = start ? Math.max(0, (running ? now : end) - start) : 0
  return <>{fmtTime(ms)}</>
}

export default function Minesweeper() {
  const t = useTranslations('minesweeper')
  const tSound = useTranslations('gameSounds')
  const params = useSearchParams()

  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<Mode>('classic')
  const [diff, setDiff] = useState<Diff>('beginner')
  const [custom, setCustom] = useState({ w: 20, h: 12, mines: 40 })
  const [customDraft, setCustomDraft] = useState({ w: '20', h: '12', mines: '40' })
  const [noGuess, setNoGuess] = useState(false)
  const [qmarks, setQmarks] = useState(false)
  const [flagMode, setFlagMode] = useState(false)
  const [game, setGame] = useState<Game>(() => fresh(9, 9, 10))
  const [cell, setCell] = useState(36)
  const [cursor, setCursor] = useState(0)
  const [focused, setFocused] = useState(false)
  const [best, setBest] = useState<Record<string, number>>({})
  const [newBest, setNewBest] = useState(false)
  const [daily, setDaily] = useState<DailyRecords>({})
  const [today, setToday] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [scoreCandidate, setScoreCandidate] = useState<MinesweeperScoreEligibility | null>(null)
  const [replayError, setReplayError] = useState(false)
  const gameRef = useRef(game)
  const generation = useRef(0)
  const eligibility = useRef<MinesweeperScoreEligibility | null>(null)
  const submission = useRef(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const pressRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean; x: number; y: number; type: string; suppress: boolean; generation: number; pointerId: number | null }>(
    { timer: null, fired: false, x: 0, y: 0, type: 'mouse', suppress: false, generation: -1, pointerId: null },
  )
  const clearPress = useCallback(() => { const p = pressRef.current; if (p.timer !== null) clearTimeout(p.timer); p.timer = null }, [])
  const invalidateInput = useCallback(() => {
    clearPress(); generation.current++; submission.current++; eligibility.current = null
    const p = pressRef.current
    p.generation = -1; p.pointerId = null; p.fired = false; p.suppress = false
    setShowNameModal(false); setScoreCandidate(null)
  }, [clearPress])
  const installGame = useCallback((next: Game) => { gameRef.current = next; setGame(next) }, [])
  const replaceGame = useCallback((next: Game) => {
    invalidateInput(); setCelebrate(false); setNewBest(false); setReplayError(false)
    installGame({ ...next, generation: generation.current })
  }, [installGame, invalidateInput])
  useEffect(() => () => {
    clearPress(); generation.current++; submission.current++; eligibility.current = null
  }, [clearPress])

  const leaderboard = useLeaderboard('minesweeper', diff === 'custom' ? 'beginner' : diff)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const sounds = useGameSounds()

  const dims = diff === 'custom' ? custom : PRESETS[diff]
  const diffLabel = (d: Diff) => t(d === 'custom' ? 'custom' : d)

  const fitCell = useCallback((w: number) => {
    const avail = (wrapRef.current?.clientWidth ?? 1000) - 4
    setCell(Math.max(22, Math.min(defaultCell(w), Math.floor(avail / w))))
  }, [])

  const newDaily = useCallback((day: number, records: DailyRecords) => {
    const { w, h, mines } = PRESETS[DAILY_PRESET]
    const d = dailyBoard(day)
    const g = fresh(w, h, mines)
    g.layout = d.board
    g.first = d.start
    openCell(d.board, g.open, g.marks, d.start)
    const rec = records[day]
    if (rec) { // 오늘 이미 끝남: 판 전체 공개
      g.status = rec.won ? 'won' : 'lost'
      g.start = 1; g.end = 1 + rec.ms
      d.board.mine.forEach((m, i) => { if (m) g.marks[i] = rec.won ? 1 : 0; else g.open[i] = true })
    }
    replaceGame(g)
    setCursor(d.start)
    fitCell(w)
  }, [fitCell, replaceGame])

  const newGame = useCallback(() => {
    if (mode === 'daily') { newDaily(today, daily); return }
    replaceGame(fresh(dims.w, dims.h, dims.mines))
    setCursor(Math.floor(dims.h / 2) * dims.w + Math.floor(dims.w / 2))
  }, [mode, today, daily, dims.w, dims.h, dims.mines, newDaily, replaceGame])

  // 마운트: 설정·기록 복원 (SSR은 초급 빈 판)
  useEffect(() => {
    const p = load(PREFS, { diff: 'beginner' as Diff, custom: { w: 20, h: 12, mines: 40 }, noGuess: false, qmarks: false })
    setDiff(p.diff in PRESETS || p.diff === 'custom' ? p.diff : 'beginner')
    setCustom(clampConfig(p.custom.w, p.custom.h, p.custom.mines))
    setCustomDraft({ w: String(p.custom.w), h: String(p.custom.h), mines: String(p.custom.mines) })
    setNoGuess(!!p.noGuess); setQmarks(!!p.qmarks)
    setBest(load(BEST, {}))
    setDaily(load(DAILY, {}))
    setToday(dayNumber(Date.now()))
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && params.get('mode') === 'daily') setMode('daily')
  }, [mounted, params])

  useEffect(() => {
    if (mounted) save(PREFS, { diff, custom, noGuess, qmarks })
  }, [mounted, diff, custom, noGuess, qmarks])

  // 난이도·모드 변경 → 새 판
  useEffect(() => {
    if (!mounted) return
    newGame()
    if (mode === 'classic') fitCell(dims.w)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, mode, diff, custom, today])

  const switchMode = (m: Mode) => {
    if (m === mode && gameRef.current.practice) newGame()
    else if (m !== mode) invalidateInput()
    setMode(m)
    const url = new URL(window.location.href)
    if (m === 'daily') url.searchParams.set('mode', 'daily'); else url.searchParams.delete('mode')
    window.history.replaceState(window.history.state, '', url)
  }
  const selectDifficulty = (next: Diff) => {
    if (next === diff && gameRef.current.practice) newGame()
    else if (next !== diff) invalidateInput()
    setDiff(next)
  }
  const replayClassic = () => {
    const current = gameRef.current
    if (!isCurrentMinesweeperInput(game.generation, generation.current) || !canPracticeClassic(mode, current.status, current.replaySource)) return
    try {
      const practice = createClassicPractice(current.replaySource!)
      replaceGame({ ...practice, generation: current.generation })
      setCursor(practice.first)
      if (practice.status === 'won') { sounds.playWin(); setCelebrate(!reduced) }
    } catch { setReplayError(true) }
  }

  const finish = (g: Game, won: boolean) => {
    const ms = g.end - g.start
    const sec = Math.max(1, Math.ceil(ms / 1000))
    const d = mode === 'daily' ? 'daily' : diff
    if (won) {
      sounds.playWin()
      setCelebrate(!reduced)
    } else sounds.playLose()
    if (!shouldRecordMinesweeperResult({ ...g, mode, difficulty: diff })) return
    recordGameResult({ gameType: 'minesweeper', result: won ? 'win' : 'loss', difficulty: d, moves: sec })

    if (mode === 'daily') {
      const layout = g.layout!
      const safe = layout.mine.filter(m => !m).length
      const opened = g.open.filter((o, i) => o && !layout.mine[i]).length
      const next = { ...daily, [today]: { won, ms, progress: opened / safe } }
      setDaily(next); save(DAILY, next)
      return
    }
    if (!won || diff === 'custom') return
    if (!best[diff] || ms < best[diff]) {
      const next = { ...best, [diff]: ms }
      setBest(next); save(BEST, next); setNewBest(true)
    }
    if (leaderboard.checkQualifies(sec)) {
      const candidate = createMinesweeperScoreEligibility({ ...g, mode, difficulty: diff })
      eligibility.current = candidate; setScoreCandidate(candidate); setShowNameModal(!!candidate)
    }
    leaderboard.fetchLeaderboard()
  }

  const act = (i: number, kind: 'open' | 'flag' | 'chord', expected = game.generation) => {
    const g = gameRef.current
    if (!isCurrentMinesweeperInput(expected, generation.current) || g.generation !== expected || !Number.isInteger(i) || i < 0 || i >= g.w * g.h) return
    if (g.status === 'won' || g.status === 'lost') return
    let layout = g.layout
    let noGuessFailed = g.noGuessFailed
    let replaySource = g.replaySource, first = g.first
    if (!layout) {
      if (kind !== 'open') return // 판이 생기기 전 깃발·chord는 무시
      const rnd = mulberry32((Math.random() * 2 ** 32) >>> 0)
      if (noGuess) {
        const r = generateNoGuess(g.w, g.h, g.mines, i, rnd)
        layout = r.board; noGuessFailed = !r.ok
      } else layout = generate(g.w, g.h, g.mines, i, rnd)
      first = i
      if (mode === 'classic' && !g.practice) {
        try { replaySource = captureClassicReplaySource(layout, i, diff, noGuessFailed) }
        catch { setReplayError(true) }
      }
    }
    const open = g.open.slice(), marks = g.marks.slice()
    let opened = 0, boom = -1, changed = false

    if (open[i]) {
      const r = chord(layout, open, marks, i)
      opened = r.opened.length; boom = r.boom; changed = opened > 0
    } else if (kind === 'flag') {
      marks[i] = marks[i] === 0 ? 1 : marks[i] === 1 && qmarks ? 2 : 0
      changed = true
    } else if (kind === 'open') {
      const r = openCell(layout, open, marks, i)
      opened = r.opened.length; boom = r.boom; changed = opened > 0
    }
    if (!changed) { if (kind !== 'flag') sounds.playInvalid(); return }

    const now = Date.now()
    const next: Game = {
      ...g, layout, open, marks, noGuessFailed, replaySource, first,
      status: g.status === 'ready' ? 'playing' : g.status,
      start: g.status === 'ready' ? now : g.start,
      clicks: g.clicks + 1,
    }
    if (boom >= 0) {
      next.status = 'lost'; next.boom = boom; next.end = now
    } else if (isWon(layout, open)) {
      layout.mine.forEach((m, k) => { if (m) marks[k] = 1 })
      next.status = 'won'; next.end = now
    } else if (opened) sounds.playMove()
    installGame(next)
    if (next.status === 'won' || next.status === 'lost') finish(next, next.status === 'won')
  }

  // ── 입력: 좌클릭 열기 · 우클릭/길게 누르기 깃발 · 숫자 클릭/양쪽 클릭/가운데 클릭 = chord ──
  const idx = (e: React.SyntheticEvent) => {
    const el = (e.target as HTMLElement).closest('[data-i]') as HTMLElement | null
    return el ? Number(el.dataset.i) : -1
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (!isCurrentMinesweeperInput(game.generation, generation.current)) return
    const i = idx(e), p = pressRef.current
    clearPress(); p.type = e.pointerType; p.fired = false; p.suppress = false
    p.generation = game.generation; p.pointerId = e.pointerId
    if (i < 0) return
    setCursor(i)
    if (e.pointerType !== 'mouse') {
      p.x = e.clientX; p.y = e.clientY
      clearPress()
      const expected = game.generation, pointerId = e.pointerId
      const timer = setTimeout(() => {
        if (p.timer !== timer || !isCurrentMinesweeperInput(expected, generation.current) || p.generation !== expected || p.pointerId !== pointerId) return
        p.fired = true; p.timer = null
        navigator.vibrate?.(15)
        act(i, flagMode ? 'open' : 'flag', expected)
      }, LONG_PRESS)
      p.timer = timer
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pressRef.current
    if (p.generation !== game.generation || p.pointerId !== e.pointerId || !isCurrentMinesweeperInput(game.generation, generation.current)) return
    if (p.timer && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) clearPress()
  }
  const endPointer = (e: React.PointerEvent, cancel = false) => {
    const p = pressRef.current
    if (p.generation !== game.generation || p.pointerId !== e.pointerId || !isCurrentMinesweeperInput(game.generation, generation.current)) return
    clearPress()
    if (cancel) { p.generation = -1; p.pointerId = null }
  }
  const onMouseDown = (e: React.MouseEvent) => {
    if (!isCurrentMinesweeperInput(game.generation, generation.current)) return
    const i = idx(e), p = pressRef.current
    if (p.generation !== game.generation) return
    if ((e.buttons & 3) === 3 || e.button === 1) { // 양쪽 버튼 or 가운데 버튼
      e.preventDefault()
      p.suppress = true
      if (i >= 0) act(i, 'chord')
    } else if (e.buttons === 1 || e.buttons === 2) p.suppress = false
  }
  const onClick = (e: React.MouseEvent) => {
    const i = idx(e), p = pressRef.current
    if (!isCurrentMinesweeperInput(game.generation, generation.current) || (e.detail !== 0 && p.generation !== game.generation)) return
    if (i < 0 || p.fired || p.suppress) { p.fired = false; return }
    act(i, flagMode ? 'flag' : 'open')
  }
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const i = idx(e), p = pressRef.current
    if (!isCurrentMinesweeperInput(game.generation, generation.current) || p.generation !== game.generation) return
    if (i < 0 || p.type !== 'mouse' || p.suppress) return // 터치는 길게 누르기 타이머가 처리
    act(i, 'flag')
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isCurrentMinesweeperInput(game.generation, generation.current) || e.nativeEvent.isComposing || e.keyCode === 229) return
    const { w, h } = game
    const r = Math.floor(cursor / w), c = cursor % w
    const move = (nr: number, nc: number) => { e.preventDefault(); setCursor(Math.min(h - 1, Math.max(0, nr)) * w + Math.min(w - 1, Math.max(0, nc))) }
    switch (e.key) {
      case 'ArrowUp': return move(r - 1, c)
      case 'ArrowDown': return move(r + 1, c)
      case 'ArrowLeft': return move(r, c - 1)
      case 'ArrowRight': return move(r, c + 1)
      case ' ': case 'Enter': e.preventDefault(); return act(cursor, 'open')
      case 'f': case 'F': e.preventDefault(); return act(cursor, 'flag')
    }
  }

  // ── 파생 값 ──
  const { layout, status } = game
  const flags = game.marks.filter(m => m === 1).length
  const done = status === 'won' || status === 'lost'
  const ms = game.end - game.start
  const bv = layout ? bbbv(layout) : 0
  const efficiency = game.clicks ? Math.round((bv / game.clicks) * 100) : 0
  const bvps = ms > 0 ? (bv / (ms / 1000)).toFixed(2) : '0'
  const stats = dailyStats(daily, today)
  const dailyDone = mode === 'daily' && !!daily[today]
  const shareUrl = mounted ? `${window.location.origin}/minesweeper/${mode === 'daily' ? '?mode=daily' : ''}` : ''
  const rec = daily[today]
  const dailyText = rec
    ? rec.won
      ? t('daily.shareWon', { day: today, diff: t(DAILY_PRESET), time: fmtTime(rec.ms, false) })
      : t('daily.shareLost', { day: today, diff: t(DAILY_PRESET), pct: Math.floor(rec.progress * 100) })
    : ''
  const boomR = Math.floor(game.boom / game.w), boomC = game.boom % game.w

  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const stateLabel = (i: number): string => {
    const lost = status === 'lost'
    if (game.marks[i] === 1) return t(lost && layout && !layout.mine[i] ? 'cell.wrongFlag' : 'cell.flag')
    if (game.marks[i] === 2) return t('cell.question')
    if (layout?.mine[i] && (game.open[i] || lost)) return t('cell.mine')
    if (!game.open[i]) return t('cell.closed')
    return layout?.count[i] ? String(layout.count[i]) : t('cell.empty')
  }

  const renderCell = (i: number) => {
    const open = game.open[i], mark = game.marks[i]
    const mine = !!layout?.mine[i]
    const lost = status === 'lost'
    let content: React.ReactNode = null
    let cls = 'bg-track hover:bg-line-strong'
    let anim = ''
    let delay = 0
    if (mark === 1) {
      content = lost && !mine ? '❌' : '🚩'
    } else if (mine && (open || lost)) {
      content = '💣'
      cls = i === game.boom ? 'bg-red-500' : 'bg-soft'
      if (i !== game.boom) {
        anim = 'ms-pop'
        delay = Math.min(900, Math.max(Math.abs(Math.floor(i / game.w) - boomR), Math.abs((i % game.w) - boomC)) * 45)
      }
    } else if (open) {
      cls = 'bg-surface'
      const n = layout?.count[i] ?? 0
      if (n) content = <span className={`font-bold ${NUMBER_COLORS[n]}`}>{n}</span>
    } else if (mark === 2) content = <span className="font-bold text-sub">?</span>
    const r = Math.floor(i / game.w), c = i % game.w
    return (
      <div
        key={i}
        id={`ms-c-${i}`}
        data-i={i}
        role="gridcell"
        aria-label={t('cellLabel', { r: r + 1, c: c + 1, state: stateLabel(i) })}
        className={`${cls} flex items-center justify-center leading-none cursor-pointer ${focused && i === cursor ? 'ring-2 ring-primary ring-inset z-10' : ''}`}
        style={{ width: cell, height: cell, fontSize: Math.round(cell * 0.55) }}
      >
        {content != null && <span className={anim} style={delay ? { animationDelay: `${delay}ms` } : undefined}>{content}</span>}
      </div>
    )
  }

  const chip = (on: boolean) =>
    `px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`
  const toggle = (on: boolean, onChange: (v: boolean) => void, label: string, hint?: string) => (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
      <span>
        <span className="text-sm text-body">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  )

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes ms-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes ms-pop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes ms-win { 0%{transform:scale(1)} 50%{transform:scale(1.02)} 100%{transform:scale(1)} }
        @media (prefers-reduced-motion: no-preference) {
          .ms-shake{animation:ms-shake .4s ease-in-out}
          .ms-pop{display:inline-block;animation:ms-pop .25s ease-out both}
          .ms-win{animation:ms-win .5s ease-in-out 2}
        }
      `}</style>
      <GameConfetti active={celebrate} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        {mounted && (
          <button
            onClick={() => sounds.setEnabled(!sounds.enabled)}
            aria-label={sounds.enabled ? tSound('disabled') : tSound('enabled')}
            title={sounds.enabled ? tSound('disabled') : tSound('enabled')}
            className="shrink-0 p-2.5 rounded-xl bg-soft text-body hover:bg-track"
          >
            {sounds.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* 모드 */}
      <div role="tablist" className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-2xl">
        {(['classic', 'daily'] as const).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === m ? 'bg-primary text-white' : 'text-body hover:bg-track'}`}
          >
            {m === 'classic' ? t('modeClassic') : today ? t('daily.title', { day: today }) : t('modeDaily')}
          </button>
        ))}
      </div>

      {/* 설정 */}
      {mode === 'classic' ? (
        <div className="ui-card p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['beginner', 'intermediate', 'expert', 'custom'] as const).map(d => (
              <button key={d} data-minesweeper-difficulty={d} onClick={() => selectDifficulty(d)} className={`${chip(diff === d)} min-h-11`}>
                {diffLabel(d)}
                <span className="ml-1.5 text-xs opacity-75 tabular-nums">
                  {d === 'custom' ? '' : `${PRESETS[d].w}×${PRESETS[d].h}·${PRESETS[d].mines}`}
                </span>
              </button>
            ))}
          </div>
          {diff === 'custom' && (
            <form noValidate
              className="flex flex-wrap items-end gap-3"
              onSubmit={e => {
                e.preventDefault()
                invalidateInput()
                const c = clampConfig(Number(customDraft.w), Number(customDraft.h), Number(customDraft.mines))
                setCustom(c)
                setCustomDraft({ w: String(c.w), h: String(c.h), mines: String(c.mines) })
              }}
            >
              {([['w', 'customWidth', 5, 30], ['h', 'customHeight', 5, 24], ['mines', 'customMines', 1, 711]] as const).map(([k, label, min, max]) => (
                <label key={k} className="block">
                  <span className="text-xs text-sub">{t(label)}</span>
                  <input
                    type="number" inputMode="numeric" min={min} max={max}
                    value={customDraft[k]}
                    onChange={e => setCustomDraft(v => ({ ...v, [k]: e.target.value }))}
                    className="ui-field min-h-11 px-3 py-2 text-base w-24 block mt-1 tabular-nums"
                  />
                </label>
              ))}
              <button type="submit" className="ui-btn px-4 py-2">{t('apply')}</button>
              <p className="w-full text-xs text-muted">{t('customHint')}</p>
            </form>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {toggle(noGuess, setNoGuess, t('noGuess'), t('noGuessHint'))}
            {toggle(qmarks, setQmarks, t('qmarks'), t('qmarksHint'))}
          </div>
        </div>
      ) : (
        <div className="ui-card p-5">
          <p className="text-sm text-body">{t('daily.desc', { diff: t(DAILY_PRESET) })}</p>
          {mounted && (
            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              {[
                [t('daily.played'), String(stats.played)],
                [t('daily.winRate'), `${stats.winRate}%`],
                [t('daily.streak'), String(stats.current)],
                [t('daily.best'), stats.best ? fmtTime(stats.best) : '-'],
              ].map(([k, v]) => (
                <div key={k} className="bg-subtle rounded-xl py-3">
                  <p className="text-lg font-bold text-fg tabular-nums">{v}</p>
                  <p className="text-xs text-muted">{k}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 보드 */}
      <div className="ui-card p-3 sm:p-5 space-y-3">
        {game.practice && <div data-minesweeper-practice-notice className="space-y-2 rounded-xl bg-subtle p-4">
          <p className="font-semibold text-fg">{t('replay.active')}</p>
          <p className="text-sm text-sub">{t('replay.hint')}</p>
          <p className="text-sm text-sub">{t('replay.clockHint')}</p>
          {game.status === 'won' && game.clicks === 0 && <p className="text-sm text-body">{t('replay.automaticWin')}</p>}
          <button type="button" data-minesweeper-exit-practice onClick={newGame} className="ui-btn-soft min-h-11 px-4 py-2 text-base">{t('replay.newRandom')}</button>
        </div>}
        {replayError && <p role="alert" className="text-sm text-body">{t('replay.failed')}</p>}
        <div className="flex items-center justify-between gap-2 bg-subtle rounded-2xl px-4 py-2.5">
          <span className="font-bold text-fg tabular-nums min-w-[4.5rem]" aria-label={t('minesLeft')} title={t('minesLeft')}>
            💣 {game.mines - flags}
          </span>
          <button onClick={newGame} data-minesweeper-new-game className="min-h-11 min-w-11 text-3xl leading-none hover:scale-110 motion-reduce:hover:scale-100 transition-transform" title={t('newGame')} aria-label={t('newGame')}>
            {status === 'won' ? '😎' : status === 'lost' ? '😵' : '🙂'}
          </button>
          <span className="font-bold text-fg tabular-nums min-w-[4.5rem] text-right" aria-label={t('time')}>
            <Clock start={game.start} end={game.end} running={status === 'playing'} />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFlagMode(v => !v)}
            aria-pressed={flagMode}
            className={`inline-flex items-center gap-1.5 ${chip(flagMode)}`}
          >
            <Flag className="w-4 h-4" /> {flagMode ? t('flagModeOn') : t('flagMode')}
          </button>
          <label className="flex items-center gap-2 text-sm text-sub ml-auto">
            {t('cellSize')}
            <input type="range" min={18} max={48} value={cell} onChange={e => setCell(Number(e.target.value))} className="w-28 accent-[var(--primary)]" aria-label={t('cellSize')} />
          </label>
        </div>

        <div ref={wrapRef} className="overflow-auto max-h-[75vh] overscroll-contain">
          <div
            key={game.generation}
            role="grid"
            data-minesweeper-status={status}
            data-minesweeper-practice={game.practice ? 'true' : 'false'}
            data-minesweeper-generation={game.generation}
            data-minesweeper-first={game.first ?? ''}
            data-minesweeper-clicks={game.clicks}
            tabIndex={0}
            aria-label={t('boardLabel', { w: game.w, h: game.h, mines: game.mines })}
            aria-activedescendant={`ms-c-${cursor}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={e => endPointer(e)}
            onPointerCancel={e => endPointer(e, true)}
            onMouseDown={onMouseDown}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`grid gap-px p-px bg-line-strong rounded-md w-max mx-auto select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${status === 'lost' ? 'ms-shake' : status === 'won' ? 'ms-win' : ''}`}
            style={{ gridTemplateColumns: `repeat(${game.w}, ${cell}px)`, touchAction: 'pan-x pan-y', WebkitTouchCallout: 'none' }}
          >
            {Array.from({ length: game.h }, (_, r) => (
              <div key={r} role="row" className="contents">
                {Array.from({ length: game.w }, (_, c) => renderCell(r * game.w + c))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted text-center">{t('controlsHint')}</p>
        {game.noGuessFailed && <p className="text-xs text-amber-700 dark:text-amber-400 text-center">{t('noGuessFailed')}</p>}
      </div>

      {/* 결과 */}
      {done && layout && (game.start > 1 || game.practice) && (
        <div className="ui-card p-5 sm:p-6 space-y-4" aria-live="polite">
          {game.practice && <p className="text-sm font-semibold text-body">{t('replay.result')} · {t('replay.noRecord')}</p>}
          <div className="flex items-baseline justify-between gap-3">
            <p className={`text-lg font-bold ${status === 'won' ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>
              {status === 'won' ? t('youWin') : t('gameOver')}
              {newBest && !game.practice && <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-primary text-white">{t('newBest')}</span>}
            </p>
            <p className="text-3xl font-bold text-fg tabular-nums">{fmtTime(ms)}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              ['3BV', String(bv)],
              [t('bvps'), status === 'won' ? bvps : '-'],
              [t('clicks'), String(game.clicks)],
              [t('efficiency'), status === 'won' ? `${efficiency}%` : '-'],
            ].map(([k, v]) => (
              <div key={k} className="bg-subtle rounded-xl py-3">
                <p className="text-lg font-bold text-fg tabular-nums">{v}</p>
                <p className="text-xs text-muted">{k}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">{t('statsHint')}</p>
          {canPracticeClassic(mode, status, game.replaySource) && <button type="button" data-minesweeper-replay onClick={replayClassic} className="ui-btn min-h-11 px-4 py-3 text-base">{t(game.practice ? 'replay.again' : 'replay.start')}</button>}
          {status === 'won' && mode === 'classic' && !game.practice && (
            <ShareResult
              url={shareUrl}
              text={t('shareClassic', { diff: diffLabel(diff), time: fmtTime(ms) })}
              fileName="minesweeper"
              card={{
                tool: t('title'),
                label: t('cardLabel', { diff: diffLabel(diff), w: game.w, h: game.h, mines: game.mines }),
                headline: fmtTime(ms),
                rows: [
                  { label: '3BV', value: String(bv) },
                  { label: t('bvps'), value: bvps },
                  { label: t('efficiency'), value: `${efficiency}%` },
                ],
              }}
            />
          )}
        </div>
      )}

      {/* 오늘의 지뢰찾기 결과 · 공유 */}
      {dailyDone && rec && (
        <div className="ui-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{t('daily.next')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums">
                <Countdown />
              </p>
            </div>
            <button onClick={() => switchMode('classic')} className="ui-btn-soft px-4 py-2 text-sm">{t('daily.goClassic')}</button>
          </div>
          <pre className="bg-subtle rounded-2xl p-4 text-sm text-body whitespace-pre-wrap break-all font-sans">{`${dailyText}\n${shareUrl}`}</pre>
          <button onClick={() => copyText(`${dailyText}\n${shareUrl}`)} className="w-full ui-btn px-4 py-3 inline-flex items-center justify-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? t('daily.copied') : t('daily.copy')}
          </button>
          <ShareResult
            url={shareUrl}
            text={dailyText}
            fileName={`minesweeper-${today}`}
            card={{
              tool: t('title'),
              label: t('daily.cardLabel', { day: today, diff: t(DAILY_PRESET) }),
              headline: rec.won ? fmtTime(rec.ms) : t('daily.cardLost', { pct: Math.floor(rec.progress * 100) }),
              sub: t('daily.cardStreak', { n: stats.current }),
              rows: [
                { label: t('daily.played'), value: String(stats.played) },
                { label: t('daily.winRate'), value: `${stats.winRate}%` },
                { label: t('daily.best'), value: stats.best ? fmtTime(stats.best) : '-' },
              ],
            }}
          />
        </div>
      )}

      {/* 난이도별 최고 기록 */}
      {mounted && mode === 'classic' && (
        <div className="ui-card p-5">
          <h2 className="text-base font-semibold text-fg mb-3">{t('bestTimes')}</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(['beginner', 'intermediate', 'expert'] as const).map(d => (
              <div key={d} className={`rounded-xl py-3 ${diff === d ? 'bg-primary-soft' : 'bg-subtle'}`}>
                <p className={`text-lg font-bold tabular-nums ${diff === d ? 'text-primary' : 'text-fg'}`}>{best[d] ? fmtTime(best[d]) : '-'}</p>
                <p className="text-xs text-muted">{t(d)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'classic' && diff !== 'custom' && <LeaderboardPanel leaderboard={leaderboard} />}
      <NameInputModal
        isOpen={showNameModal && canSubmitMinesweeperScore(scoreCandidate, { ...game, mode, difficulty: diff })}
        onSubmit={async (name: string) => {
          const candidate = scoreCandidate
          if (!candidate || eligibility.current !== candidate || !isCurrentMinesweeperInput(candidate.generation, generation.current) || !canSubmitMinesweeperScore(candidate, { ...gameRef.current, mode, difficulty: diff })) return
          const token = ++submission.current
          eligibility.current = null; setScoreCandidate(null); setShowNameModal(false)
          await leaderboard.submitScore(candidate.seconds, name, candidate.ms)
          if (token !== submission.current || !isCurrentMinesweeperInput(candidate.generation, generation.current) || !canSubmitMinesweeperScore(candidate, { ...gameRef.current, mode, difficulty: diff })) return
          leaderboard.savePlayerName(name)
        }}
        onClose={() => { eligibility.current = null; setScoreCandidate(null); setShowNameModal(false) }}
        score={Math.max(1, Math.ceil(ms / 1000))}
        formatScore={leaderboard.config.formatScore}
        defaultName={leaderboard.savedPlayerName}
      />

      <GameAchievements achievements={achievements} unlockedCount={unlockedCount} totalCount={totalCount} />

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        {(['howToPlay', 'tips', 'records'] as const).map(s => (
          <div key={s}>
            <h3 className="text-lg font-semibold text-fg mb-2">{t(`guide.${s}.title`)}</h3>
            <ul className="list-disc list-inside space-y-1 text-body">
              {(t.raw(`guide.${s}.items`) as string[]).map((item, k) => <li key={k}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, k) => (
              <div key={k} className="bg-subtle rounded-2xl p-4">
                <p className="font-medium text-fg">{f.q}</p>
                <p className="text-sm text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AchievementToast achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null} onDismiss={dismissNewAchievements} />
    </div>
  )
}

function Countdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const s = Math.floor(msToNextDay(now) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return <>{`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`}</>
}
