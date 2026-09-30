'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { BarChart3, HelpCircle, Copy, Check, X, Delete, RotateCcw } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GameConfetti from '@/components/GameConfetti'
import ShareResult from '@/components/ShareResult'
import {
  MAX_GUESSES, VALID, KEY_ROWS, type WordLen, type Tile, type DailyRecords, type LegacyStats,
  compose, score, keyStatuses, hardModeError, statusOf, isSyllable, syllableKeys,
  dayNumber, msToNextDay, dayFromDate, dailyAnswer, randomAnswer, computeStats, shareText, keyToJamo,
} from '@/utils/koreanWordle'

type Mode = 'daily' | 'practice'
interface Game { answer: string; len: WordLen; guesses: string[]; hard: boolean }

const STORE = 'koreanWordle-daily-v1'
const SETTINGS = 'koreanWordle-settings-v1'
const FLIP_STEP = 250 // 음절마다 뒤집기 지연(ms)
const FLIP_MS = 500

// 게임 고유 색(초록/노랑) + 색약 모드(주황/파랑). 라이트/다크 공통
const COLORS: Record<'normal' | 'contrast', Record<Tile, string>> = {
  normal: { correct: 'bg-green-600 text-white', present: 'bg-yellow-500 text-white', absent: 'bg-gray-500 text-white' },
  contrast: { correct: 'bg-orange-500 text-white', present: 'bg-sky-500 text-white', absent: 'bg-gray-500 text-white' },
}

function readJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
function writeJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 저장 불가: 이번 세션만 */ }
}

/** 구버전(날짜별 기록 없이 누적만 저장) 통계를 새 통계에 합산 */
function loadLegacy(): LegacyStats | null {
  for (const key of ['koreanWordle_stats_2', 'koreanWordle_stats']) {
    const s = readJSON<{ gamesPlayed?: number; gamesWon?: number; guessDistribution?: number[]; maxStreak?: number; currentStreak?: number; lastPlayedDate?: string } | null>(key, null)
    if (!s?.gamesPlayed) continue
    return {
      played: s.gamesPlayed,
      wins: s.gamesWon ?? 0,
      dist: Array.from({ length: MAX_GUESSES }, (_, i) => Number(s.guessDistribution?.[i]) || 0),
      maxStreak: s.maxStreak ?? 0,
      streak: s.currentStreak ?? 0,
      lastDay: s.lastPlayedDate ? dayFromDate(s.lastPlayedDate) : -1,
    }
  }
  return null
}

const pad = (n: number) => String(n).padStart(2, '0')
const fmtCountdown = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export default function KoreanWordle() {
  const t = useTranslations('koreanWordle')

  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(0)
  const [mode, setMode] = useState<Mode>('daily')
  const [records, setRecords] = useState<DailyRecords>({})
  const [legacy, setLegacy] = useState<LegacyStats | null>(null)
  const [practice, setPractice] = useState<Game | null>(null)
  const [practiceLen, setPracticeLen] = useState<WordLen>(2)
  const [keys, setKeys] = useState<string[]>([])
  const [hardSetting, setHardSetting] = useState(false)
  const [contrast, setContrast] = useState(false)

  const [showHelp, setShowHelp] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [revealRow, setRevealRow] = useState(-1)
  const [bounceRow, setBounceRow] = useState(-1)
  const [celebrate, setCelebrate] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTime = useRef(0)
  const leaderboard = useLeaderboard('koreanWordle', undefined)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()

  const newPractice = useCallback((len: WordLen) => {
    setPractice({ answer: randomAnswer(len), len, guesses: [], hard: false })
    setKeys([])
    setCelebrate(false)
    startTime.current = Date.now()
  }, [])

  // 오늘의 단어·기록은 마운트 후에만 계산 (정답이 정적 HTML에 없고 hydration 불일치 없음)
  useEffect(() => {
    setMounted(true)
    setNow(Date.now())
    const recs = readJSON<DailyRecords>(STORE, {})
    const leg = loadLegacy()
    setRecords(recs)
    setLegacy(leg)
    const s = readJSON<{ hard?: boolean; contrast?: boolean }>(SETTINGS, {})
    setHardSetting(!!s.hard)
    setContrast(!!s.contrast)
    newPractice(2)
    startTime.current = Date.now()
    if (!Object.keys(recs).length && !leg) setShowHelp(true)
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [newPractice])

  const saveSettings = (hard: boolean, cb: boolean) => writeJSON(SETTINGS, { hard, contrast: cb })

  const today = now ? dayNumber(now) : 0
  const daily = records[today]
  const game: Game | null = !mounted ? null
    : mode === 'daily'
      ? { answer: dailyAnswer(today), len: 2, guesses: daily?.guesses ?? [], hard: daily?.guesses.length ? !!daily.hard : hardSetting }
      : practice && { ...practice, hard: practice.guesses.length ? practice.hard : hardSetting }
  const len: WordLen = game?.len ?? 2
  const guesses = game?.guesses ?? []
  const status = game ? statusOf(guesses, game.answer) : 'playing'
  // 마지막 줄이 뒤집히는 동안에는 결과를 숨김 (스포일러 방지)
  const settled = revealRow >= 0 ? 'playing' : status
  const input = compose(keys)

  // 자정이 지나거나 모드가 바뀌면 입력 초기화
  useEffect(() => { setKeys([]) }, [today, mode])

  const showToast = useCallback((msg: string, ms = 2000) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }, [])

  const reject = (msg: string) => {
    showToast(msg)
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const submit = () => {
    if (!game || status !== 'playing' || revealRow >= 0) return
    const chars = [...input]
    if (chars.length < game.len) return reject(t('notEnoughLetters'))
    if (!chars.every(isSyllable)) return reject(t('needVowelHint'))
    if (!VALID[game.len].has(input)) return reject(t('notInList'))
    if (game.hard && guesses.length) {
      const err = hardModeError(guesses[guesses.length - 1], game.answer, input)
      if (err) return reject(t(err.kind === 'correct' ? 'hardModeCorrect' : 'hardModePresent', { jamo: err.jamo }))
    }

    const next = [...guesses, input]
    if (mode === 'daily') {
      setRecords(prev => {
        const r = { ...prev, [today]: { guesses: next, hard: game.hard } }
        writeJSON(STORE, r)
        return r
      })
    } else {
      setPractice({ ...game, guesses: next })
    }
    setKeys([])

    const row = next.length - 1
    setRevealRow(row)
    setTimeout(() => {
      setRevealRow(-1)
      const st = statusOf(next, game.answer)
      if (st === 'playing') return
      if (st === 'won') {
        setBounceRow(row)
        setTimeout(() => setBounceRow(-1), 1000)
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 3000)
        showToast(t(`winMessages.${row}`), 2500)
      } else {
        showToast(game.answer, 4000)
      }
      recordGameResult({
        gameType: 'koreanWordle',
        result: st === 'won' ? 'win' : 'loss',
        difficulty: mode === 'daily' ? 'daily' : game.hard ? 'hard' : game.len === 3 ? 'normal' : 'easy',
        moves: next.length,
      })
      if (mode === 'daily') {
        if (st === 'won' && leaderboard.checkQualifies(next.length)) setShowNameModal(true)
        leaderboard.fetchLeaderboard()
        setTimeout(() => setShowStats(true), 1500)
      }
    }, FLIP_STEP * (game.len - 1) + FLIP_MS)
  }

  const press = (k: string) => {
    if (k === 'Enter') {
      if (mode === 'practice' && settled !== 'playing') newPractice(practiceLen)
      else submit()
      return
    }
    if (!game || status !== 'playing' || revealRow >= 0) return
    if (k === 'Backspace') { setKeys(p => p.slice(0, -1)); return }
    const nextKeys = [...keys, k]
    if ([...compose(nextKeys)].length > game.len) return
    setKeys(nextKeys)
  }

  // 물리 키보드: 한글 IME 켜짐/꺼짐 모두 두벌식으로 입력
  const pressRef = useRef(press)
  pressRef.current = press
  const modalOpen = showHelp || showStats || showNameModal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') { setShowHelp(false); setShowStats(false); return }
      if (modalOpen) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'Enter') { if (el.tagName !== 'BUTTON') { e.preventDefault(); pressRef.current('Enter') } return }
      if (e.key === 'Backspace') { e.preventDefault(); pressRef.current('Backspace'); return }
      const j = keyToJamo(e.key, e.code, e.shiftKey)
      if (j) { e.preventDefault(); pressRef.current(j) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  const switchMode = (m: Mode) => { setMode(m); setShake(false); setRevealRow(-1) }

  // ── 파생 값 ──
  const stats = computeStats(records, today, legacy)
  const dailyDone = mode === 'daily' && settled !== 'playing'
  const dailyStatus = mounted && !(mode === 'daily' && revealRow >= 0) ? statusOf(daily?.guesses ?? [], dailyAnswer(today)) : 'playing'
  const shareUrl = mounted ? `${window.location.origin}/korean-wordle/` : ''
  const shareTitle = t('shareTitle')
  const dailyText = mounted && dailyStatus !== 'playing'
    ? shareText(shareTitle, today, daily!.guesses, dailyAnswer(today), { hard: !!daily!.hard, contrast, url: shareUrl })
    : ''
  const colors = COLORS[contrast ? 'contrast' : 'normal']
  const keyMap = game ? keyStatuses(revealRow >= 0 ? guesses.slice(0, -1) : guesses, game.answer) : {}
  const maxDist = Math.max(1, ...stats.dist)

  const copyResult = async () => {
    try { await navigator.clipboard.writeText(dailyText) } catch {
      const ta = document.createElement('textarea')
      ta.value = dailyText; ta.style.position = 'fixed'; ta.style.left = '-9999px'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeaderboardSubmit = async (name: string) => {
    await leaderboard.submitScore(guesses.length, name, Date.now() - startTime.current)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }

  // ── 렌더 조각 ──
  const tileSize = len === 2 ? 'w-16 h-16 sm:w-20 sm:h-20 text-3xl' : 'w-14 h-14 sm:w-16 sm:h-16 text-2xl'
  const chip = (on: boolean) =>
    `px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`

  const renderRow = (r: number) => {
    const guessed = r < guesses.length
    const current = r === guesses.length && status === 'playing'
    const word = guessed ? guesses[r] : current ? input : ''
    const chars = [...word]
    const sc = guessed && game ? score(word, game.answer) : null
    const revealing = r === revealRow
    return (
      <div
        key={r}
        className={`flex justify-center gap-3 ${current && shake ? 'kw-shake' : ''} ${r === bounceRow ? 'kw-bounce' : ''}`}
      >
        {Array.from({ length: len }, (_, si) => {
          const ch = chars[si] ?? ''
          const jamos = ch ? (isSyllable(ch) ? syllableKeys(ch) : [ch]) : []
          const exact = !!sc && sc[si].every(s => s === 'correct')
          const incomplete = current && !!ch && !isSyllable(ch)
          const tile = sc
            ? exact ? colors.correct : 'bg-surface border-2 border-line-strong text-fg'
            : ch ? `bg-surface border-2 ${incomplete ? 'border-amber-500' : 'border-sub'} text-fg` : 'bg-surface border-2 border-line'
          const anim = revealing ? { animationDelay: `${si * FLIP_STEP}ms` } : undefined
          return (
            <div key={si} className="flex flex-col items-center gap-1">
              <div className={`${tileSize} ${tile} ${revealing ? 'kw-flip' : ''} flex items-center justify-center rounded-xl font-bold`} style={anim}>
                {ch}
              </div>
              <div className="flex gap-0.5 h-6">
                {jamos.map((j, ji) => (
                  <span
                    key={ji}
                    className={`w-5 h-6 sm:w-6 flex items-center justify-center rounded text-xs font-bold ${sc ? colors[sc[si][ji]] : 'bg-soft text-muted'} ${revealing ? 'kw-flip' : ''}`}
                    style={anim}
                  >
                    {j}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const keyClass = (k: string) => {
    const s = keyMap[k]
    return s ? colors[s] : 'bg-soft text-fg hover:bg-track'
  }

  return (
    <div className="space-y-6">
      <GameConfetti active={celebrate} />

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowHelp(true)} aria-label={t('howToPlay')} title={t('howToPlay')} className="p-2.5 rounded-xl bg-soft text-body hover:bg-track">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button onClick={() => setShowStats(true)} aria-label={t('statistics')} title={t('statistics')} className="p-2.5 rounded-xl bg-soft text-body hover:bg-track">
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 모드 */}
      <div role="tablist" className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-2xl">
        {(['daily', 'practice'] as const).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={e => { e.currentTarget.blur(); switchMode(m) }}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === m ? 'bg-primary text-white' : 'text-body hover:bg-track'}`}
          >
            {m === 'daily' ? (today ? t('dailyLabel', { day: today }) : t('modeDaily')) : t('modePractice')}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {mode === 'practice' && ([2, 3] as WordLen[]).map(n => (
          <button key={n} onClick={e => { e.currentTarget.blur(); setPracticeLen(n); newPractice(n) }} className={chip(practiceLen === n)}>
            {t('practiceLen', { n })}
          </button>
        ))}
        <div className="flex gap-4 ml-auto text-sm text-body">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={game?.hard ?? hardSetting}
              disabled={guesses.length > 0}
              title={guesses.length > 0 ? t('hardModeAfterStart') : undefined}
              onChange={e => { setHardSetting(e.target.checked); saveSettings(e.target.checked, contrast) }}
              className="accent-blue-500 w-4 h-4"
            />
            {t('hardMode')}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={contrast}
              onChange={e => { setContrast(e.target.checked); saveSettings(hardSetting, e.target.checked) }}
              className="accent-blue-500 w-4 h-4"
            />
            {t('colorblind')}
          </label>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div role="status" className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-fg text-canvas px-5 py-3 rounded-xl shadow-lg font-semibold text-sm">
          {toast}
        </div>
      )}

      {/* 보드 */}
      <div className="ui-card p-4 sm:p-6">
        <div className="flex flex-col gap-2" aria-label={t('title')}>
          {Array.from({ length: MAX_GUESSES }, (_, r) => renderRow(r))}
        </div>
        {status === 'playing' && [...input].some(ch => !isSyllable(ch)) && (
          <p className="text-center text-sm text-muted mt-3">{t('needVowelHint')}</p>
        )}
      </div>

      {/* 결과 */}
      {game && settled !== 'playing' && (
        <div className="ui-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg">{status === 'won' ? t('resultWon') : t('resultLost')}</h2>
            <span className="text-3xl font-bold text-fg tabular-nums">
              {status === 'won' ? guesses.length : 'X'}/{MAX_GUESSES}{game.hard ? '*' : ''}
            </span>
          </div>
          {status === 'lost' && (
            <p className="text-sm text-sub">{t('answerWas')} <span className="font-bold text-fg text-base">{game.answer}</span></p>
          )}

          {dailyDone ? (
            <>
              <pre className="font-sans text-base leading-relaxed bg-subtle rounded-2xl p-4 text-center whitespace-pre-wrap">{dailyText}</pre>
              {stats.current >= 2 && <p className="text-sm text-sub text-center">{t('streakContinued', { count: stats.current })}</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={copyResult} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold ui-btn">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('shared') : t('copyResult')}
                </button>
              </div>
              <ShareResult
                url={shareUrl}
                text={dailyText.replace(/\n\n[^\n]*$/, '')}
                fileName={`korean-wordle-${today}`}
                card={{
                  tool: t('title'),
                  label: t('cardLabel', { day: today }),
                  headline: status === 'won' ? t('cardWon', { n: guesses.length, max: MAX_GUESSES }) : t('cardLost', { max: MAX_GUESSES }),
                  sub: t('cardStreak', { n: stats.current }),
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
                <p className="text-sm text-sub">
                  {t('nextWord')} <span className="font-bold text-fg tabular-nums">{fmtCountdown(msToNextDay(now))}</span>
                </p>
                <button onClick={() => switchMode('practice')} className="ui-btn-soft px-4 py-2 rounded-xl text-sm font-semibold">
                  {t('playPractice')}
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => newPractice(practiceLen)} className="ui-btn px-4 py-3 rounded-xl w-full inline-flex items-center justify-center gap-2 font-semibold">
              <RotateCcw className="w-4 h-4" /> {t('newGame')}
            </button>
          )}
        </div>
      )}

      {/* 화면 키보드 (두벌식) */}
      <div className="ui-card p-2 sm:p-4 select-none">
        <div className="flex flex-col items-center gap-1.5">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 sm:gap-1.5 w-full justify-center">
              {ri === 2 && (
                <button onClick={e => { e.currentTarget.blur(); press('Enter') }} className="px-2 sm:px-4 h-12 rounded-lg text-sm font-bold bg-primary text-white">
                  {t('enter')}
                </button>
              )}
              {row.map(k => (
                <button
                  key={k}
                  onClick={e => { e.currentTarget.blur(); press(k) }}
                  className={`flex-1 max-w-11 ${ri === 3 ? 'h-10' : 'h-12'} rounded-lg text-base font-bold transition-colors ${keyClass(k)}`}
                >
                  {k}
                </button>
              ))}
              {ri === 2 && (
                <button onClick={e => { e.currentTarget.blur(); press('Backspace') }} aria-label={t('delete')} className="px-2 sm:px-4 h-12 rounded-lg bg-soft text-fg hover:bg-track flex items-center">
                  <Delete className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 게임 방법 */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowHelp(false)}>
          <div role="dialog" aria-modal="true" aria-label={t('helpTitle')} className="bg-surface rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-fg">{t('helpTitle')}</h2>
              <button onClick={() => setShowHelp(false)} aria-label={t('close')} className="p-1 rounded-lg hover:bg-soft">
                <X className="w-5 h-5 text-sub" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-body">
              <p>{t('helpDesc')}</p>
              <div className="space-y-2">
                <h3 className="font-semibold text-fg">{t('helpExampleTitle')}</h3>
                {(['correct', 'present', 'absent'] as Tile[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold ${colors[s]}`}>{['ㄱ', 'ㅏ', 'ㅎ'][i]}</span>
                    <span>{t(s === 'correct' ? 'helpCorrect' : s === 'present' ? 'helpPresent' : 'helpAbsent')}</span>
                  </div>
                ))}
              </div>
              <div className="bg-subtle rounded-2xl p-4 space-y-1">
                <p className="font-semibold text-fg">{t('helpJamoTitle')}</p>
                <p className="text-sub">{t('helpJamo')}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4 space-y-1">
                <p className="font-semibold text-fg">{t('helpInputTitle')}</p>
                <p className="text-sub">{t('helpInputDesc')}</p>
              </div>
              <p className="text-muted text-xs">{t('helpKeyboard')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 통계 */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowStats(false)}>
          <div role="dialog" aria-modal="true" aria-label={t('statistics')} className="bg-surface rounded-2xl shadow-xl max-w-sm w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-fg">{t('statistics')}</h2>
              <button onClick={() => setShowStats(false)} aria-label={t('close')} className="p-1 rounded-lg hover:bg-soft">
                <X className="w-5 h-5 text-sub" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6 text-center">
              {([
                [stats.played, t('played')],
                [stats.winRate, t('winRate')],
                [stats.current, t('currentStreak')],
                [stats.maxStreak, t('maxStreak')],
              ] as const).map(([v, label]) => (
                <div key={label}>
                  <div className="text-2xl font-bold text-fg tabular-nums">{v}</div>
                  <div className="text-xs text-muted">{label}</div>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-fg mb-3">{t('guessDistribution')}</h3>
            <div className="space-y-1.5 mb-4">
              {stats.dist.map((count, i) => {
                const mine = dailyStatus === 'won' && daily?.guesses.length === i + 1
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-sub w-3 tabular-nums">{i + 1}</span>
                    <div
                      className={`h-5 rounded flex items-center justify-end px-1.5 text-xs font-bold ${mine ? colors.correct : 'bg-track text-body'}`}
                      style={{ width: `${Math.max(8, (count / maxDist) * 100)}%` }}
                    >
                      {count}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted mb-4">{t('statsDailyOnly')}</p>
            {dailyStatus !== 'playing' ? (
              <div className="space-y-3 border-t border-line pt-4">
                <p className="text-sm text-sub text-center">
                  {t('nextWord')} <span className="font-bold text-fg tabular-nums">{fmtCountdown(msToNextDay(now))}</span>
                </p>
                <button onClick={copyResult} className="w-full inline-flex items-center justify-center gap-2 ui-btn px-4 py-3 rounded-xl font-semibold">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('shared') : t('copyResult')}
                </button>
              </div>
            ) : mode === 'practice' && (
              <button onClick={() => { setShowStats(false); switchMode('daily') }} className="w-full ui-btn-soft px-4 py-2.5 rounded-xl text-sm font-semibold">
                {t('playDaily')}
              </button>
            )}
          </div>
        </div>
      )}

      <LeaderboardPanel leaderboard={leaderboard} />
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={guesses.length}
        formatScore={leaderboard.config?.formatScore ?? ((s) => `${s}/${MAX_GUESSES}`)}
        defaultName={leaderboard.savedPlayerName}
      />
      <GameAchievements achievements={achievements} unlockedCount={unlockedCount} totalCount={totalCount} />

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-4">{t('guide.title')}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {(['rules', 'tips'] as const).map(sec => (
            <div key={sec} className="bg-subtle rounded-2xl p-5">
              <h3 className="font-semibold text-fg mb-2">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-1.5 text-sm text-sub list-disc pl-4">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes kw-shake { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-6px) } 40%,80% { transform: translateX(6px) } }
        .kw-shake { animation: kw-shake .4s ease-in-out }
        @keyframes kw-flip { 0% { transform: rotateX(90deg) } 100% { transform: rotateX(0) } }
        .kw-flip { animation: kw-flip ${FLIP_MS}ms ease-out both }
        @keyframes kw-bounce { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-14px) } 70% { transform: translateY(3px) } }
        .kw-bounce { animation: kw-bounce .8s ease }
        @media (prefers-reduced-motion: reduce) { .kw-shake, .kw-flip, .kw-bounce { animation: none } }
      `}</style>
      <AchievementToast achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null} onDismiss={dismissNewAchievements} />
    </div>
  )
}
