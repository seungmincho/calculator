'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/koreanWordle'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { useDialog } from '@/hooks/useDialog'
import { BarChart3, HelpCircle, Copy, Check, X, Delete, RotateCcw } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GameConfetti from '@/components/GameConfetti'
import ShareResult from '@/components/ShareResult'
import KoreanWordleHistory from '@/components/KoreanWordleHistory'
import KoreanWordleCopyRecovery from '@/components/KoreanWordleCopyRecovery'
import { MAX_GUESSES, KEY_ROWS, type WordLen, type Tile, type DailyRecords, type LegacyStats,
  compose, score, keyStatuses, statusOf, isSyllable, syllableKeys, dayNumber, msToNextDay, dailyAnswer, randomAnswer, computeStats, shareText, keyToJamo } from '@/utils/koreanWordle'
import { WORDLE_KEYS, readWordleStorage, appendDailyGuess, writeWordleSettings, type WordleRead, type WordleSettings, type WordleStorageError } from '@/utils/koreanWordleStorage'
import { projectRecentWordleDays } from '@/utils/koreanWordleHistory'
import { createWordleRoundController, createWordleCopyGuard, copyWordleText } from '@/utils/koreanWordleController'

type Mode = 'daily' | 'practice'
interface Game { answer: string; len: WordLen; guesses: string[]; hard: boolean }
const FLIP_STEP = 250, FLIP_MS = 500
const COLORS: Record<'normal' | 'contrast', Record<Tile, string>> = {
  normal: { correct: 'bg-green-600 text-white', present: 'bg-yellow-500 text-white', absent: 'bg-gray-500 text-white' },
  contrast: { correct: 'bg-orange-500 text-white', present: 'bg-sky-500 text-white', absent: 'bg-gray-500 text-white' },
}
const pad = (n: number) => String(n).padStart(2, '0')
const fmtCountdown = (ms: number) => { const seconds = Math.floor(ms / 1000); return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}` }

// Full-history work should not repeat for each countdown tick or typed jamo.
function useWordleSummary(records: DailyRecords, today: number, legacy: LegacyStats | null, mounted: boolean, title: string, contrast: boolean, url: string) {
  const stats = useMemo(() => computeStats(records, today, legacy), [records, today, legacy])
  const history = useMemo(() => mounted ? projectRecentWordleDays(records, today, { title, contrast, url }) : [], [mounted, records, today, title, contrast, url])
  return { stats, history }
}

export default function KoreanWordle() {
  const t = useTranslations('koreanWordle'), language = useOptionalLanguage()?.language ?? 'ko'
  const [mounted, setMounted] = useState(false), [now, setNow] = useState(0), [mode, setMode] = useState<Mode>('daily')
  const [records, setRecords] = useState<DailyRecords>({}), [legacy, setLegacy] = useState<LegacyStats | null>(null)
  const [practice, setPractice] = useState<Game | null>(null), [practiceLen, setPracticeLen] = useState<WordLen>(2), [practiceRun, setPracticeRun] = useState(0)
  const [keys, setKeys] = useState<string[]>([]), [hardSetting, setHardSetting] = useState(false), [contrast, setContrast] = useState(false)
  const [showHelp, setShowHelp] = useState(false), [showStats, setShowStats] = useState(false), [showNameModal, setShowNameModal] = useState(false)
  const [nameScore, setNameScore] = useState(0)
  const [toast, setToast] = useState<string | null>(null), [shake, setShake] = useState(false), [revealRow, setRevealRow] = useState(-1), [bounceRow, setBounceRow] = useState(-1), [celebrate, setCelebrate] = useState(false)
  const [dailyError, setDailyError] = useState<WordleStorageError | null>(null), [settingsError, setSettingsError] = useState<WordleStorageError | null>(null), [legacyError, setLegacyError] = useState(false)
  const [saving, setSaving] = useState(0), [savedOnce, setSavedOnce] = useState(false), [reloadConfirm, setReloadConfirm] = useState(false)
  const [recordsVersion, setRecordsVersion] = useState(0), [viewRevision, setViewRevision] = useState(0), [inputRevision, setInputRevision] = useState(0), [selectedHistory, setSelectedHistory] = useState<number | null>(null)
  const [copyState, setCopyState] = useState<{ token: number; id: number | 'current'; text: string; status: 'copying' | 'copied' | 'failed' } | null>(null), [copyOwner, setCopyOwner] = useState(''), [shareRevision, setShareRevision] = useState(0)
  const helpRef = useRef<HTMLDivElement>(null), statsRef = useRef<HTMLDivElement>(null)
  useDialog(showHelp, () => setShowHelp(false), helpRef); useDialog(showStats, () => setShowStats(false), statsRef)
  const lifetime = useRef<object | null>(null), roundOwner = useRef(createWordleRoundController()), copyGuard = useRef(createWordleCopyGuard()), copyContextRef = useRef('')
  const keysRef = useRef<string[]>([]), recordsRef = useRef<DailyRecords>({}), basis = useRef<WordleRead<DailyRecords>>({ ok: false, error: 'unavailable' }), settingsBasis = useRef<WordleRead<WordleSettings>>({ ok: false, error: 'unavailable' })
  const dailyBlocked = useRef(true), settingsBlocked = useRef(true), dirtyDays = useRef(new Set<number>()), saveGeneration = useRef(0), settingsGeneration = useRef(0), saveCount = useRef(0)
  const saveTail = useRef<Promise<void>>(Promise.resolve()), settingsTail = useRef<Promise<void>>(Promise.resolve()), storageAbort = useRef<AbortController | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null), startTime = useRef(0), nameRequest = useRef<{ id: number; moves: number; duration: number } | null>(null), nameSequence = useRef(0)
  const liveT = useRef(t)
  useLayoutEffect(() => { liveT.current = t }, [t])
  const leaderboard = useLeaderboard('koreanWordle', undefined)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const invalidateCopy = useCallback((clearContext = true) => {
    copyGuard.current.invalidate(); if (clearContext) copyContextRef.current = ''
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null; setCopyState(null)
  }, [])
  const setInput = useCallback((next: string[]) => { keysRef.current = next; setKeys(next); setInputRevision(value => value + 1); invalidateCopy() }, [invalidateCopy])
  const resetView = useCallback(() => {
    roundOwner.current.leave(); setViewRevision(value => value + 1); setInput([]); setShake(false); setRevealRow(-1); setBounceRow(-1); setCelebrate(false); setToast(null)
    nameRequest.current = null; setNameScore(0); setShowNameModal(false); setShowStats(false); setSelectedHistory(null); startTime.current = Date.now()
  }, [setInput])
  const commitRecords = useCallback((next: DailyRecords) => { recordsRef.current = next; setRecords(next); setRecordsVersion(value => value + 1) }, [])
  const newPractice = useCallback((len: WordLen) => { resetView(); setPractice({ answer: randomAnswer(len), len, guesses: [], hard: false }); setPracticeRun(value => value + 1) }, [resetView])
  useLayoutEffect(() => {
    const owner = {}, controller = createWordleRoundController(), guard = createWordleCopyGuard(), abort = new AbortController(), saves = saveGeneration, settingsWrites = settingsGeneration
    lifetime.current = owner; roundOwner.current = controller; copyGuard.current = guard; storageAbort.current = abort
    return () => { lifetime.current = null; controller.dispose(); guard.dispose(); abort.abort(); saves.current++; settingsWrites.current++; if (copyTimer.current !== null) clearTimeout(copyTimer.current) }
  }, [])
  useEffect(() => {
    const owner = lifetime.current; let active = true, clockDay = dayNumber(Date.now())
    queueMicrotask(() => {
      if (!active || lifetime.current !== owner) return
      const state = readWordleStorage(clockDay)
      basis.current = state.daily; dailyBlocked.current = !state.daily.ok; settingsBasis.current = state.settings; settingsBlocked.current = !state.settings.ok
      setDailyError(state.daily.ok ? null : state.daily.error); setSettingsError(state.settings.ok ? null : state.settings.error); setLegacyError(state.legacyReads.some(item => !item.result.ok))
      commitRecords(state.daily.ok ? state.daily.value : {}); setLegacy(state.legacy)
      if (state.settings.ok) { setHardSetting(state.settings.value.hard); setContrast(state.settings.value.contrast) }
      newPractice(2); setMounted(true); setNow(Date.now())
      if (state.daily.ok && !Object.keys(state.daily.value).length && !state.legacy) setShowHelp(true)
    })
    const interval = setInterval(() => { const time = Date.now(), day = dayNumber(time); if (day !== clockDay) { clockDay = day; resetView() }; setNow(time) }, 1000)
    const changed = (event: StorageEvent) => {
      if (event.key === null || event.key === WORDLE_KEYS.daily && event.newValue !== (basis.current.ok ? basis.current.raw : undefined)) { saveGeneration.current++; dailyBlocked.current = true; saveCount.current = 0; setSaving(0); setDailyError('conflict'); setSavedOnce(false) }
      if (event.key === null || event.key === WORDLE_KEYS.settings && event.newValue !== (settingsBasis.current.ok ? settingsBasis.current.raw : undefined)) { settingsGeneration.current++; settingsBlocked.current = true; setSettingsError('conflict') }
    }
    window.addEventListener('storage', changed)
    return () => { active = false; clearInterval(interval); window.removeEventListener('storage', changed) }
  }, [commitRecords, newPractice, resetView])
  const today = now ? dayNumber(now) : 0, daily = records[today]
  const game: Game | null = !mounted ? null : mode === 'daily'
    ? { answer: dailyAnswer(today), len: 2, guesses: daily?.guesses ?? [], hard: daily?.guesses.length ? !!daily.hard : hardSetting }
    : practice && { ...practice, hard: practice.guesses.length ? practice.hard : hardSetting }
  const len: WordLen = game?.len ?? 2, guesses = game?.guesses ?? [], status = game ? statusOf(guesses, game.answer) : 'playing'
  const settled = revealRow >= 0 ? 'playing' : status, input = compose(keys)
  const roundContext = JSON.stringify([mounted, mode, today, practiceRun, viewRevision, game?.hard])
  const roundDraft = useRef({ game, mode, today })
  useLayoutEffect(() => { roundDraft.current = { game, mode, today } })
  useLayoutEffect(() => {
    const draft = roundDraft.current
    if (!lifetime.current || !draft.game) return
    roundOwner.current.begin({ ...draft.game, mode: draft.mode, ...(draft.mode === 'daily' ? { day: draft.today } : {}), startedAt: startTime.current })
  }, [roundContext])
  const queueSave = (day: number, prefix: readonly string[], word: string, hard: boolean) => {
    if (dailyBlocked.current) return
    const owner = lifetime.current, generation = saveGeneration.current, abort = storageAbort.current
    const action = { day, prefix: [...prefix], guess: word, hard }
    saveCount.current++; setSaving(saveCount.current); setSavedOnce(false)
    saveTail.current = saveTail.current.then(async () => {
      const current = () => lifetime.current === owner && saveGeneration.current === generation && !dailyBlocked.current
      if (!current()) return
      const result = await appendDailyGuess(basis.current, action, Math.max(day, dayNumber(Date.now())), { current, signal: abort?.signal })
      if (!current()) return
      if (!result.ok) { dailyBlocked.current = true; setDailyError(result.error); return }
      basis.current = result.snapshot
      const local = recordsRef.current, stored = result.snapshot.value[day], own = local[day]
      if (own && stored && JSON.stringify(own.guesses) === JSON.stringify(stored.guesses) && !!own.hard === !!stored.hard) dirtyDays.current.delete(day)
      else if (result.alreadyApplied && stored.guesses.length > (own?.guesses.length ?? 0)) { dailyBlocked.current = true; setDailyError('conflict') }
      const next = { ...result.snapshot.value }; for (const dirty of dirtyDays.current) if (local[dirty]) next[dirty] = local[dirty]
      commitRecords(next); setSavedOnce(!dailyBlocked.current && dirtyDays.current.size === 0)
    }).finally(() => { if (lifetime.current === owner && saveGeneration.current === generation) { saveCount.current = Math.max(0, saveCount.current - 1); setSaving(saveCount.current) } })
  }
  const saveSettings = (hard: boolean, cb: boolean) => {
    invalidateCopy(); setHardSetting(hard); setContrast(cb)
    if (settingsBlocked.current) return
    const owner = lifetime.current, generation = settingsGeneration.current, values = { hard, contrast: cb }
    settingsTail.current = settingsTail.current.then(async () => {
      const current = () => lifetime.current === owner && settingsGeneration.current === generation && !settingsBlocked.current
      if (!current()) return
      const result = await writeWordleSettings(settingsBasis.current, values, { current, signal: storageAbort.current?.signal })
      if (!current()) return
      if (result.ok) settingsBasis.current = result.snapshot
      else { settingsBlocked.current = true; setSettingsError(result.error) }
    })
  }
  const reloadDaily = () => {
    saveGeneration.current++; saveTail.current = Promise.resolve(); saveCount.current = 0; setSaving(0); setReloadConfirm(false)
    const state = readWordleStorage(dayNumber(Date.now()))
    basis.current = state.daily; dailyBlocked.current = !state.daily.ok; setDailyError(state.daily.ok ? null : state.daily.error)
    if (!state.daily.ok) return
    dirtyDays.current.clear(); commitRecords(state.daily.value); setLegacy(state.legacy); setLegacyError(state.legacyReads.some(item => !item.result.ok)); setSavedOnce(false); resetView(); setNow(Date.now())
  }
  const reloadSettings = () => {
    settingsGeneration.current++; settingsTail.current = Promise.resolve()
    const state = readWordleStorage(dayNumber(Date.now())).settings; settingsBasis.current = state; settingsBlocked.current = !state.ok; setSettingsError(state.ok ? null : state.error)
    if (state.ok) { invalidateCopy(); setHardSetting(state.value.hard); setContrast(state.value.contrast) }
  }
  const showToast = (message: string, ms = 2000) => { setToast(message); roundOwner.current.later('toast', ms, () => setToast(null)) }
  const reject = (message: string) => { showToast(message); setShake(true); roundOwner.current.later('shake', 500, () => setShake(false)) }
  const submit = (time: number) => {
    if (!lifetime.current) return
    if (mode === 'daily' && dayNumber(time) !== today) { resetView(); setNow(time); return }
    const controller = roundOwner.current, before = controller.getSnapshot().round, accepted = controller.submit(compose(keysRef.current), time)
    if (!accepted.ok) { if (!['inactive', 'busy', 'ended'].includes(accepted.error)) reject(t(accepted.error === 'hardCorrect' ? 'hardModeCorrect' : accepted.error === 'hardPresent' ? 'hardModePresent' : accepted.error, { jamo: accepted.jamo ?? '' })); return }
    const completed = accepted.completion && controller.claimCompletion(accepted.completion)
    if (completed) recordGameResult({ gameType: 'koreanWordle', result: completed.status === 'won' ? 'win' : 'loss', difficulty: completed.round.mode === 'daily' ? 'daily' : completed.round.hard ? 'hard' : completed.round.len === 3 ? 'normal' : 'easy', moves: completed.round.guesses.length })
    if (accepted.round.mode === 'daily') {
      const day = accepted.round.day!; dirtyDays.current.add(day); commitRecords({ ...recordsRef.current, [day]: { guesses: [...accepted.round.guesses], hard: accepted.round.hard } })
      queueSave(day, before?.guesses ?? [], accepted.round.guesses.at(-1)!, accepted.round.hard)
    } else setPractice({ answer: accepted.round.answer, len: accepted.round.len, guesses: [...accepted.round.guesses], hard: accepted.round.hard })
    setInput([]); setRevealRow(accepted.row)
    controller.later('reveal', FLIP_STEP * (accepted.round.len - 1) + FLIP_MS, () => {
      if (!controller.finishReveal(accepted.reveal)) return
      setRevealRow(-1); if (!completed) return
      if (completed.status === 'won') {
        setBounceRow(accepted.row); controller.later('bounce', 1000, () => setBounceRow(-1)); setCelebrate(true); controller.later('celebrate', 3000, () => setCelebrate(false)); showToast(liveT.current(`winMessages.${accepted.row}`), 2500)
      } else showToast(accepted.round.answer, 4000)
      if (accepted.round.mode === 'daily') {
        if (completed.status === 'won' && leaderboard.checkQualifies(accepted.round.guesses.length)) { nameRequest.current = { id: ++nameSequence.current, moves: accepted.round.guesses.length, duration: completed.duration }; setNameScore(accepted.round.guesses.length); setShowNameModal(true) }
        leaderboard.fetchLeaderboard(); controller.later('stats', 1500, () => setShowStats(true))
      }
    })
  }
  const press = (key: string, time: number) => {
    const snapshot = roundOwner.current.getSnapshot(), current = snapshot.round
    if (key === 'Enter') { if (mode === 'practice' && current && !snapshot.revealing && statusOf([...current.guesses], current.answer) !== 'playing') newPractice(practiceLen); else submit(time); return }
    if (!current || snapshot.revealing || statusOf([...current.guesses], current.answer) !== 'playing') return
    if (key === 'Backspace') { setInput(keysRef.current.slice(0, -1)); return }
    const next = [...keysRef.current, key]; if ([...compose(next)].length <= current.len) setInput(next)
  }
  const pressRef = useRef(press)
  useLayoutEffect(() => { pressRef.current = press })
  const modalOpen = showHelp || showStats || showNameModal
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Escape') { setShowHelp(false); setShowStats(false); return }
      if (modalOpen) return
      const element = event.target as HTMLElement
      if (element.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'Enter') { if (element.tagName !== 'BUTTON') { event.preventDefault(); pressRef.current('Enter', Date.now()) }; return }
      if (event.key === 'Backspace') { event.preventDefault(); pressRef.current('Backspace', Date.now()); return }
      const jamo = keyToJamo(event.key, event.code, event.shiftKey); if (jamo) { event.preventDefault(); pressRef.current(jamo, Date.now()) }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])
  const switchMode = (value: Mode) => { if (value !== mode) { resetView(); setMode(value) } }
  const dailyDone = mode === 'daily' && settled !== 'playing', dailyStatus = mounted && !(mode === 'daily' && revealRow >= 0) ? statusOf(daily?.guesses ?? [], dailyAnswer(today)) : 'playing'
  const shareUrl = mounted ? `${window.location.origin}/korean-wordle/` : '', shareTitle = t('shareTitle')
  const dailyText = mounted && dailyStatus !== 'playing' ? shareText(shareTitle, today, daily!.guesses, dailyAnswer(today), { hard: !!daily!.hard, contrast, url: shareUrl }) : ''
  const { stats, history } = useWordleSummary(records, today, legacy, mounted, shareTitle, contrast, shareUrl)
  const colors = COLORS[contrast ? 'contrast' : 'normal'], keyMap = game ? keyStatuses(revealRow >= 0 ? guesses.slice(0, -1) : guesses, game.answer) : {}, maxDist = Math.max(1, ...stats.dist)
  const copyContext = JSON.stringify([mode, today, practiceRun, recordsVersion, viewRevision, inputRevision, language, hardSetting, contrast, showHelp, showStats, showNameModal, selectedHistory, shareTitle])
  if (copyOwner !== copyContext) { setCopyOwner(copyContext); setCopyState(null) }
  useLayoutEffect(() => { copyGuard.current.invalidate(); copyContextRef.current = copyContext; if (copyTimer.current !== null) clearTimeout(copyTimer.current); copyTimer.current = null }, [copyContext])
  const copyResult = async (text = dailyText, id: number | 'current' = 'current') => {
    if (!text || !lifetime.current || copyContextRef.current !== copyContext) return
    const owner = lifetime.current, guard = copyGuard.current, token = guard.begin(), current = () => lifetime.current === owner && copyGuard.current === guard && guard.current(token) && copyContextRef.current === copyContext
    setShareRevision(value => value + 1); if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    setCopyState({ id, token, text, status: 'copying' }); const result = await copyWordleText(text, current)
    if (!current() || result === 'stale') return
    setCopyState({ id, token, text, status: result }); if (result === 'copied') copyTimer.current = setTimeout(() => { if (current()) setCopyState(null) }, 2000)
  }
  const copied = copyState?.id === 'current' && copyState.status === 'copied'
  const recovery = copyState?.status === 'failed' ? <KoreanWordleCopyRecovery key={copyState.token} text={copyState.text} onRetry={() => { if (copyGuard.current.current(copyState.token)) void copyResult(copyState.text, copyState.id) }} onClose={() => invalidateCopy(false)} /> : null
  const handleLeaderboardSubmit = async (name: string) => {
    const request = nameRequest.current, owner = lifetime.current
    if (!request || !owner) return
    await leaderboard.submitScore(request.moves, name, request.duration)
    if (lifetime.current !== owner || nameRequest.current !== request) return
    leaderboard.savePlayerName(name); nameRequest.current = null; setShowNameModal(false)
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
        data-wordle-row={r}
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
    <div className="min-w-0 space-y-6" data-wordle-mode={mode} data-wordle-day={today} data-wordle-status={status} data-wordle-revealing={revealRow >= 0}>
      <GameConfetti active={celebrate} />

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button data-wordle-help="" onClick={() => setShowHelp(true)} aria-label={t('howToPlay')} title={t('howToPlay')} className="min-h-11 min-w-11 rounded-xl bg-soft p-2.5 text-body hover:bg-track">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button data-wordle-stats="" onClick={() => setShowStats(true)} aria-label={t('statistics')} title={t('statistics')} className="min-h-11 min-w-11 rounded-xl bg-soft p-2.5 text-body hover:bg-track">
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {mounted && <section data-wordle-storage="" className="min-w-0 space-y-3 rounded-2xl bg-subtle p-4 text-sm text-body">
        {saving > 0 && <p role="status" data-wordle-save="pending">{t('recordStorage.saving')}</p>}
        {savedOnce && !dailyError && saving === 0 && <p role="status" data-wordle-save="saved">{t('recordStorage.saved')}</p>}
        {dailyError && <><p data-wordle-daily-error={dailyError} role="status">{t('recordStorage.daily', { reason: t('recordStorage.errors.' + dailyError) })}</p><p>{t('recordStorage.memory')}</p></>}
        {settingsError && <p data-wordle-settings-error={settingsError} role="status">{t('recordStorage.settings', { reason: t('recordStorage.errors.' + settingsError) })}</p>}
        {legacyError && <p data-wordle-legacy-error="" role="status">{t('recordStorage.legacy')}</p>}
        <div className="flex flex-wrap gap-2"><button type="button" data-wordle-reload="" onClick={() => setReloadConfirm(true)} className="ui-btn-soft min-h-11 px-3 py-2">{t('recordStorage.reload')}</button>{settingsError && <button type="button" data-wordle-settings-reload="" onClick={reloadSettings} className="ui-btn-soft min-h-11 px-3 py-2">{t('recordStorage.reloadSettings')}</button>}</div>
        {reloadConfirm && <div className="space-y-2 border-t border-line pt-3"><p role="status">{t('recordStorage.confirm')}</p><div className="flex flex-wrap gap-2"><button type="button" data-wordle-confirm-reload="" onClick={reloadDaily} className="ui-btn min-h-11 px-3 py-2">{t('recordStorage.confirmReload')}</button><button type="button" data-wordle-cancel-reload="" onClick={() => setReloadConfirm(false)} className="ui-btn-soft min-h-11 px-3 py-2">{t('recordStorage.cancel')}</button></div></div>}
      </section>}
      {!showStats && recovery}
      {/* 모드 */}
      <div role="tablist" className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-2xl">
        {(['daily', 'practice'] as const).map(m => (
          <button
            key={m}
            role="tab"
            data-wordle-switch={m}
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
          <button key={n} data-wordle-length={n} onClick={e => { e.currentTarget.blur(); setPracticeLen(n); newPractice(n) }} className={chip(practiceLen === n)}>
            {t('practiceLen', { n })}
          </button>
        ))}
        <div className="flex gap-4 ml-auto text-sm text-body">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              data-wordle-setting="hard"
              checked={game?.hard ?? hardSetting}
              disabled={guesses.length > 0}
              title={guesses.length > 0 ? t('hardModeAfterStart') : undefined}
              onChange={e => saveSettings(e.target.checked, contrast)}
              className="accent-blue-500 w-4 h-4"
            />
            {t('hardMode')}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              data-wordle-setting="contrast"
              checked={contrast}
              onChange={e => saveSettings(hardSetting, e.target.checked)}
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
                <button data-wordle-copy="current" disabled={copyState?.id === 'current' && copyState.status === 'copying'} onClick={() => { void copyResult() }} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold ui-btn">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('shared') : t('copyResult')}
                </button>
              </div>
              <div data-wordle-share-boundary="" onClickCapture={() => invalidateCopy(false)}><ShareResult
                resultKey={JSON.stringify([copyContext, shareRevision])}
                url={shareUrl}
                text={dailyText.replace(/\n\n[^\n]*$/, '')}
                fileName={`korean-wordle-${today}`}
                card={{
                  tool: t('title'),
                  label: t('cardLabel', { day: today }),
                  headline: status === 'won' ? t('cardWon', { n: guesses.length, max: MAX_GUESSES }) : t('cardLost', { max: MAX_GUESSES }),
                  sub: t('cardStreak', { n: stats.current }),
                }}
              /></div>
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
            <button data-wordle-new-practice="" onClick={() => newPractice(practiceLen)} className="ui-btn px-4 py-3 rounded-xl w-full inline-flex items-center justify-center gap-2 font-semibold">
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
                <button data-wordle-key="Enter" onClick={e => { e.currentTarget.blur(); press('Enter', Date.now()) }} className="px-2 sm:px-4 h-12 rounded-lg text-sm font-bold bg-primary text-white">
                  {t('enter')}
                </button>
              )}
              {row.map(k => (
                <button
                  key={k}
                  data-wordle-key={k}
                  onClick={e => { e.currentTarget.blur(); press(k, Date.now()) }}
                  className={`flex-1 max-w-11 ${ri === 3 ? 'h-11' : 'h-12'} rounded-lg text-base font-bold transition-colors ${keyClass(k)}`}
                >
                  {k}
                </button>
              ))}
              {ri === 2 && (
                <button data-wordle-key="Backspace" onClick={e => { e.currentTarget.blur(); press('Backspace', Date.now()) }} aria-label={t('delete')} className="px-2 sm:px-4 h-12 rounded-lg bg-soft text-fg hover:bg-track flex items-center">
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
          <div ref={helpRef} role="dialog" aria-modal="true" aria-label={t('helpTitle')} className="bg-surface rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-fg">{t('helpTitle')}</h2>
              <button onClick={() => setShowHelp(false)} aria-label={t('close')} className="min-h-11 min-w-11 rounded-lg p-2 hover:bg-soft">
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
          <div ref={statsRef} role="dialog" aria-modal="true" aria-label={t('statistics')} className="bg-surface rounded-2xl shadow-xl max-w-sm w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-fg">{t('statistics')}</h2>
              <button onClick={() => setShowStats(false)} aria-label={t('close')} className="min-h-11 min-w-11 rounded-lg p-2 hover:bg-soft">
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
            {dailyError && <p className="mb-3 text-xs text-sub">{t('recordStorage.partial')}</p>}
            {recovery}
            <KoreanWordleHistory rows={history} selected={selectedHistory} onSelect={day => { invalidateCopy(); setSelectedHistory(day) }} onCopy={row => { if (row.text) void copyResult(row.text, row.day) }} copying={copyState?.status === 'copying' && typeof copyState.id === 'number' ? copyState.id : null} copied={copyState?.status === 'copied' && typeof copyState.id === 'number' ? copyState.id : null} />
            {dailyStatus !== 'playing' ? (
              <div className="space-y-3 border-t border-line pt-4">
                <p className="text-sm text-sub text-center">
                  {t('nextWord')} <span className="font-bold text-fg tabular-nums">{fmtCountdown(msToNextDay(now))}</span>
                </p>
                <button data-wordle-copy="current" disabled={copyState?.id === 'current' && copyState.status === 'copying'} onClick={() => { void copyResult() }} className="w-full inline-flex items-center justify-center gap-2 ui-btn px-4 py-3 rounded-xl font-semibold">
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
        onClose={() => { nameRequest.current = null; setShowNameModal(false) }}
        score={nameScore}
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
