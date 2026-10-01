'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { RotateCcw, Clock, Copy, Check, Volume2, VolumeX, Square, X as XIcon } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GameConfetti from '@/components/GameConfetti'
import ShareResult from '@/components/ShareResult'
import {
  type GridSize, type DailyRecords, type SolveRecord, SIZES,
  generatePuzzle, rowClues as getRowClues, colClues as getColClues, lineClue,
  dayNumber, msToNextDay, dailySeed, computeStreak, formatTime, shareText,
} from '@/utils/picross'

// 0 빈칸 · 1 칠함 · 2 X 표시 · 3 틀린 칸(실수 알림 모드에서 잠긴 X)
type CellState = 0 | 1 | 2 | 3
type Mode = 'daily' | 'practice'
type Tool = 'fill' | 'x'

interface PuzzleStats {
  gamesPlayed: number
  bestTimes: Record<GridSize, number | null>
}

const STATS_KEY = 'picross-stats'
const DAILY_KEY = 'picross-daily'
const SETTINGS_KEY = 'picross-settings'
const URL_BASE = 'https://toolhub.ai.kr/picross/'

function readJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback } catch { return fallback }
}
function writeJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 저장 불가: 무시 */ }
}
const emptyGrid = (n: number): CellState[][] => Array.from({ length: n }, () => Array(n).fill(0) as CellState[])
const sameClue = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])
const isSize = (n: number): n is GridSize => (SIZES as number[]).includes(n)

const CELL_MAX: Record<GridSize, number> = { 5: 52, 10: 36, 15: 30 }

export default function Picross() {
  const t = useTranslations('picross')
  const tSound = useTranslations('gameSounds')
  const params = useSearchParams()
  const sounds = useGameSounds()
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()

  // ── 설정/기록 (마운트 후 로드: 정적 HTML과 날짜 불일치 방지) ──
  const [now, setNow] = useState(0)
  const [mode, setMode] = useState<Mode>('daily')
  const [size, setSize] = useState<GridSize>(10)
  const [practiceSeed, setPracticeSeed] = useState(1)
  const [tool, setTool] = useState<Tool>('fill')
  const [assist, setAssist] = useState(true)
  const [records, setRecords] = useState<DailyRecords>({})
  const [stats, setStats] = useState<PuzzleStats>({ gamesPlayed: 0, bestTimes: { 5: null, 10: null, 15: null } })

  // ── 판 상태 ──
  const [grid, setGrid] = useState<CellState[][]>([])
  const [rowMistakes, setRowMistakes] = useState<number[]>([])
  const [started, setStarted] = useState(0) // 시작 시각(ms), 0 = 아직
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [copied, setCopied] = useState(false)

  const gridRef = useRef<CellState[][]>([])
  const mistakesRef = useRef<number[]>([])
  const dragRef = useRef<{ tool: Tool; target: CellState; r0: number; c0: number; axis: 'r' | 'c' | null } | null>(null)

  const today = now ? dayNumber(now) : 0
  const seed = mode === 'daily' ? dailySeed(today, size) : practiceSeed
  const ready = today > 0
  const solution = useMemo(() => (ready ? generatePuzzle(size, seed) : null), [size, seed, ready])
  const rowClues = useMemo(() => (solution ? getRowClues(solution) : []), [solution])
  const colClues = useMemo(() => (solution ? getColClues(solution) : []), [solution])
  const streak = useMemo(() => computeStreak(records, today), [records, today])
  const dailyRecord: SolveRecord | undefined = mode === 'daily' ? records[today]?.[size] : undefined
  const mistakes = rowMistakes.reduce((a, b) => a + b, 0)

  // 첫 로드: 저장값 + URL(?p=시드&size=n → 연습 퍼즐, ?size=n → 그 크기의 오늘의 퍼즐)
  useEffect(() => {
    setNow(Date.now())
    setRecords(readJSON<DailyRecords>(DAILY_KEY, {}))
    setStats(readJSON<PuzzleStats>(STATS_KEY, { gamesPlayed: 0, bestTimes: { 5: null, 10: null, 15: null } }))
    const s = readJSON<{ assist?: boolean }>(SETTINGS_KEY, {})
    if (s.assist === false) setAssist(false)
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const n = Number(params.get('size'))
    if (isSize(n)) setSize(n)
    const p = Number(params.get('p'))
    if (Number.isFinite(p) && p > 0) { setPracticeSeed(p >>> 0); setMode('practice') }
  }, [params])

  const syncURL = useCallback((m: Mode, n: GridSize, p: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('size', String(n))
    if (m === 'practice') url.searchParams.set('p', String(p)); else url.searchParams.delete('p')
    window.history.replaceState({}, '', url)
  }, [])

  // 퍼즐이 바뀌면 판 초기화 (오늘 이미 푼 퍼즐은 완성 상태로 복원)
  useEffect(() => {
    if (!solution) return
    const rec = mode === 'daily' ? readJSON<DailyRecords>(DAILY_KEY, {})[today]?.[size] : undefined
    const g: CellState[][] = rec ? solution.map(row => row.map(v => (v ? 1 : 0) as CellState)) : emptyGrid(size)
    gridRef.current = g
    mistakesRef.current = rec?.rows.length === size ? [...rec.rows] : Array(size).fill(0)
    setGrid(g)
    setRowMistakes(mistakesRef.current)
    setStarted(0)
    setElapsed(rec?.time ?? 0)
    setWon(!!rec)
    setCelebrate(false)
  }, [solution]) // eslint-disable-line react-hooks/exhaustive-deps -- mode/size/today는 solution과 함께 바뀜 (연습 중 자정에 초기화 안 되게)

  // 타이머: 시작 시각 기준 (setInterval 누적 오차 없음)
  useEffect(() => {
    if (started && !won) setElapsed(Math.floor((now - started) / 1000))
  }, [now, started, won])

  const isSolved = useCallback((g: CellState[][]) =>
    g.every((row, r) => sameClue(lineClue(row.map(v => v === 1)), rowClues[r])) &&
    colClues.every((clue, c) => sameClue(lineClue(g.map(row => row[c] === 1)), clue)), [rowClues, colClues])

  const finish = useCallback((time: number) => {
    setWon(true)
    setElapsed(time)
    setCelebrate(true)
    sounds.playWin()
    dragRef.current = null
    const rows = [...mistakesRef.current]
    const nextStats: PuzzleStats = { gamesPlayed: stats.gamesPlayed + 1, bestTimes: { ...stats.bestTimes } }
    const best = nextStats.bestTimes[size]
    if (best === null || time < best) nextStats.bestTimes[size] = time
    setStats(nextStats)
    writeJSON(STATS_KEY, nextStats)
    if (mode === 'daily') {
      const all = readJSON<DailyRecords>(DAILY_KEY, {})
      all[today] = { ...all[today], [size]: { time, mistakes: rows.reduce((a, b) => a + b, 0), rows } }
      writeJSON(DAILY_KEY, all)
      setRecords(all)
    }
    recordGameResult({ gameType: 'picross', result: 'win', difficulty: size === 5 ? 'easy' : size === 10 ? 'normal' : 'hard', moves: 0 })
  }, [sounds, stats, size, mode, today, recordGameResult])

  // ── 입력: 한 칸 적용 (드래그 중에는 시작 칸과 같은 동작만 이어서) ──
  const apply = useCallback((r: number, c: number) => {
    const d = dragRef.current
    if (!d || !solution || won) return
    const cur = gridRef.current[r]?.[c]
    if (cur === undefined || cur === 3) return
    // 칠하기 드래그는 빈칸만 칠하고, 지우기 드래그는 같은 종류만 지움 (X를 덮어쓰지 않음)
    const from: CellState = d.target === 0 ? (d.tool === 'fill' ? 1 : 2) : 0
    if (cur === d.target || cur !== from) return
    const g = gridRef.current.map(row => [...row])
    let next: CellState = d.target
    if (next === 1 && !solution[r][c]) {
      mistakesRef.current = mistakesRef.current.map((m, i) => (i === r ? m + 1 : m))
      setRowMistakes(mistakesRef.current)
      if (assist) { next = 3; sounds.playInvalid() }
    }
    g[r][c] = next
    gridRef.current = g
    setGrid(g)
    if (isSolved(g)) {
      const s = started || Date.now()
      finish(Math.max(1, Math.round((Date.now() - s) / 1000)))
    }
  }, [solution, won, assist, sounds, isSolved, started, finish])

  /** 한 칸에서 동작 시작: 시작 칸 상태로 칠하기/지우기 결정 → 드래그 동안 유지 */
  const begin = useCallback((r: number, c: number, useTool: Tool) => {
    if (won || !solution) return
    const cur = gridRef.current[r][c]
    if (cur === 3) return
    const target: CellState = useTool === 'fill' ? (cur === 1 ? 0 : 1) : (cur === 2 ? 0 : 2)
    if (!started) setStarted(Date.now())
    // 칠한 칸에 X 도구 → X로 바꿈 (반대도 마찬가지): 시작 칸만 덮어씀
    if (cur !== 0 && target !== 0) {
      const g = gridRef.current.map(row => [...row])
      g[r][c] = 0
      gridRef.current = g
    }
    dragRef.current = { tool: useTool, target, r0: r, c0: c, axis: null }
    if (target === 1) sounds.playMove()
    apply(r, c)
  }, [won, solution, started, sounds, apply])

  const onPointerDown = useCallback((e: React.PointerEvent, r: number, c: number) => {
    if (e.button !== 0 && e.button !== 2) return
    e.preventDefault()
    begin(r, c, e.button === 2 ? 'x' : tool)
  }, [begin, tool])

  // 키보드: Enter/Space = 선택한 도구, X 키 = X 표시
  const onKeyDown = useCallback((e: React.KeyboardEvent, r: number, c: number) => {
    const k = e.key.toLowerCase()
    if (k !== 'enter' && k !== ' ' && k !== 'x') return
    e.preventDefault()
    begin(r, c, k === 'x' ? 'x' : tool)
    dragRef.current = null
  }, [begin, tool])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-cell]')
    if (!el) return
    let r = Number(el.dataset.r), c = Number(el.dataset.c)
    // 한 줄로만 드래그 (손가락이 살짝 비껴도 옆 줄을 칠하지 않게)
    if (!d.axis && (r !== d.r0 || c !== d.c0)) d.axis = r === d.r0 ? 'r' : c === d.c0 ? 'c' : Math.abs(r - d.r0) < Math.abs(c - d.c0) ? 'r' : 'c'
    if (d.axis === 'r') r = d.r0
    if (d.axis === 'c') c = d.c0
    apply(r, c)
  }, [apply])

  useEffect(() => {
    const end = () => { dragRef.current = null }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => { window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end) }
  }, [])

  // ── 모드/퍼즐 전환 ──
  const pickMode = (m: Mode) => {
    const p = m === 'practice' && practiceSeed === 1 ? Math.floor(Math.random() * 999_999_999) + 1 : practiceSeed
    setPracticeSeed(p)
    setMode(m)
    syncURL(m, size, p)
  }
  const pickSize = (n: GridSize) => {
    const p = mode === 'practice' ? Math.floor(Math.random() * 999_999_999) + 1 : practiceSeed
    setSize(n)
    setPracticeSeed(p)
    syncURL(mode, n, p)
  }
  const newPractice = () => {
    const p = Math.floor(Math.random() * 999_999_999) + 1
    setPracticeSeed(p)
    setMode('practice')
    syncURL('practice', size, p)
  }
  const reset = () => {
    if (won && mode === 'daily') return
    const g = emptyGrid(size)
    gridRef.current = g
    mistakesRef.current = Array(size).fill(0)
    setGrid(g)
    setRowMistakes(mistakesRef.current)
    setStarted(0)
    setElapsed(0)
    setWon(false)
  }
  const toggleAssist = () => {
    const v = !assist
    setAssist(v)
    writeJSON(SETTINGS_KEY, { assist: v })
  }

  // ── 공유 ──
  const shareUrl = mode === 'daily' ? `${URL_BASE}?size=${size}` : `${URL_BASE}?p=${practiceSeed}&size=${size}`
  const resultText = won ? shareText({
    title: t('shareTitle'), day: mode === 'daily' ? today : undefined, size, time: elapsed,
    mistakes, rows: rowMistakes, streak: mode === 'daily' ? streak.current : undefined,
  }) : ''
  const copyResult = async () => {
    const text = `${resultText}\n${shareUrl}`
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* 권한 없음: 무시 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── 레이아웃: 화면 폭에 맞춘 칸 크기 ──
  const maxRowClue = Math.max(1, ...rowClues.map(c => c.length))
  const maxColClue = Math.max(1, ...colClues.map(c => c.length))
  const clueCols = maxRowClue * 0.6 + 0.6
  const cell = `min(${CELL_MAX[size]}px, calc((100vw - 72px) / ${size + clueCols}))`
  const clueFont = `max(10px, calc(var(--cell) * 0.42))`
  const rowDone = (r: number) => grid[r] && sameClue(lineClue(grid[r].map(v => v === 1)), rowClues[r])
  const colDone = (c: number) => grid.length > 0 && sameClue(lineClue(grid.map(row => row[c] === 1)), colClues[c])
  const sizeLabel = (n: GridSize) => (n === 5 ? t('easy') : n === 10 ? t('medium') : t('hard'))

  const seg = (on: boolean) => `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${on ? 'bg-primary text-white' : 'text-body hover:bg-soft'}`

  return (
    <div className="space-y-6">
      <GameConfetti active={celebrate} />

      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-4 text-body">
          {streak.current > 0 && <span className="text-sm font-semibold text-fg">{t('streak', { n: streak.current })}</span>}
          <span className="flex items-center gap-1 font-mono text-lg tabular-nums"><Clock className="w-4 h-4" />{formatTime(elapsed)}</span>
          {assist && mistakes > 0 && <span className="text-sm text-red-500 tabular-nums">{t('mistakes')} {mistakes}</span>}
          <button
            onClick={() => sounds.setEnabled(!sounds.enabled)}
            aria-label={sounds.enabled ? tSound('disabled') : tSound('enabled')}
            title={sounds.enabled ? tSound('disabled') : tSound('enabled')}
            className="p-2 rounded-lg hover:bg-soft text-sub"
          >
            {sounds.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 모드 · 크기 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 ui-card rounded-xl">
          <button onClick={() => pickMode('daily')} className={seg(mode === 'daily')}>
            {today ? t('dailyNo', { day: today }) : t('dailyPuzzle')}
          </button>
          <button onClick={() => pickMode('practice')} className={seg(mode === 'practice')}>{t('practice')}</button>
        </div>
        <div className="flex gap-1 p-1 ui-card rounded-xl">
          {SIZES.map(n => (
            <button key={n} onClick={() => pickSize(n)} className={seg(size === n)}>
              {n}×{n} <span className="text-xs opacity-75">{sizeLabel(n)}</span>
              {mode === 'daily' && records[today]?.[n] && <Check className="inline w-3.5 h-3.5 ml-1 -mt-0.5" aria-label={t('dailyDone')} />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 판 */}
        <div className="lg:col-span-2 ui-card p-3 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 p-1 bg-subtle rounded-xl" role="radiogroup" aria-label={t('inputMode')}>
              <button role="radio" aria-checked={tool === 'fill'} onClick={() => setTool('fill')} className={`${seg(tool === 'fill')} flex items-center gap-1.5 px-4`}>
                <Square className="w-4 h-4" fill="currentColor" />{t('modeFill')}
              </button>
              <button role="radio" aria-checked={tool === 'x'} onClick={() => setTool('x')} className={`${seg(tool === 'x')} flex items-center gap-1.5 px-4`}>
                <XIcon className="w-4 h-4" />{t('modeX')}
              </button>
            </div>
            <div className="flex gap-2">
              {mode === 'practice' && (
                <button onClick={newPractice} className="ui-btn-soft px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1">
                  <RotateCcw className="w-4 h-4" />{t('newPuzzle')}
                </button>
              )}
              {!(won && mode === 'daily') && (
                <button onClick={reset} className="ui-btn-soft px-3 py-2 rounded-xl text-sm font-semibold">{t('reset')}</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {solution && grid.length === size && (
              <div
                className="inline-grid select-none mx-auto"
                style={{ ['--cell' as string]: cell, gridTemplateColumns: `auto repeat(${size}, var(--cell))`, touchAction: 'none' }}
                onPointerMove={onPointerMove}
                onContextMenu={e => e.preventDefault()}
              >
                <div />
                {colClues.map((clue, c) => (
                  <div
                    key={c}
                    className={`flex flex-col items-center justify-end pb-1 leading-tight font-semibold tabular-nums transition-opacity ${colDone(c) ? 'text-faint opacity-60' : 'text-body'}`}
                    style={{ fontSize: clueFont, minHeight: `calc(var(--cell) * ${maxColClue * 0.5 + 0.3})` }}
                  >
                    {clue.map((n, i) => <span key={i}>{n}</span>)}
                  </div>
                ))}
                {grid.map((row, r) => [
                  <div
                    key={`clue-${r}`}
                    className={`flex items-center justify-end gap-1.5 pr-2 font-semibold tabular-nums transition-opacity ${rowDone(r) ? 'text-faint opacity-60' : 'text-body'}`}
                    style={{ fontSize: clueFont }}
                  >
                    {rowClues[r].map((n, i) => <span key={i}>{n}</span>)}
                  </div>,
                  ...row.map((v, c) => {
                    const thickR = (c + 1) % 5 === 0 && c < size - 1 ? 'border-r-2 border-r-line-strong' : ''
                    const thickB = (r + 1) % 5 === 0 && r < size - 1 ? 'border-b-2 border-b-line-strong' : ''
                    return (
                      <div
                        key={`${r}-${c}`}
                        data-cell
                        data-r={r}
                        data-c={c}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => onKeyDown(e, r, c)}
                        aria-label={`${t('cell')} ${r + 1},${c + 1}`}
                        onPointerDown={e => onPointerDown(e, r, c)}
                        className={`border border-line ${thickR} ${thickB} flex items-center justify-center ${
                          v === 1 ? 'bg-primary' : 'bg-surface'
                        } ${won ? '' : 'cursor-pointer'} ${v !== 1 && !won ? 'hover:bg-soft' : ''}`}
                        style={{ width: 'var(--cell)', height: 'var(--cell)', fontSize: 'calc(var(--cell) * 0.6)' }}
                      >
                        {v === 2 && <span className="text-faint font-bold leading-none">×</span>}
                        {v === 3 && <span className="text-red-500 font-bold leading-none">×</span>}
                      </div>
                    )
                  }),
                ])}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{t('helpClick')} · {t('helpRightClick')}</span>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-body">
              <input type="checkbox" checked={assist} onChange={toggleAssist} className="w-4 h-4 accent-[var(--primary)]" />
              {t('assist')}
            </label>
          </div>
        </div>

        {/* 결과 · 통계 */}
        <div className="space-y-6">
          {won ? (
            <div className="ui-card p-6 space-y-4">
              <div>
                <p className="text-sm text-muted">
                  {mode === 'daily' ? t('cardLabelDaily', { day: today, size: `${size}×${size}` }) : t('cardLabelPractice', { size: `${size}×${size}` })}
                </p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{formatTime(elapsed)}</p>
                <p className="text-sm text-sub mt-1">{mistakes === 0 ? t('mistakesNone') : t('mistakesCount', { n: mistakes })}</p>
              </div>
              <pre className="bg-subtle rounded-2xl p-4 text-sm leading-snug whitespace-pre-wrap font-sans">{resultText}</pre>
              <button onClick={copyResult} className="ui-btn w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('copied') : t('copyResult')}
              </button>
              <ShareResult
                url={shareUrl}
                text={resultText}
                fileName={`picross-${mode === 'daily' ? today : practiceSeed}-${size}`}
                card={{
                  tool: t('title'),
                  label: mode === 'daily' ? t('cardLabelDaily', { day: today, size: `${size}×${size}` }) : t('cardLabelPractice', { size: `${size}×${size}` }),
                  headline: formatTime(elapsed),
                  sub: mistakes === 0 ? t('mistakesNone') : t('mistakesCount', { n: mistakes }),
                }}
              />
              <div className="pt-3 border-t border-line space-y-3">
                {mode === 'daily' && (
                  <p className="text-sm text-sub">
                    {t('nextPuzzle')}{' '}
                    <span className="font-bold text-fg tabular-nums">
                      {(() => { const ms = msToNextDay(now); const h = Math.floor(ms / 3_600_000); const m = Math.floor((ms % 3_600_000) / 60_000); const s = Math.floor((ms % 60_000) / 1000); return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` })()}
                    </span>
                  </p>
                )}
                <button onClick={newPractice} className="ui-btn-soft w-full px-4 py-2.5 rounded-xl text-sm font-semibold">
                  {mode === 'daily' ? t('playPractice') : t('newPuzzle')}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1">
              <p className="font-semibold text-fg">{mode === 'daily' && today ? t('dailyNo', { day: today }) : t('practice')}</p>
              <p>{t('uniqueNote')}</p>
            </div>
          )}

          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('statsTitle')}</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                [stats.gamesPlayed, t('statsPlayed')],
                [streak.current, t('statsStreak')],
                [streak.max, t('statsMaxStreak')],
              ].map(([v, label]) => (
                <div key={label as string} className="bg-subtle rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-fg tabular-nums">{v}</div>
                  <div className="text-xs text-muted">{label}</div>
                </div>
              ))}
              {SIZES.map(n => (
                <div key={n} className="bg-subtle rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-fg tabular-nums">{stats.bestTimes[n] != null ? formatTime(stats.bestTimes[n]!) : '-'}</div>
                  <div className="text-xs text-muted">{t('statsBest', { size: `${n}×${n}` })}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <GameAchievements achievements={achievements} unlockedCount={unlockedCount} totalCount={totalCount} />

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">{t('guideTitle')}</h2>
        <div className="space-y-4 text-sm text-body">
          {(['Rules', 'Tips', 'Controls'] as const).map(k => (
            <div key={k}>
              <h3 className="font-medium text-fg mb-1">{t(`guide${k}Title`)}</h3>
              <ul className="list-disc list-inside space-y-1">
                {(t.raw(`guide${k}Items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <AchievementToast achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null} onDismiss={dismissNewAchievements} />
    </div>
  )
}
