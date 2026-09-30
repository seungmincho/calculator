'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Volume2, VolumeX, Copy, Check, RotateCcw, BarChart3, Delete, X } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GameConfetti from '@/components/GameConfetti'
import ShareResult from '@/components/ShareResult'
import {
  DAILY, type Play, type DailyRecords,
  score, allCandidates, filterCandidates, validateGuess, dailyAnswer, randomAnswer,
  status as playStatus, usedTries, computeStats, shareText, gridRow, cycleMemo, dayNumber, msToNextDay,
} from '@/utils/numberBaseball'

type Mode = 'daily' | 'practice'
const STORE = 'number-baseball-daily-v1'
const LENGTHS = [3, 4, 5] as const
const LIMITS = [0, 10, 7] as const // 0 = 무제한
const HINT_AFTER = 3
const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const ERR_KEY = { incomplete: 'errorIncomplete', duplicate: 'errorDuplicate', zero: 'errorZero', repeat: 'errorRepeat' } as const
const MEMO_MARK: Record<string, string> = { x: '❌', o: '⭕', '?': '❓' }

interface Practice { secret: string; len: number; allowZero: boolean; max: number; play: Play }
const EMPTY: Play = { guesses: [], peeks: [] }

function loadRecords(): DailyRecords {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}') } catch { return {} }
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const fmtCountdown = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`
}

export default function NumberBaseball() {
  const t = useTranslations('numberBaseball')
  const tSound = useTranslations('gameSounds')

  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<Mode>('daily')
  const [now, setNow] = useState(0)
  const [records, setRecords] = useState<DailyRecords>({})
  const [practice, setPractice] = useState<Practice | null>(null)
  const [input, setInput] = useState('')
  const [err, setErr] = useState<keyof typeof ERR_KEY | null>(null)
  const [shake, setShake] = useState(0)
  const [showCount, setShowCount] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [copied, setCopied] = useState(false)
  const statsRef = useRef<HTMLDialogElement>(null)
  const startRef = useRef(0)

  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const sounds = useGameSounds()

  const lbDifficulty = practice && !practice.allowZero && practice.len <= 4 ? `${practice.len}digit` : undefined
  const leaderboard = useLeaderboard('numberBaseball', lbDifficulty)
  const [showNameModal, setShowNameModal] = useState(false)

  const resetRound = () => { setInput(''); setErr(null); setShowCount(false); setCelebrate(false); startRef.current = Date.now() }

  const newPractice = useCallback((len: number, allowZero: boolean, max: number) => {
    setPractice({ secret: randomAnswer(len, allowZero), len, allowZero, max, play: EMPTY })
    resetRound()
  }, [])

  // 오늘의 숫자·기록은 클라이언트에서만 계산 (정답이 정적 HTML에 없고 hydration 불일치 없음)
  useEffect(() => {
    setMounted(true)
    setNow(Date.now())
    setRecords(loadRecords())
    newPractice(4, false, 0)
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [newPractice])

  const today = now ? dayNumber(now) : 0
  const game = !mounted || !today ? null
    : mode === 'daily'
      ? { secret: dailyAnswer(today), len: DAILY.len, allowZero: DAILY.allowZero, max: DAILY.max, play: records[today] ?? EMPTY }
      : practice

  const play = game?.play ?? EMPTY
  const status = game ? playStatus(game.secret, play, game.max) : 'playing'
  const used = usedTries(play)
  const history = useMemo(
    () => game ? play.guesses.map(g => ({ guess: g, ...score(game.secret, g) })) : [],
    [game?.secret, play.guesses], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const pool = useMemo(() => game ? allCandidates(game.len, game.allowZero) : [], [game?.len, game?.allowZero]) // eslint-disable-line react-hooks/exhaustive-deps
  const candidates = useMemo(() => filterCandidates(pool, history), [pool, history])

  const savePlay = useCallback((next: Play) => {
    if (mode === 'daily') {
      setRecords(prev => {
        const r = { ...prev, [today]: next }
        try { localStorage.setItem(STORE, JSON.stringify(r)) } catch { /* 저장 불가: 이번 세션만 */ }
        return r
      })
    } else {
      setPractice(p => p && { ...p, play: next })
    }
  }, [mode, today])

  const fail = (e: keyof typeof ERR_KEY) => { setErr(e); setShake(s => s + 1); sounds.playInvalid() }

  const typeDigit = useCallback((d: string) => {
    if (!game || status !== 'playing') return
    if (input.length >= game.len) return
    if (input.includes(d)) return fail('duplicate')
    if (d === '0' && !game.allowZero) return fail('zero')
    setErr(null)
    setInput(input + d)
  }, [game, status, input]) // eslint-disable-line react-hooks/exhaustive-deps

  const backspace = useCallback(() => { setErr(null); setInput(s => s.slice(0, -1)) }, [])

  const submit = useCallback(() => {
    if (!game || status !== 'playing') return
    const v = validateGuess(input, game.len, game.allowZero, play.guesses)
    if (v) return fail(v)
    const next = { ...play, guesses: [...play.guesses, input] }
    savePlay(next)
    setInput('')
    setErr(null)
    const st = playStatus(game.secret, next, game.max)
    if (st === 'playing') { sounds.playMove(); return }

    const tries = usedTries(next)
    if (st === 'won') { sounds.playWin(); setCelebrate(true) } else sounds.playLose()
    recordGameResult({
      gameType: 'numberbaseball',
      result: st === 'won' ? 'win' : 'loss',
      difficulty: mode === 'daily' ? 'daily' : (['easy', 'normal', 'hard'] as const)[game.len - 3],
      moves: tries,
    })
    if (mode === 'daily') setTimeout(() => statsRef.current?.showModal(), 1500)
    else if (st === 'won' && lbDifficulty && next.peeks.length === 0) {
      if (leaderboard.checkQualifies(tries)) setShowNameModal(true)
      leaderboard.fetchLeaderboard()
    }
  }, [game, status, input, play, savePlay, mode, sounds, recordGameResult, lbDifficulty, leaderboard]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    await leaderboard.submitScore(used, name, Date.now() - startRef.current)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, used])

  // 물리 키보드: 숫자 · Backspace · Enter
  const keysRef = useRef({ typeDigit, backspace, submit })
  keysRef.current = { typeDigit, backspace, submit }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, dialog, [contenteditable="true"]')) return
      if (/^\d$/.test(e.key)) { e.preventDefault(); keysRef.current.typeDigit(e.key) }
      else if (e.key === 'Backspace') { e.preventDefault(); keysRef.current.backspace() }
      // 숫자패드 버튼에 포커스가 있어도 Enter = 제출 (마지막 누른 숫자가 다시 입력되지 않게)
      else if (e.key === 'Enter' && (el.tagName !== 'BUTTON' || el.dataset.pad)) { e.preventDefault(); keysRef.current.submit() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const peek = () => {
    const pick = candidates.filter(c => !play.peeks.includes(c) && !play.guesses.includes(c))
    if (!pick.length) return
    savePlay({ ...play, peeks: [...play.peeks, pick[Math.floor(Math.random() * pick.length)]] })
  }
  const canPeek = status === 'playing' && (game?.max === 0 || (game ? game.max - used >= 2 : false))

  const stats = computeStats(records, today)
  const dailyDone = mode === 'daily' && status !== 'playing'
  const shareUrl = mounted ? `${window.location.origin}/number-baseball/` : ''
  const shareHeader = t('daily.shareTitle', { day: today })
    + ' ' + (status === 'won' ? t('daily.scoreWin', { n: used }) : t('daily.scoreLose'))
    + (play.peeks.length ? ` 💡${play.peeks.length}` : '')
  const resultText = game && dailyDone ? shareText(shareHeader, game.secret, play, shareUrl) : ''

  const copyResult = async () => {
    try { await navigator.clipboard.writeText(resultText) } catch {
      const ta = document.createElement('textarea')
      ta.value = resultText; ta.style.position = 'fixed'; ta.style.left = '-9999px'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const chip = (on: boolean) =>
    `px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`
  const memo = (play.memo ?? '').padEnd(10, ' ')
  const maxDist = Math.max(1, ...stats.dist, stats.losses)

  return (
    <div className="space-y-6">
      <GameConfetti active={celebrate} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        {mounted && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => statsRef.current?.showModal()}
              aria-label={t('stats.title')}
              title={t('stats.title')}
              className="p-2.5 rounded-xl bg-soft text-body hover:bg-track"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => sounds.setEnabled(!sounds.enabled)}
              aria-label={sounds.enabled ? tSound('enabled') : tSound('disabled')}
              title={sounds.enabled ? tSound('enabled') : tSound('disabled')}
              className="p-2.5 rounded-xl bg-soft text-body hover:bg-track"
            >
              {sounds.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      {/* 모드 */}
      <div role="tablist" className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-2xl">
        {(['daily', 'practice'] as const).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); resetRound() }}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === m ? 'bg-primary text-white' : 'text-body hover:bg-track'}`}
          >
            {m === 'daily' ? (today ? t('daily.tabWithDay', { day: today }) : t('daily.tab')) : t('practice.tab')}
          </button>
        ))}
      </div>

      {mode === 'practice' && practice && (
        <div className="ui-card p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-body mb-2">{t('digitCount')}</p>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map(n => (
                <button key={n} onClick={() => newPractice(n, practice.allowZero, practice.max)} className={chip(practice.len === n)} aria-pressed={practice.len === n}>
                  {t('practice.len', { n })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-body mb-2">{t('practice.digitsUsed')}</p>
            <div className="flex flex-wrap gap-2">
              {[false, true].map(z => (
                <button key={String(z)} onClick={() => newPractice(practice.len, z, practice.max)} className={chip(practice.allowZero === z)} aria-pressed={practice.allowZero === z}>
                  {t(z ? 'practice.withZero' : 'practice.noZero')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-body mb-2">{t('practice.limit')}</p>
            <div className="flex flex-wrap gap-2">
              {LIMITS.map(n => (
                <button key={n} onClick={() => newPractice(practice.len, practice.allowZero, n)} className={chip(practice.max === n)} aria-pressed={practice.max === n}>
                  {n ? t('practice.limitN', { n }) : t('practice.unlimited')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* 입력 · 숫자패드 */}
        <div className="lg:col-span-3 space-y-6">
          <div className="ui-card p-5 sm:p-6">
            <div className="flex items-center justify-between text-sm mb-5">
              <span className="px-3 py-1 rounded-full bg-subtle text-sub font-medium">
                {game ? t('ruleLine', { n: game.len, range: game.allowZero ? '0~9' : '1~9' }) : t('loading')}
              </span>
              <span className="text-muted">
                {game && game.max > 0 ? <>
                  {t('remainingTries')}{' '}
                  <b className={`tabular-nums text-base ${game.max - used <= 2 ? 'text-red-500' : 'text-fg'}`}>{game.max - used}</b> / {game.max}
                </> : <>{t('currentAttempts')} <b className="tabular-nums text-base text-fg">{used}</b></>}
              </span>
            </div>

            {/* 현재 입력 */}
            <div key={shake} className={`flex justify-center gap-2 sm:gap-3 ${shake ? 'shake-animation' : ''}`} aria-live="polite" aria-label={t('currentGuess')}>
              {Array.from({ length: game?.len ?? 4 }, (_, i) => (
                <div
                  key={i}
                  className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border-2 flex items-center justify-center text-3xl font-bold tabular-nums transition-colors ${
                    input[i] ? 'border-primary text-fg' : i === input.length && status === 'playing' ? 'border-line-strong bg-subtle' : 'border-line bg-subtle'
                  }`}
                >
                  {input[i] ?? ''}
                </div>
              ))}
            </div>
            <p className="h-5 mt-2 text-sm text-center text-red-500" role="alert">{err ? t(ERR_KEY[err]) : ''}</p>

            {status === 'playing' ? (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {PAD.map(d => {
                    const m = memo[Number(d)]
                    const off = !game || input.includes(d) || (d === '0' && !game.allowZero)
                    return (
                      <button
                        key={d}
                        onClick={() => typeDigit(d)}
                        disabled={off}
                        data-pad
                        aria-label={m !== ' ' ? `${d} ${t(`memo.${m === '?' ? 'maybe' : m}`)}` : d}
                        className={`relative h-14 rounded-xl text-2xl font-bold tabular-nums transition-colors select-none touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-35 ${
                          m === 'x' ? 'bg-soft text-faint line-through' : m === 'o' ? 'bg-primary-soft text-primary' : 'bg-soft text-fg hover:bg-track active:bg-track'
                        }`}
                      >
                        {d}
                        {m !== ' ' && <span className="absolute top-0.5 right-1 text-[10px] no-underline" aria-hidden>{MEMO_MARK[m]}</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  <button onClick={backspace} data-pad aria-label={t('backspace')} className="col-span-2 h-14 rounded-xl bg-soft text-body hover:bg-track inline-flex items-center justify-center">
                    <Delete className="w-6 h-6" />
                  </button>
                  <button onClick={submit} className="col-span-3 ui-btn h-14 text-lg">{t('submit')}</button>
                </div>
                <p className="hidden sm:block text-xs text-faint text-center pt-1">{t('keyboardHint')}</p>
              </div>
            ) : game && (
              <div className="mt-2 text-center space-y-1">
                <p className={`text-xl font-bold ${status === 'won' ? 'text-primary' : 'text-red-500'}`}>
                  {status === 'won' ? t('gameWonMessage', { attempts: used }) : t('lost')}
                </p>
                <p className="text-sm text-muted">{t('answer')}: <b className="text-fg tabular-nums tracking-widest">{game.secret}</b></p>
                {mode === 'practice' && practice && (
                  <button onClick={() => newPractice(practice.len, practice.allowZero, practice.max)} className="ui-btn px-5 py-3 mt-3 inline-flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> {t('newGame')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 메모장 */}
          {game && (
            <div className="ui-card p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-fg">{t('memo.title')}</h2>
                {play.memo?.trim() && (
                  <button onClick={() => savePlay({ ...play, memo: '' })} className="text-sm text-muted hover:text-body">{t('memo.clear')}</button>
                )}
              </div>
              <p className="text-xs text-muted mb-3">{t('memo.help')}</p>
              <div className="grid grid-cols-10 gap-1">
                {PAD.map(d => {
                  const m = memo[Number(d)]
                  const hidden = d === '0' && !game.allowZero
                  return (
                    <button
                      key={d}
                      onClick={() => savePlay({ ...play, memo: cycleMemo(play.memo, Number(d)) })}
                      disabled={hidden}
                      aria-label={`${d} ${m === ' ' ? t('memo.none') : t(`memo.${m === '?' ? 'maybe' : m}`)}`}
                      className={`h-14 rounded-lg flex flex-col items-center justify-center text-base font-bold tabular-nums transition-colors disabled:opacity-25 ${
                        m === 'o' ? 'bg-primary-soft text-primary' : m === 'x' ? 'bg-subtle text-faint' : 'bg-soft text-fg hover:bg-track'
                      }`}
                    >
                      {d}
                      <span className="text-xs h-4 leading-4" aria-hidden>{MEMO_MARK[m] ?? ''}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 기록 · 힌트 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-5">
            <h2 className="text-base font-semibold text-fg mb-3">{t('history')}</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">{t('historyEmpty')}</p>
            ) : (
              <ol className="space-y-1.5">
                {history.map((h, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-right text-faint tabular-nums">{i + 1}</span>
                    <span className="font-bold text-fg text-lg tracking-[0.3em] tabular-nums">{h.guess}</span>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-xs" aria-hidden>{gridRow(h, h.guess.length)}</span>
                      <b className={`w-14 text-right tabular-nums ${h.s === h.guess.length ? 'text-primary' : h.s + h.b === 0 ? 'text-muted' : 'text-fg'}`}>
                        {h.s + h.b === 0 ? t('outShort') : t('sbShort', { s: h.s, b: h.b })}
                      </b>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-faint mt-3">{t('legendLine')}</p>
          </div>

          {game && status === 'playing' && (
            <div className="ui-card p-5 space-y-3">
              <h2 className="text-base font-semibold text-fg">{t('hint')}</h2>
              {history.length < HINT_AFTER ? (
                <p className="text-sm text-muted">{t('hintAvailableAfter', { n: HINT_AFTER - history.length })}</p>
              ) : (
                <>
                  {showCount ? (
                    <p className="text-sm text-body">{t('candidates', { n: candidates.length.toLocaleString() })}</p>
                  ) : (
                    <button onClick={() => setShowCount(true)} className="ui-btn-soft w-full px-4 py-2 text-sm">{t('showCandidates')}</button>
                  )}
                  <button onClick={peek} disabled={!canPeek} className="ui-btn-soft w-full px-4 py-2 text-sm disabled:opacity-50">
                    {t('peek')}
                  </button>
                  <p className="text-xs text-muted">{t('peekNote')}</p>
                </>
              )}
              {play.peeks.length > 0 && (
                <div className="bg-subtle rounded-xl p-3 text-sm text-sub">
                  {t('peeked')}{' '}
                  {play.peeks.map(p => <b key={p} className="text-fg tabular-nums tracking-widest mr-2">{p}</b>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 오늘의 숫자야구 결과 · 공유 · 카운트다운 */}
      {dailyDone && game && (
        <div className="ui-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{t('daily.next')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums">{fmtCountdown(msToNextDay(now))}</p>
            </div>
            <button onClick={() => { setMode('practice'); resetRound() }} className="ui-btn-soft px-4 py-2 text-sm">{t('daily.goPractice')}</button>
          </div>
          <pre className="bg-subtle rounded-2xl p-4 text-sm text-body whitespace-pre-wrap break-all font-sans">{resultText}</pre>
          <button onClick={copyResult} className="w-full ui-btn px-4 py-3 inline-flex items-center justify-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? t('daily.copied') : t('daily.copyResult')}
          </button>
          <ShareResult
            url={shareUrl}
            text={resultText.replace(/\n[^\n]*$/, '')}
            fileName={`number-baseball-${today}`}
            card={{
              tool: t('title'),
              label: t('daily.cardLabel', { day: today }),
              headline: status === 'won' ? t('daily.cardWon', { n: used }) : t('daily.cardLost'),
              sub: t('daily.cardStreak', { n: stats.current }),
              rows: [
                { label: t('stats.played'), value: String(stats.played) },
                { label: t('stats.winRate'), value: `${stats.winRate}%` },
                { label: t('stats.maxStreak'), value: String(stats.maxStreak) },
              ],
            }}
          />
        </div>
      )}

      {/* 통계 모달 (오늘의 숫자야구) */}
      <dialog
        ref={statsRef}
        onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close() }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface text-fg p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">{t('stats.title')}</h2>
            <button onClick={() => statsRef.current?.close()} aria-label={t('close')} className="p-1.5 rounded-lg text-muted hover:bg-soft">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center mb-5">
            {([
              ['played', stats.played],
              ['winRate', `${stats.winRate}%`],
              ['current', stats.current],
              ['maxStreak', stats.maxStreak],
            ] as const).map(([k, v]) => (
              <div key={k}>
                <p className="text-2xl font-bold text-fg tabular-nums">{v}</p>
                <p className="text-xs text-muted mt-0.5">{t(`stats.${k}`)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm font-medium text-body mb-2">{t('stats.distribution')}</p>
          <div className="space-y-1.5">
            {[...stats.dist.map((n, k) => ({ label: String(k + 1), n, mine: dailyDone && status === 'won' && used === k + 1 })),
              { label: 'X', n: stats.losses, mine: dailyDone && status === 'lost' }].map(b => (
              <div key={b.label} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-right text-muted tabular-nums">{b.label}</span>
                <div className="flex-1">
                  <div
                    className={`h-6 rounded-md px-2 flex items-center justify-end text-xs font-semibold tabular-nums ${b.mine ? 'bg-primary text-white' : 'bg-track text-body'}`}
                    style={{ width: `${Math.max(8, (b.n / maxDist) * 100)}%` }}
                  >
                    {b.n}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {today > 0 && (
            <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
              <span className="text-sm text-muted">{t('daily.next')}</span>
              <span className="text-xl font-bold text-fg tabular-nums">{fmtCountdown(msToNextDay(now))}</span>
            </div>
          )}
          <p className="text-xs text-faint mt-3">{t('stats.distributionNote')}</p>
        </div>
      </dialog>

      <GameAchievements achievements={achievements} unlockedCount={unlockedCount} totalCount={totalCount} />

      {mode === 'practice' && <LeaderboardPanel leaderboard={leaderboard} />}
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={used}
        formatScore={leaderboard.config?.formatScore ?? ((s) => `${s}`)}
        defaultName={leaderboard.savedPlayerName}
      />

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <section>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.rules.title')}</h3>
          <ul className="space-y-1.5 list-disc list-inside text-sm text-sub">
            {(t.raw('guide.rules.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
            <li>{t('daily.about')}</li>
          </ul>
        </section>
        <section>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.example.title')}</h3>
          <div className="bg-subtle rounded-2xl p-4 text-sm space-y-1">
            {(t.raw('guide.example.items') as string[]).map((item, i) => <p key={i} className="text-sub">{item}</p>)}
          </div>
        </section>
        <section>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.tips.title')}</h3>
          <ul className="space-y-1.5 list-disc list-inside text-sm text-sub">
            {(t.raw('guide.tips.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>
        <section>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-body">{f.q}</p>
                <p className="text-sm text-sub mt-0.5">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AchievementToast achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null} onDismiss={dismissNewAchievements} />
    </div>
  )
}
