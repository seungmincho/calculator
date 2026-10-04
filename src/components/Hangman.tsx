'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Volume2, VolumeX, Copy, Check, RotateCcw } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gameSounds'
import '@/lib/i18n/ns/hangman'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import GameConfetti from '@/components/GameConfetti'
import ShareResult from '@/components/ShareResult'
import {
  CATEGORIES, KEY_ROWS, type Category, type DailyRecords,
  wordJamos, isRevealed, countWrong, gameStatus, dayNumber, msToNextDay,
  dailyWord, randomWord, computeStats, shareText, keyToJamo,
} from '@/utils/hangman'

const DAILY_MAX = 7
const LIVES = { easy: 9, normal: 7, hard: 5 } as const
type Difficulty = keyof typeof LIVES
type Mode = 'daily' | 'practice'
const STORE = 'hangman-daily-v1'

interface Game { word: string; category: Category; guesses: string[]; max: number }

function loadRecords(): DailyRecords {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}') } catch { return {} }
}

// ── SVG: 난이도와 무관하게 7단계로 그림 ────────────────────────────────────
function HangmanSVG({ stage, label }: { stage: number; label: string }) {
  const part = 'text-red-500'
  return (
    <svg viewBox="0 0 200 240" aria-label={label} role="img" className="w-28 sm:w-40 md:w-48 h-auto mx-auto">
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-body">
        <line x1="20" y1="230" x2="180" y2="230" />
        <line x1="60" y1="230" x2="60" y2="20" />
        <line x1="60" y1="20" x2="130" y2="20" />
        <line x1="130" y1="20" x2="130" y2="45" />
      </g>
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" className={part}>
        {stage >= 1 && <circle cx="130" cy="60" r="15" />}
        {stage >= 2 && <line x1="130" y1="75" x2="130" y2="145" />}
        {stage >= 3 && <line x1="130" y1="90" x2="105" y2="120" />}
        {stage >= 4 && <line x1="130" y1="90" x2="155" y2="120" />}
        {stage >= 5 && <line x1="130" y1="145" x2="105" y2="185" />}
        {stage >= 6 && <line x1="130" y1="145" x2="155" y2="185" />}
        {stage >= 7 && (
          <g strokeWidth="2">
            <path d="M123 54l4 4M127 54l-4 4M133 54l4 4M137 54l-4 4" />
            <path d="M122 66Q130 62 138 66" />
          </g>
        )}
      </g>
    </svg>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const fmtCountdown = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export default function Hangman() {
  const t = useTranslations('hangman')
  const tSound = useTranslations('gameSounds')

  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<Mode>('daily')
  const [now, setNow] = useState(0)
  const [records, setRecords] = useState<DailyRecords>({})
  const [practiceCat, setPracticeCat] = useState<Category | 'all'>('all')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [practice, setPractice] = useState<Game | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [copied, setCopied] = useState(false)

  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const sounds = useGameSounds()

  const newPractice = useCallback((cat: Category | 'all', diff: Difficulty) => {
    const w = randomWord(cat)
    setPractice({ word: w.word, category: w.category, guesses: [], max: LIVES[diff] })
    setCelebrate(false)
  }, [])

  // 오늘의 단어·기록은 클라이언트에서만 계산 (정답이 HTML에 들어가지 않고 hydration 불일치 없음)
  useEffect(() => {
    setMounted(true)
    setNow(Date.now())
    setRecords(loadRecords())
    newPractice('all', 'normal')
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [newPractice])

  const today = now ? dayNumber(now) : 0
  const daily = today ? dailyWord(today) : null
  const game: Game | null = !mounted ? null
    : mode === 'daily'
      ? daily && { word: daily.word, category: daily.category, guesses: records[today]?.guesses ?? [], max: DAILY_MAX }
      : practice

  const status = game ? gameStatus(game.word, game.guesses, game.max) : 'playing'
  const wrong = game ? countWrong(game.word, game.guesses) : 0
  const jamos = game ? wordJamos(game.word) : new Set<string>()
  const guessedSet = new Set(game?.guesses ?? [])

  const handleGuess = useCallback((jamo: string) => {
    if (!game || status !== 'playing' || game.guesses.includes(jamo)) return
    const guesses = [...game.guesses, jamo]
    const next = gameStatus(game.word, guesses, game.max)
    const w = countWrong(game.word, guesses)

    if (mode === 'daily') {
      setRecords(prev => {
        const r = { ...prev, [today]: { guesses, wrong: w, status: next } }
        try { localStorage.setItem(STORE, JSON.stringify(r)) } catch { /* 저장 불가: 이번 세션만 */ }
        return r
      })
    } else {
      setPractice({ ...game, guesses })
    }

    if (next === 'playing') {
      if (wordJamos(game.word).has(jamo)) sounds.playMove(); else sounds.playInvalid()
      return
    }
    if (next === 'won') { sounds.playWin(); setCelebrate(true) } else sounds.playLose()
    recordGameResult({
      gameType: 'hangman',
      result: next === 'won' ? 'win' : 'loss',
      difficulty: mode === 'daily' ? 'daily' : difficulty,
      moves: guesses.length,
    })
  }, [game, status, mode, today, difficulty, sounds, recordGameResult])

  // 물리 키보드: 한글 IME 켜짐/꺼짐 모두 두벌식으로 입력, Enter = 연습 모드 다음 단어
  const guessRef = useRef(handleGuess)
  guessRef.current = handleGuess
  const enterRef = useRef<() => void>(() => {})
  enterRef.current = () => { if (mode === 'practice' && status !== 'playing') newPractice(practiceCat, difficulty) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'Enter') { if (el.tagName !== 'BUTTON') enterRef.current(); return }
      const j = keyToJamo(e.key, e.code, e.shiftKey)
      if (j) { e.preventDefault(); guessRef.current(j) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const stats = computeStats(records, today, DAILY_MAX)
  const dailyDone = mode === 'daily' && status !== 'playing'
  const shareUrl = mounted ? `${window.location.origin}/hangman/` : ''
  const resultText = game && dailyDone
    ? shareText(t('daily.shareTitle', { day: today }), game.word, game.guesses, status === 'won', DAILY_MAX, shareUrl)
    : ''

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
  const stage = game ? Math.min(7, Math.ceil((wrong * 7) / game.max)) : 0
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
          <button
            onClick={() => sounds.setEnabled(!sounds.enabled)}
            aria-label={sounds.enabled ? tSound('enabled') : tSound('disabled')}
            title={sounds.enabled ? tSound('enabled') : tSound('disabled')}
            className="shrink-0 p-2.5 rounded-xl bg-soft text-body hover:bg-track"
          >
            {sounds.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* 모드 */}
      <div role="tablist" className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-2xl">
        {(['daily', 'practice'] as const).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setCelebrate(false) }}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === m ? 'bg-primary text-white' : 'text-body hover:bg-track'}`}
          >
            {m === 'daily' ? (today ? t('daily.tabWithDay', { day: today }) : t('daily.tab')) : t('practice.tab')}
          </button>
        ))}
      </div>

      {mode === 'practice' && (
        <div className="ui-card p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-body mb-2">{t('category')}</p>
            <div className="flex flex-wrap gap-2">
              {(['all', ...CATEGORIES] as const).map(c => (
                <button key={c} onClick={() => { setPracticeCat(c); newPractice(c, difficulty) }} className={chip(practiceCat === c)} aria-pressed={practiceCat === c}>
                  {t(`categories.${c}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-body mb-2">{t('practice.difficulty')}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LIVES) as Difficulty[]).map(d => (
                <button key={d} onClick={() => { setDifficulty(d); newPractice(practiceCat, d) }} className={chip(difficulty === d)} aria-pressed={difficulty === d}>
                  {t(`practice.levels.${d}`, { n: LIVES[d] })}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 게임 */}
      <div className="ui-card p-5 sm:p-6">
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="px-3 py-1 rounded-full bg-subtle text-sub font-medium">
            {game ? t('hintLine', { category: t(`categories.${game.category}`), n: [...game.word].length }) : t('loading')}
          </span>
          <span className="text-muted">
            {t('remainingTries')}{' '}
            <b className={`tabular-nums text-base ${game && game.max - wrong <= 2 ? 'text-red-500' : 'text-fg'}`}>{game ? game.max - wrong : '-'}</b>
            {game && <span> / {game.max}</span>}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          <HangmanSVG stage={stage} label={t('svgLabel', { wrong, max: game?.max ?? DAILY_MAX })} />
          <div className="flex-1 w-full">
            <div className="flex flex-wrap gap-2 justify-center min-h-14" aria-label={t('wordDisplay')} aria-live="polite">
              {game ? [...game.word].map((ch, i) => {
                const shown = isRevealed(ch, guessedSet)
                const missed = !shown && status === 'lost'
                return (
                  <div
                    key={i}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                      shown ? 'border-primary text-fg' : missed ? 'border-red-400 text-red-500' : 'border-line bg-subtle'
                    }`}
                    aria-label={shown || missed ? ch : t('unrevealed')}
                  >
                    {shown || missed ? ch : ''}
                  </div>
                )
              }) : Array.from({ length: 3 }, (_, i) => <div key={i} className="w-12 h-14 rounded-xl border-2 border-line bg-subtle" />)}
            </div>

            {status !== 'playing' && game && (
              <div className="mt-5 text-center space-y-1">
                <p className={`text-xl font-bold ${status === 'won' ? 'text-primary' : 'text-red-500'}`}>
                  {status === 'won' ? t('wonWithWrong', { wrong }) : t('lost')}
                </p>
                {status === 'lost' && <p className="text-sm text-muted">{t('answer')}: <b className="text-fg">{game.word}</b></p>}
                {mode === 'practice' && (
                  <button onClick={() => newPractice(practiceCat, difficulty)} className="ui-btn px-5 py-3 mt-3 inline-flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> {t('practice.next')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 오늘의 단어 결과 · 공유 · 카운트다운 */}
      {dailyDone && game && (
        <div className="ui-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">{t('daily.next')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums">{fmtCountdown(msToNextDay(now))}</p>
            </div>
            <button onClick={() => setMode('practice')} className="ui-btn-soft px-4 py-2 text-sm">{t('daily.goPractice')}</button>
          </div>
          <pre className="bg-subtle rounded-2xl p-4 text-sm text-body whitespace-pre-wrap break-all font-sans">{resultText}</pre>
          <button onClick={copyResult} className="w-full ui-btn px-4 py-3 inline-flex items-center justify-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? t('daily.copied') : t('daily.copyResult')}
          </button>
          <ShareResult
            url={shareUrl}
            text={resultText.replace(/\n[^\n]*$/, '')}
            fileName={`hangman-${today}`}
            card={{
              tool: t('title'),
              label: t('daily.cardLabel', { day: today }),
              headline: status === 'won' ? t('daily.cardWon', { wrong, max: DAILY_MAX }) : t('daily.cardLost'),
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

      {/* 화면 키보드 (두벌식) */}
      <div className="ui-card p-2 sm:p-4 space-y-1.5" aria-label={t('keyboard')}>
        {KEY_ROWS.map((row, r) => (
          <div key={r} className={`flex gap-1 sm:gap-1.5 justify-center ${r >= 3 ? 'pt-1' : ''}`}>
            {row.map(k => {
              const used = guessedSet.has(k)
              const hit = used && jamos.has(k)
              return (
                <button
                  key={k}
                  onClick={() => handleGuess(k)}
                  disabled={used || status !== 'playing' || !game}
                  aria-label={used ? t(hit ? 'keyHit' : 'keyMiss', { letter: k }) : k}
                  className={`flex-1 max-w-12 h-12 sm:h-13 rounded-lg text-lg font-bold transition-colors select-none touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    hit ? 'bg-primary text-white'
                      : used ? 'bg-track text-faint line-through'
                        : 'bg-soft text-fg hover:bg-track active:bg-track disabled:opacity-60'
                  }`}
                >
                  {k}
                </button>
              )
            })}
          </div>
        ))}
        <p className="hidden sm:block text-xs text-faint text-center pt-1">{t('keyboardHint')}</p>
      </div>

      {mode === 'practice' && status === 'playing' && game && (
        <div className="flex justify-center">
          <button onClick={() => newPractice(practiceCat, difficulty)} className="ui-btn-soft px-5 py-2 text-sm">{t('newGame')}</button>
        </div>
      )}

      {/* 오늘의 단어 통계 */}
      {mounted && mode === 'daily' && (
        <div className="ui-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">{t('stats.title')}</h2>
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
            {[...stats.dist.map((n, k) => ({ label: String(k), n, mine: dailyDone && status === 'won' && wrong === k })),
              { label: 'X', n: stats.losses, mine: dailyDone && status === 'lost' }].map(b => (
              <div key={b.label} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right text-muted tabular-nums">{b.label}</span>
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
          <p className="text-xs text-faint mt-3">{t('stats.distributionNote')}</p>
        </div>
      )}

      <GameAchievements achievements={achievements} unlockedCount={unlockedCount} totalCount={totalCount} />

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
