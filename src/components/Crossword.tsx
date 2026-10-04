'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/crossword'
import '@/lib/i18n/ns/gameSounds'
import { Clock, RotateCcw, ChevronLeft, ChevronRight, Volume2, VolumeX, Copy, Check, Shuffle } from 'lucide-react'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GameConfetti from '@/components/GameConfetti'
import ShareResult from '@/components/ShareResult'
import {
  type Dir, type Puzzle, type DailyResults,
  generatePuzzle, dailyNumber, dailyDate, msUntilNextDaily, wordCells, buildWordIndex,
  SENTINEL, toTyped, mapTyped, cursorSlot, isJamo, computeStats, shapeGrid,
} from '@/utils/crossword'

type Mode = { kind: 'daily'; n: number } | { kind: 'practice'; seed: number }
interface Game { key: string; cells: string[]; locked: number[]; hinted: number[]; hints: number; time: number; solved: boolean }

const PROGRESS_KEY = 'crossword-progress-v1'
const RESULTS_KEY = 'crossword-daily-v1'
const SITE = 'https://toolhub.ai.kr/crossword/'

function readJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
function writeJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 저장 불가: 무시 */ }
}
const other = (d: Dir): Dir => (d === 'across' ? 'down' : 'across')
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function Crossword() {
  const t = useTranslations('crossword')
  const ts = useTranslations('gameSounds')
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playWin, playInvalid, enabled: soundOn, setEnabled: setSoundOn } = useGameSounds()

  // 날짜·저장소는 마운트 후에만 읽음 → 정적 HTML에는 판/정답이 없고 hydration도 깨끗함
  const [today, setToday] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [results, setResults] = useState<DailyResults>({})
  useEffect(() => {
    const n = dailyNumber()
    const q = Math.floor(Number(new URLSearchParams(window.location.search).get('n')))
    setToday(n)
    setMode({ kind: 'daily', n: q >= 1 && q <= n ? q : n })
    setResults(readJSON<DailyResults>(RESULTS_KEY, {}))
  }, [])

  const puzzle = useMemo<Puzzle | null>(() => (mode ? generatePuzzle(mode.kind === 'daily' ? mode.n : mode.seed) : null), [mode])
  const key = mode ? (mode.kind === 'daily' ? `d${mode.n}` : `p${mode.seed}`) : ''
  const widx = useMemo(() => (puzzle ? buildWordIndex(puzzle) : null), [puzzle])

  const [game, setGame] = useState<Game | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const [dir, setDir] = useState<Dir>('across')
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [copied, setCopied] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const composingRef = useRef(false)
  const bufRef = useRef<{ slots: number[]; base: string[]; touched: number } | null>(null)
  const almostShown = useRef(false)
  const clueRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  // ── 퍼즐 전환: 저장된 진행 불러오기 ──
  useEffect(() => {
    if (!puzzle || !key) return
    const saved = readJSON<Record<string, Game>>(PROGRESS_KEY, {})[key]
    const blank: Game = { key, cells: puzzle.grid.map(() => ''), locked: [], hinted: [], hints: 0, time: 0, solved: false }
    const g = saved && saved.cells?.length === puzzle.grid.length ? { ...blank, ...saved, key } : blank
    setGame(g)
    const first = puzzle.words[0]
    const cells = wordCells(first, puzzle.cols)
    setCursor(g.solved ? null : cells.find(k => !g.cells[k]) ?? cells[0])
    setDir(first.dir)
    setWrong(new Set())
    setMsg(null)
    setStarted(false)
    bufRef.current = null
    almostShown.current = false
  }, [puzzle, key])

  // 데스크톱은 바로 타이핑할 수 있게 포커스 (모바일은 키보드가 튀어나오므로 탭할 때만)
  const ready = !!game && game.key === key && !game.solved
  useEffect(() => {
    if (ready && window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true })
  }, [ready, key])

  // ── 자동 저장 (최근 10개 퍼즐만 보관) ──
  useEffect(() => {
    if (!game || game.key !== key) return
    const all = readJSON<Record<string, Game & { at: number }>>(PROGRESS_KEY, {})
    all[key] = { ...game, at: Date.now() }
    const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 10)
    writeJSON(PROGRESS_KEY, Object.fromEntries(keep))
  }, [game, key])

  // ── 타이머: 첫 조작부터, 탭이 보일 때만 ──
  const solved = !!game?.solved
  useEffect(() => {
    if (!started || solved) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setGame(g => (g && !g.solved ? { ...g, time: g.time + 1 } : g))
    }, 1000)
    return () => clearInterval(id)
  }, [started, solved, key])

  const lockedSet = useMemo(() => new Set(game?.locked ?? []), [game?.locked])
  const hintedSet = useMemo(() => new Set(game?.hinted ?? []), [game?.hinted])

  const activeIdx = cursor == null || !widx ? -1 : widx[dir][cursor] >= 0 ? widx[dir][cursor] : widx[other(dir)][cursor]
  const activeWord = puzzle && activeIdx >= 0 ? puzzle.words[activeIdx] : null
  const activeCells = useMemo(() => new Set(activeWord && puzzle ? wordCells(activeWord, puzzle.cols) : []), [activeWord, puzzle])

  // ── 입력 버퍼 ──
  const resetInput = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.value = SENTINEL
    try { el.setSelectionRange(1, 1) } catch { /* 일부 브라우저 */ }
  }, [])

  /** 조합 중인 버퍼 확정: 남은 낱자(ㄱ, ㅏ)는 지움 */
  const commitBuffer = useCallback(() => {
    const el = inputRef.current
    if (el && composingRef.current && document.activeElement === el) {
      // 조합 중 값 변경은 IME를 꼬이게 함 → blur로 먼저 확정.
      // 이때 오는 compositionend는 아직 살아 있는 버퍼로 같은 값을 다시 비출 뿐 (새 버퍼 안 만듦)
      el.blur()
      composingRef.current = false
      el.focus({ preventScroll: true })
    }
    const buf = bufRef.current
    bufRef.current = null
    if (buf) {
      setGame(g => {
        if (!g) return g
        const cells = g.cells.slice()
        let changed = false
        for (const k of buf.slots) if (isJamo(cells[k])) { cells[k] = ''; changed = true }
        return changed ? { ...g, cells } : g
      })
    }
    resetInput()
  }, [resetInput])

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true })
    resetInput()
  }, [resetInput])

  const select = useCallback((k: number, prefer?: Dir) => {
    if (!widx || !game || game.solved) return
    commitBuffer()
    let d = prefer ?? dir
    if (widx[d][k] < 0) d = other(d)
    setCursor(k)
    setDir(d)
    setStarted(true)
    focusInput()
  }, [widx, game, dir, commitBuffer, focusInput])

  const onCellClick = (k: number) => {
    if (!puzzle?.grid[k] || !widx) return
    if (k === cursor && widx[other(dir)][k] >= 0) {
      commitBuffer()
      setDir(other(dir))
      setStarted(true)
      focusInput()
    } else select(k)
  }

  const gotoWord = useCallback((i: number) => {
    if (!puzzle || !game) return
    const w = puzzle.words[(i + puzzle.words.length) % puzzle.words.length]
    const cells = wordCells(w, puzzle.cols)
    select(cells.find(k => !game.cells[k]) ?? cells[0], w.dir)
  }, [puzzle, game, select])

  // 단서 순서(가로 → 세로)로 이전/다음 단어
  const clueOrder = useMemo(() => {
    if (!puzzle) return []
    const idx = puzzle.words.map((_, i) => i)
    return [...idx.filter(i => puzzle.words[i].dir === 'across'), ...idx.filter(i => puzzle.words[i].dir === 'down')]
  }, [puzzle])
  const stepWord = (delta: number) => {
    const pos = clueOrder.indexOf(activeIdx)
    gotoWord(clueOrder[(pos + delta + clueOrder.length) % clueOrder.length])
  }

  const deleteBackward = () => {
    if (!puzzle || !game || cursor == null || !activeWord) return
    bufRef.current = null
    resetInput()
    const cells = wordCells(activeWord, puzzle.cols)
    let k = cursor
    if (!game.cells[k] || lockedSet.has(k)) {
      const i = cells.indexOf(k)
      if (i <= 0) return
      k = cells[i - 1]
      setCursor(k)
    }
    if (!lockedSet.has(k) && game.cells[k]) {
      setGame(g => (g ? { ...g, cells: g.cells.map((v, j) => (j === k ? '' : v)) } : g))
      setWrong(new Set())
    }
  }

  const processInput = () => {
    const el = inputRef.current
    if (!el || !puzzle || !game || game.solved || cursor == null || !activeWord) return
    const v = el.value
    if (!v.startsWith(SENTINEL)) {
      // 빈 버퍼에서 Backspace → 센티넬이 지워짐 (안드로이드 키보드는 keydown이 안 옴)
      if (!composingRef.current) deleteBackward()
      else resetInput()
      return
    }
    const raw = v.slice(SENTINEL.length)
    if (/[a-zA-Z]/.test(raw)) setMsg(t('msg.switchKorean'))
    const typed = toTyped(raw)
    if (!bufRef.current) {
      if (!typed) return
      const cells = wordCells(activeWord, puzzle.cols)
      const slots = cells.slice(Math.max(0, cells.indexOf(cursor))).filter(k => !lockedSet.has(k))
      if (!slots.length) { resetInput(); return }
      bufRef.current = { slots, base: slots.map(k => game.cells[k]), touched: 0 }
    }
    const buf = bufRef.current
    const { values, touched } = mapTyped(buf.base, typed, buf.touched)
    buf.touched = touched
    setGame(g => {
      if (!g) return g
      const cells = g.cells.slice()
      buf.slots.forEach((k, i) => { cells[k] = values[i] })
      return { ...g, cells }
    })
    if (wrong.size) setWrong(new Set())
    if (typed && msg) setMsg(null)
    setStarted(true)
    setCursor(buf.slots[cursorSlot(typed.length, buf.slots.length, composingRef.current)])
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229 || !puzzle || cursor == null) return
    const arrows: Record<string, [Dir, number]> = { ArrowLeft: ['across', -1], ArrowRight: ['across', 1], ArrowUp: ['down', -1], ArrowDown: ['down', 1] }
    if (arrows[e.key]) {
      e.preventDefault()
      const [d, step] = arrows[e.key]
      // 방향과 수직인 화살표: 먼저 방향만 바꿈
      if (d !== dir && widx && widx[d][cursor] >= 0) { commitBuffer(); setDir(d); return }
      let r = Math.floor(cursor / puzzle.cols)
      let c = cursor % puzzle.cols
      for (;;) {
        if (d === 'across') c += step; else r += step
        if (r < 0 || c < 0 || r >= puzzle.rows || c >= puzzle.cols) return
        if (puzzle.grid[r * puzzle.cols + c]) { select(r * puzzle.cols + c, d); return }
      }
    }
    if (e.key === 'Tab') { e.preventDefault(); stepWord(e.shiftKey ? -1 : 1); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(cursor); return }
    if (e.key === 'Delete') {
      e.preventDefault()
      if (!lockedSet.has(cursor)) setGame(g => (g ? { ...g, cells: g.cells.map((v, j) => (j === cursor ? '' : v)) } : g))
      commitBuffer()
      return
    }
    if (e.key === 'Escape') inputRef.current?.blur()
  }

  // ── 검사 / 공개 (각 1회 = 힌트 1회) ──
  const scope = (s: 'cell' | 'word' | 'all'): number[] => {
    if (!puzzle) return []
    if (s === 'cell') return cursor == null ? [] : [cursor]
    if (s === 'word') return activeWord ? wordCells(activeWord, puzzle.cols) : []
    return puzzle.grid.map((a, k) => (a ? k : -1)).filter(k => k >= 0)
  }
  const check = (s: 'cell' | 'word' | 'all') => {
    if (!puzzle || !game || game.solved) return
    commitBuffer()
    const ks = scope(s).filter(k => game.cells[k] && !lockedSet.has(k))
    if (!ks.length) { setMsg(t('msg.nothingToCheck')); return }
    const bad = ks.filter(k => game.cells[k] !== puzzle.grid[k])
    const good = ks.filter(k => game.cells[k] === puzzle.grid[k])
    setGame(g => (g ? { ...g, locked: [...g.locked, ...good], hints: g.hints + 1 } : g))
    setWrong(new Set(bad))
    setMsg(bad.length ? t('msg.wrongCount', { count: bad.length }) : t('msg.allCorrect'))
    if (bad.length) playInvalid()
    setStarted(true)
    inputRef.current?.focus({ preventScroll: true })
  }
  const reveal = (s: 'cell' | 'word') => {
    if (!puzzle || !game || game.solved) return
    commitBuffer()
    const ks = scope(s).filter(k => !lockedSet.has(k))
    if (!ks.length) return
    setGame(g => {
      if (!g) return g
      const cells = g.cells.slice()
      ks.forEach(k => { cells[k] = puzzle.grid[k] })
      return { ...g, cells, locked: [...g.locked, ...ks], hinted: [...g.hinted, ...ks], hints: g.hints + 1 }
    })
    setWrong(new Set())
    setMsg(null)
    setStarted(true)
    inputRef.current?.focus({ preventScroll: true })
  }
  const clearAll = () => {
    if (!game || game.solved) return
    commitBuffer()
    // 시간·힌트 수는 유지 (다시 시작으로 기록을 줄이지 못하게)
    setGame(g => (g ? { ...g, cells: g.cells.map(() => ''), locked: [], hinted: [] } : g))
    setWrong(new Set())
    setMsg(null)
    almostShown.current = false
  }

  // ── 완성 판정 ──
  useEffect(() => {
    if (!puzzle || !game || game.solved || game.key !== key) return
    const filled = puzzle.grid.every((a, k) => !a || game.cells[k])
    if (!filled) { almostShown.current = false; return }
    if (puzzle.grid.every((a, k) => !a || game.cells[k] === a)) {
      bufRef.current = null
      inputRef.current?.blur()
      setCursor(null)
      setMsg(null)
      setGame(g => (g ? { ...g, solved: true, locked: puzzle.grid.map((a, k) => (a ? k : -1)).filter(k => k >= 0) } : g))
      playWin()
      setConfetti(true)
      setTimeout(() => setConfetti(false), 3500)
      recordGameResult({ gameType: 'crossword', result: 'win', difficulty: 'normal', moves: game.hints })
      // 오늘의 퍼즐은 그날 첫 완성 기록만 저장
      if (mode?.kind === 'daily' && mode.n === today) {
        const all = readJSON<DailyResults>(RESULTS_KEY, {})
        if (!all[mode.n]) {
          all[mode.n] = { time: game.time, hints: game.hints }
          writeJSON(RESULTS_KEY, all)
          setResults(all)
        }
      }
    } else if (!almostShown.current && !composingRef.current) {
      almostShown.current = true
      setMsg(t('msg.almost'))
      playInvalid()
    }
  }, [game, puzzle, key, mode, today, playWin, playInvalid, recordGameResult, t])

  // ── 단서 목록 스크롤 동기화 (목록 안에서만, 페이지는 안 움직임) ──
  useEffect(() => {
    const el = clueRefs.current[activeIdx]
    const box = el?.parentElement
    if (!el || !box || box.scrollHeight <= box.clientHeight) return
    if (el.offsetTop < box.scrollTop || el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = el.offsetTop - box.clientHeight / 2
    }
  }, [activeIdx])

  // ── 퍼즐 선택 ──
  const changeMode = (v: string) => {
    commitBuffer()
    if (v === 'practice') {
      setMode({ kind: 'practice', seed: 1_000_000 + Math.floor(Math.random() * 1e9) })
      window.history.replaceState(null, '', window.location.pathname)
      return
    }
    const n = Number(v.slice(1))
    setMode({ kind: 'daily', n })
    window.history.replaceState(null, '', n === today ? window.location.pathname : `?n=${n}`)
  }
  const goToday = () => {
    const n = dailyNumber()
    setToday(n)
    setMode({ kind: 'daily', n })
    window.history.replaceState(null, '', window.location.pathname)
  }

  // ── 표시 ──
  const dur = (s: number) => (s >= 60 ? t('time.minSec', { m: Math.floor(s / 60), s: s % 60 }) : t('time.sec', { s }))
  const dateShort = (n: number) => { const [, m, d] = dailyDate(n).split('-').map(Number); return t('dateShort', { m, d }) }
  const stats = useMemo(() => computeStats(results, today ?? 0), [results, today])

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
      <p className="text-sm text-muted mt-1">{t('description')}</p>
    </div>
  )
  if (!puzzle || !game || !mode || today == null || game.key !== key) {
    return (
      <div className="space-y-6">
        {header}
        <div className="ui-card p-6 min-h-[420px]" aria-busy="true" />
      </div>
    )
  }

  const isDaily = mode.kind === 'daily'
  const recorded = isDaily ? results[mode.n] : undefined
  const shownTime = recorded?.time ?? game.time
  const shownHints = recorded?.hints ?? game.hints
  const hintText = shownHints ? t('share.hints', { count: shownHints }) : t('share.noHints')
  const shareText = (isDaily
    ? t('share.text', { n: mode.n, time: dur(shownTime), hints: hintText })
    : t('share.practiceText', { time: dur(shownTime), hints: hintText })) + '\n' + shapeGrid(puzzle, hintedSet)
  const shareUrl = isDaily ? `${SITE}?n=${mode.n}` : SITE

  const copyText = async () => {
    try { await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`) } catch { /* 권한 없음 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const across = puzzle.words.map((w, i) => ({ w, i })).filter(x => x.w.dir === 'across')
  const down = puzzle.words.map((w, i) => ({ w, i })).filter(x => x.w.dir === 'down')
  const numberAt = new Map(puzzle.words.map(w => [w.row * puzzle.cols + w.col, w.n]))
  const cr = cursor == null ? 0 : Math.floor(cursor / puzzle.cols)
  const cc = cursor == null ? 0 : cursor % puzzle.cols
  const keep = (e: React.MouseEvent) => e.preventDefault() // 버튼을 눌러도 입력 포커스(모바일 키보드) 유지
  const pastDays = Array.from({ length: Math.min(7, today) }, (_, i) => today - i)

  const clueList = (title: string, items: { w: typeof puzzle.words[number]; i: number }[]) => (
    <div className="ui-card p-4 sm:p-5">
      <h2 className="text-base font-bold text-fg mb-2">{title}</h2>
      <div className="relative space-y-1 lg:max-h-72 lg:overflow-y-auto">
        {items.map(({ w, i }) => {
          const active = i === activeIdx
          const done = wordCells(w, puzzle.cols).every(k => game.cells[k] && !isJamo(game.cells[k]))
          return (
            <button
              key={i}
              ref={el => { clueRefs.current[i] = el }}
              onMouseDown={keep}
              onClick={() => gotoWord(i)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex gap-2 ${
                active ? 'bg-primary-soft text-primary font-medium' : done ? 'text-faint hover:bg-soft' : 'text-body hover:bg-soft'}`}
            >
              <span className="font-bold tabular-nums w-5 shrink-0">{w.n}</span>
              <span>{w.clue} <span className="text-faint">({w.answer.length})</span></span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const btn = 'px-3 py-2 rounded-xl text-sm font-medium bg-soft text-body hover:bg-track transition-colors disabled:opacity-40'

  return (
    <>
      <GameConfetti active={confetti} />
      <div className="space-y-6">
        {header}

        {/* 상단 바: 퍼즐 번호·타이머·힌트·효과음·퍼즐 선택 */}
        <div className="ui-card p-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="font-bold text-fg">
            {isDaily ? t('dailyLabel', { n: mode.n }) : t('practice')}
            {isDaily && <span className="ml-2 text-sm font-normal text-muted">{dateShort(mode.n)}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-body tabular-nums" aria-label={t('timer')}>
            <Clock className="w-4 h-4 text-muted" /> {clock(shownTime)}
          </div>
          <div className="text-sm text-muted">{t('hintsUsed', { count: shownHints })}</div>
          <div className="flex-1" />
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-muted hover:bg-soft"
            aria-label={soundOn ? ts('disabled') : ts('enabled')}
            title={soundOn ? ts('disabled') : ts('enabled')}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <select
            value={isDaily ? `d${mode.n}` : 'practice'}
            onChange={e => changeMode(e.target.value)}
            className="ui-field w-auto max-w-full px-3 py-2 text-sm"
            aria-label={t('puzzle')}
          >
            {pastDays.map(n => (
              <option key={n} value={`d${n}`}>
                {n === today ? t('dailyLabel', { n }) : t('pastLabel', { n, date: dateShort(n) })}
                {results[n] ? ` · ${t('solvedMark')}` : ''}
              </option>
            ))}
            <option value="practice">{t('practice')}</option>
          </select>
          {!isDaily && (
            <button onClick={() => changeMode('practice')} className={`${btn} inline-flex items-center gap-1.5`}>
              <Shuffle className="w-4 h-4" /> {t('newPractice')}
            </button>
          )}
        </div>

        {/* 완성 결과 + 공유 */}
        {game.solved && (
          <div className="ui-card p-6">
            <p className="text-sm text-muted">{isDaily ? t('result.dailyTitle', { n: mode.n }) : t('result.title')}</p>
            <p className="text-3xl font-bold text-fg tabular-nums mt-1">{dur(shownTime)}</p>
            <p className="text-sm text-sub mt-1">
              {shownHints ? t('share.hints', { count: shownHints }) : t('result.noHints')}
              {isDaily && mode.n === today && stats.streak > 0 && <> · {t('result.streak', { count: stats.streak })}</>}
            </p>
            <pre className="mt-4 text-sm leading-tight font-sans" aria-hidden="true">{shapeGrid(puzzle, hintedSet)}</pre>
            <ShareResult
              className="mt-5"
              card={{
                tool: t('title'),
                label: isDaily ? t('share.cardLabel', { n: mode.n, date: dateShort(mode.n) }) : t('share.practiceLabel'),
                headline: dur(shownTime),
                sub: hintText,
                rows: [
                  { label: t('share.words'), value: t('share.wordsValue', { count: puzzle.words.length }) },
                  ...(isDaily && stats.streak ? [{ label: t('stats.streak'), value: t('stats.days', { count: stats.streak }) }] : []),
                ],
              }}
              text={shareText}
              url={shareUrl}
              fileName={`toolhub-crossword-${isDaily ? mode.n : 'practice'}`}
            />
            <button onClick={copyText} className={`${btn} mt-2 inline-flex items-center gap-1.5`}>
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              {copied ? t('result.copied') : t('result.copyText')}
            </button>
            <div className="mt-5 pt-5 border-t border-line flex flex-wrap items-center gap-3">
              <Countdown today={today} onNew={goToday} t={t} />
              <div className="flex-1" />
              {(!isDaily || mode.n !== today) && !results[today] ? (
                <button onClick={goToday} className="ui-btn px-4 py-2.5 text-sm">{t('result.playToday')}</button>
              ) : (
                <button onClick={() => changeMode('practice')} className={btn}>{t('result.tryPractice')}</button>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="ui-card p-4 sm:p-6">
              {/* 현재 단서 (모바일에선 키보드가 목록을 가리므로 여기서 이동) */}
              {activeWord && !game.solved && (
                <div className="mb-4 flex items-center gap-1 bg-primary-soft rounded-xl px-1 py-1">
                  <button onMouseDown={keep} onClick={() => stepWord(-1)} className="p-2 rounded-lg text-primary hover:bg-surface" aria-label={t('prevClue')}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-sm text-primary py-1" aria-live="polite">
                    <span className="font-bold mr-1.5">{activeWord.n}{activeWord.dir === 'across' ? t('acrossShort') : t('downShort')}</span>
                    {activeWord.clue} <span className="opacity-60">({activeWord.answer.length})</span>
                  </div>
                  <button onMouseDown={keep} onClick={() => stepWord(1)} className="p-2 rounded-lg text-primary hover:bg-surface" aria-label={t('nextClue')}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="relative mx-auto" style={{ maxWidth: puzzle.cols * 60 }}>
                <div
                  className="grid gap-px bg-line p-px rounded-xl border border-line-strong overflow-hidden select-none touch-manipulation"
                  style={{ gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))` }}
                  role="grid"
                  aria-label={t('title')}
                >
                  {puzzle.grid.map((ans, k) => {
                    if (!ans) return <div key={k} className="aspect-square bg-line-strong" aria-hidden="true" />
                    const sel = k === cursor
                    const inWord = activeCells.has(k)
                    const v = game.cells[k]
                    const num = numberAt.get(k)
                    return (
                      <div
                        key={k}
                        role="gridcell"
                        aria-label={`${num ? num + ' ' : ''}${v || t('emptyCell')}`}
                        aria-selected={sel}
                        onMouseDown={keep}
                        onClick={() => onCellClick(k)}
                        className={`relative aspect-square flex items-center justify-center cursor-pointer ${
                          sel ? 'bg-primary text-white' : inWord ? 'bg-primary-soft text-fg' : 'bg-surface text-fg'}`}
                      >
                        {num && <span className={`absolute top-0.5 left-1 text-[10px] leading-none ${sel ? 'text-white/80' : 'text-muted'}`}>{num}</span>}
                        {hintedSet.has(k) && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
                        <span className={`text-lg sm:text-2xl font-bold ${wrong.has(k) ? (sel ? 'line-through' : 'text-red-500 line-through') : ''} ${isJamo(v) ? 'opacity-60' : ''}`}>
                          {v}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {/* 한글 IME용 숨은 입력칸: 선택 칸 위에 겹쳐 둬서 모바일에서 화면이 튀지 않게 */}
                <input
                  ref={inputRef}
                  type="text"
                  lang="ko"
                  aria-label={t('inputLabel')}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  defaultValue={SENTINEL}
                  disabled={game.solved}
                  className="absolute opacity-0 pointer-events-none caret-transparent bg-transparent border-0 p-0"
                  style={{ left: `${(cc / puzzle.cols) * 100}%`, top: `${(cr / puzzle.rows) * 100}%`, width: `${100 / puzzle.cols}%`, height: `${100 / puzzle.rows}%`, fontSize: 16 }}
                  onCompositionStart={() => { composingRef.current = true }}
                  onCompositionEnd={() => { composingRef.current = false; processInput() }}
                  onInput={processInput}
                  onKeyDown={onKeyDown}
                  onBlur={() => { if (!composingRef.current) { bufRef.current = null; resetInput() } }}
                />
              </div>

              {!game.solved && (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onMouseDown={keep} onClick={() => check('cell')} disabled={cursor == null} className={btn}>{t('checkLetter')}</button>
                    <button onMouseDown={keep} onClick={() => check('word')} disabled={!activeWord} className={btn}>{t('checkWord')}</button>
                    <button onMouseDown={keep} onClick={() => check('all')} className={btn}>{t('checkAll')}</button>
                    <button onMouseDown={keep} onClick={() => reveal('cell')} disabled={cursor == null} className={btn}>{t('revealLetter')}</button>
                    <button onMouseDown={keep} onClick={() => reveal('word')} disabled={!activeWord} className={btn}>{t('revealWord')}</button>
                    <button onClick={clearAll} className={`${btn} inline-flex items-center gap-1.5`}>
                      <RotateCcw className="w-4 h-4" /> {t('reset')}
                    </button>
                  </div>
                  <p className="mt-3 min-h-5 text-sm text-sub" aria-live="polite">{msg}</p>
                  <p className="mt-1 text-xs text-muted">{t('hint')}</p>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {clueList(t('across'), across)}
            {down.length > 0 && clueList(t('down'), down)}
          </div>
        </div>

        {/* 내 기록 */}
        <div className="ui-card p-6">
          <h2 className="text-lg font-bold text-fg">{t('stats.title')}</h2>
          {stats.solved === 0 ? (
            <p className="mt-2 text-sm text-muted">{t('stats.empty')}</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-4">
              {[
                [t('stats.solved'), t('stats.count', { count: stats.solved })],
                [t('stats.streak'), t('stats.days', { count: stats.streak })],
                [t('stats.maxStreak'), t('stats.days', { count: stats.maxStreak })],
                [t('stats.best'), stats.best != null ? dur(stats.best) : '-'],
                [t('stats.avg'), stats.avg != null ? dur(stats.avg) : '-'],
                [t('stats.clean'), t('stats.count', { count: stats.clean })],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-muted">{label}</div>
                  <div className="text-lg font-bold text-fg tabular-nums mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          )}
          {/* 최근 7일 */}
          <div className="mt-5 flex gap-1.5">
            {[...pastDays].reverse().map(n => (
              <div key={n} className="flex-1 text-center">
                <div className={`h-2 rounded-full ${results[n] ? 'bg-primary' : 'bg-track'}`} />
                <div className="mt-1 text-[11px] text-muted tabular-nums">#{n}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">{t('stats.note')}</p>
        </div>

        <GameAchievements achievements={achievements} unlockedCount={unlockedCount} totalCount={totalCount} />

        <div className="ui-card p-6">
          <h2 className="text-lg font-bold text-fg mb-3">{t('guide.title')}</h2>
          <ul className="space-y-2 text-sm text-body list-disc pl-5">
            {((t.raw('guide.items') as string[] | undefined) ?? []).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      </div>
      <AchievementToast achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null} onDismiss={dismissNewAchievements} />
    </>
  )
}

function Countdown({ today, onNew, t }: { today: number; onNew: () => void; t: ReturnType<typeof useTranslations> }) {
  const [ms, setMs] = useState(() => msUntilNextDaily())
  const [rolled, setRolled] = useState(false)
  useEffect(() => {
    const id = setInterval(() => {
      setMs(msUntilNextDaily())
      if (dailyNumber() > today) setRolled(true)
    }, 1000)
    return () => clearInterval(id)
  }, [today])
  if (rolled) return <button onClick={onNew} className="ui-btn px-4 py-2.5 text-sm">{t('result.newReady')}</button>
  const s = Math.floor(ms / 1000)
  const hms = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(x => String(x).padStart(2, '0')).join(':')
  return (
    <div>
      <div className="text-xs text-muted">{t('result.nextIn')}</div>
      <div className="text-lg font-bold text-fg tabular-nums">{hms}</div>
    </div>
  )
}
