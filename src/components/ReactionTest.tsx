'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { RotateCcw, Trash2 } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'
import ShareResult from '@/components/ShareResult'
import { useSearchParams } from '@/hooks/useSearchParams'
import {
  ROUNDS, MIN_VALID_MS, topPercent, tierOf, summarize, outlierIdx, sanitizeHistory, parseVs,
  type Summary, type Device, type HistoryEntry,
} from '@/utils/reaction'

type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'early' | 'complete'
interface Round { ms: number; dev: Device }
interface SessionResult { s: Summary; times: number[]; dev: Device; pb: boolean; falseStarts: number }

const STORAGE_KEY = 'toolhub-reaction-history'
/** 결과 직후 실수로 연타해 다음 라운드가 바로 '너무 빨라요'가 되는 걸 막는 잠금 */
const LOCK_MS = 350

export default function ReactionTest() {
  const t = useTranslations('reactionTest')
  const vs = parseVs(useSearchParams().get('vs'))

  const [phase, setPhaseState] = useState<Phase>('idle')
  const [rounds, setRounds] = useState<Round[]>([])
  const [lastMs, setLastMs] = useState<number | null>(null)
  const [earlyKind, setEarlyKind] = useState<'before' | 'anticipation'>('before')
  const [falseStarts, setFalseStarts] = useState(0)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const phaseRef = useRef<Phase>('idle')
  const roundsRef = useRef<Round[]>([])
  const falseRef = useRef(0)
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockRef = useRef(0)
  const tapRef = useRef<HTMLButtonElement>(null)
  const sessionStartRef = useRef(Date.now())

  const leaderboard = useLeaderboard('reactionTest', undefined)
  const [showNameModal, setShowNameModal] = useState(false)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()

  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p) }

  useEffect(() => {
    try { setHistory(sanitizeHistory(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))) } catch { /* 손상값 무시 */ }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // 신호색이 실제 화면에 표시된 시점부터 잰다: 커밋 후 첫 rAF = 이번 프레임 페인트 직전,
  // 두 번째 rAF의 timestamp ≈ 그 프레임이 화면에 나온 시점(vsync). setTimeout 시각보다 정확.
  useLayoutEffect(() => {
    if (phase !== 'ready') return
    let id2 = 0
    const id1 = requestAnimationFrame(ts1 => {
      startRef.current = ts1
      id2 = requestAnimationFrame(ts2 => { startRef.current = ts2 })
    })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [phase])

  const startWaiting = useCallback(() => {
    startRef.current = null
    setPhase('waiting')
    timerRef.current = setTimeout(() => setPhase('ready'), 1500 + Math.random() * 3500)
  }, [])

  const finish = useCallback((list: Round[]) => {
    const times = list.map(r => r.ms)
    const s = summarize(times)!
    let prev: HistoryEntry[] = []
    try { prev = sanitizeHistory(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch { /* 무시 */ }
    const prevBest = prev.length ? Math.min(...prev.map(h => h.avg)) : null
    const dev = list[list.length - 1].dev
    const next = sanitizeHistory([...prev, { t: Date.now(), avg: s.avg, best: s.best, median: s.median, dev }])
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* 저장 불가(사생활 모드 등) */ }
    setHistory(next)
    setResult({ s, times, dev, pb: prevBest !== null && s.avg < prevBest, falseStarts: falseRef.current })
    setPhase('complete')
  }, [])

  const press = useCallback((ts: number, dev: Device) => {
    if (performance.now() < lockRef.current) return
    switch (phaseRef.current) {
      case 'complete':
        roundsRef.current = []; setRounds([]); falseRef.current = 0; setFalseStarts(0)
        sessionStartRef.current = Date.now()
        startWaiting()
        break
      case 'idle': case 'result': case 'early':
        startWaiting()
        break
      case 'waiting':
        if (timerRef.current) clearTimeout(timerRef.current)
        falseRef.current++; setFalseStarts(falseRef.current)
        setEarlyKind('before'); setPhase('early')
        lockRef.current = performance.now() + LOCK_MS
        break
      case 'ready': {
        const start = startRef.current
        const ms = start === null ? -1 : Math.round(ts - start)
        lockRef.current = performance.now() + LOCK_MS
        if (ms < MIN_VALID_MS) {
          falseRef.current++; setFalseStarts(falseRef.current)
          setEarlyKind(ms < 0 ? 'before' : 'anticipation'); setLastMs(ms)
          setPhase('early')
          break
        }
        const list = [...roundsRef.current, { ms, dev }]
        roundsRef.current = list; setRounds(list); setLastMs(ms)
        if (list.length >= ROUNDS) finish(list)
        else setPhase('result')
      }
    }
  }, [startWaiting, finish])

  // 이벤트 timeStamp(입력 발생 시각)를 쓰면 메인 스레드 지연이 빠진다. 같은 시간축(performance.now)인지 확인 후 사용.
  const evTime = (e: { timeStamp: number }) => {
    const now = performance.now()
    return e.timeStamp > 0 && e.timeStamp <= now && now - e.timeStamp < 1000 ? e.timeStamp : now
  }

  const pressRef = useRef(press)
  pressRef.current = press
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      const el = e.target as HTMLElement | null
      if (el && el !== document.body && el !== tapRef.current) return // 다른 버튼·입력칸은 그대로
      e.preventDefault()
      if (e.repeat) return
      pressRef.current(evTime(e), 'keyboard')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pressRef.current(evTime(e), (['mouse', 'touch', 'pen'] as const).find(d => d === e.pointerType) ?? 'mouse')
  }

  // 리더보드 + 업적
  useEffect(() => {
    if (phase !== 'complete' || !result) return
    recordGameResult({ gameType: 'reactiontest', result: 'win', difficulty: 'normal', moves: result.s.avg })
    if (leaderboard.checkQualifies(result.s.avg)) setShowNameModal(true)
    leaderboard.fetchLeaderboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    if (!result) return
    await leaderboard.submitScore(result.s.avg, name, Date.now() - sessionStartRef.current)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, result])

  const clearHistory = () => {
    if (!window.confirm(t('clearConfirm'))) return
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* 무시 */ }
    setHistory([])
  }

  const ms = t('ms')
  const pb = history.length ? Math.min(...history.map(h => h.avg)) : null
  const tier = result ? tierOf(result.s.avg) : null
  const top = result ? topPercent(result.s.avg) : null
  const outliers = result ? outlierIdx(result.times) : []

  const status =
    phase === 'waiting' ? t('waiting')
      : phase === 'ready' ? t('clickNow')
        : phase === 'result' ? `${lastMs}${ms}`
          : phase === 'early' ? t('tooEarly')
            : phase === 'complete' && result ? t('a11yDone', { ms: result.s.avg }) : ''

  const tapColor = phase === 'waiting' ? 'bg-red-600' : phase === 'ready' ? 'bg-green-600' : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {vs && phase !== 'complete' && (
        <div className="bg-primary-soft text-primary rounded-2xl px-5 py-4 text-sm font-semibold">
          {t('vs.banner', { ms: vs })}
        </div>
      )}

      {/* 라운드 진행 */}
      <div className="ui-card p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-sub">
            {t('roundProgress', { current: Math.min(rounds.length + (phase === 'complete' ? 0 : 1), ROUNDS), total: ROUNDS })}
          </span>
          {falseStarts > 0 && <span className="text-muted">{t('falseStarts', { n: falseStarts })}</span>}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: ROUNDS }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-full h-2 rounded-full ${rounds[i] ? 'bg-primary' : i === rounds.length && phase !== 'idle' ? 'bg-primary-soft' : 'bg-track'}`} />
              <span className="text-xs text-muted tabular-nums h-4">{rounds[i] ? `${rounds[i].ms}${ms}` : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 영역: pointerdown(클릭보다 빠름) + Space/Enter */}
      <button
        ref={tapRef}
        type="button"
        onPointerDown={onPointerDown}
        onContextMenu={e => e.preventDefault()}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        aria-describedby="reaction-status"
        className={`ui-hero ${tapColor} w-full min-h-[280px] sm:min-h-[380px] flex flex-col items-center justify-center gap-3 p-6 select-none cursor-pointer outline-offset-4`}
      >
        {phase === 'idle' && (
          <>
            <span className="text-3xl sm:text-4xl font-bold">{t('clickToStart')}</span>
            <span className="text-white/80 text-base">{t('idleSubtext')}</span>
            <span className="text-white/70 text-sm">{t('roundInfo', { total: ROUNDS })}</span>
          </>
        )}
        {phase === 'waiting' && (
          <>
            <span className="text-4xl sm:text-5xl font-bold">{t('waiting')}</span>
            <span className="text-white/85 text-base">{t('waitSubtext')}</span>
          </>
        )}
        {phase === 'ready' && <span className="text-6xl sm:text-7xl font-black">{t('clickNow')}</span>}
        {phase === 'early' && (
          <>
            <span className="text-3xl sm:text-4xl font-bold">{earlyKind === 'anticipation' ? t('anticipation', { ms: lastMs ?? 0 }) : t('tooEarly')}</span>
            <span className="text-white/80 text-base text-center">{earlyKind === 'anticipation' ? t('anticipationSubtext', { min: MIN_VALID_MS }) : t('tooEarlySubtext')}</span>
            <span className="text-white/70 text-sm">{t('tapToRetry')}</span>
          </>
        )}
        {phase === 'result' && lastMs !== null && (
          <>
            <span className="text-6xl sm:text-7xl font-black tabular-nums">{lastMs}<span className="text-3xl ml-1">{ms}</span></span>
            <span className="text-white/80 text-base">{t('clickForNext', { next: rounds.length + 1 })}</span>
          </>
        )}
        {phase === 'complete' && result && (
          <>
            <span className="text-white/80 text-base">{t('average')}</span>
            <span className="text-6xl sm:text-7xl font-black tabular-nums">{result.s.avg}<span className="text-3xl ml-1">{ms}</span></span>
            <span className="text-white/80 text-base">{t('tapToRetryAll')}</span>
          </>
        )}
      </button>
      <div id="reaction-status" role="status" aria-live="assertive" className="sr-only">{status}</div>
      <p className="text-xs text-muted -mt-3">{t('keyHint')}</p>

      {/* 세션 결과 */}
      {phase === 'complete' && result && tier && top !== null && (
        <div className="ui-card p-6 space-y-5">
          <div>
            <p className="text-sm text-muted">{t('yourRanking')}</p>
            <p className="text-3xl font-bold text-fg tabular-nums mt-1">{t('topPercent', { percent: top })}</p>
            <p className="text-lg font-semibold text-primary mt-1">{t(`tier.${tier}`)}</p>
            <p className="text-xs text-muted mt-1">{t('percentileNote')}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([['average', result.s.avg], ['median', result.s.median], ['best', result.s.best], ['worst', result.s.worst]] as const).map(([k, v]) => (
              <div key={k} className="bg-subtle rounded-2xl p-4">
                <p className="text-xs text-muted">{t(k)}</p>
                <p className="text-xl font-bold text-fg tabular-nums">{v}<span className="text-sm ml-0.5 text-muted">{ms}</span></p>
              </div>
            ))}
          </div>

          <ul className="space-y-1.5 text-sm text-sub">
            {result.pb && <li className="font-semibold text-primary">{t('newPb')}</li>}
            {vs && (
              <li className="font-semibold text-fg">
                {result.s.avg < vs ? t('vs.win', { d: vs - result.s.avg }) : result.s.avg > vs ? t('vs.lose', { d: result.s.avg - vs }) : t('vs.tie')}
              </li>
            )}
            <li>{t('consistency', { sd: result.s.sd })}</li>
            {outliers.length > 0 && <li>{t('outlierNote', { rounds: outliers.map(i => i + 1).join(', '), median: result.s.median })}</li>}
            {result.falseStarts > 0 && <li>{t('falseStartsNote', { n: result.falseStarts })}</li>}
            <li>{t('deviceUsed', { device: t(`device.${result.dev}`) })}</li>
          </ul>

          <ShareResult
            card={{
              tool: t('title'),
              label: t('share.label', { n: ROUNDS }),
              headline: `${result.s.avg}${ms}`,
              sub: `${t(`tier.${tier}`)} · ${t('topPercent', { percent: top })}`,
              rows: [
                { label: t('best'), value: `${result.s.best}${ms}` },
                { label: t('median'), value: `${result.s.median}${ms}` },
                { label: t('share.input'), value: t(`device.${result.dev}`) },
              ],
              cta: t('share.cta'),
            }}
            url={`${window.location.origin}${window.location.pathname}?vs=${result.s.avg}`}
            text={t('share.text', { ms: result.s.avg, percent: top })}
            fileName="reaction-test"
          />
          <button type="button" onClick={() => { tapRef.current?.focus(); press(performance.now(), 'mouse') }} className="ui-btn-soft px-4 py-2.5 text-sm">
            <RotateCcw className="w-4 h-4" /> {t('newSession')}
          </button>
        </div>
      )}

      <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('deviceNote')}</div>

      {/* 내 기록 */}
      {history.length > 0 && (
        <div className="ui-card p-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="text-xl font-semibold text-fg">{t('history')}</h2>
            <button type="button" onClick={clearHistory} className="flex items-center gap-1.5 text-sm text-muted hover:text-fg">
              <Trash2 className="w-4 h-4" /> {t('clearHistory')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-subtle rounded-2xl p-4">
              <p className="text-xs text-muted">{t('allTimeBest')}</p>
              <p className="text-xl font-bold text-fg tabular-nums">{pb}<span className="text-sm ml-0.5 text-muted">{ms}</span></p>
            </div>
            <div className="bg-subtle rounded-2xl p-4">
              <p className="text-xs text-muted">{t('sessions')}</p>
              <p className="text-xl font-bold text-fg tabular-nums">{history.length}</p>
            </div>
          </div>
          {history.length > 1 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history.map((h, i) => ({ n: i + 1, avg: h.avg }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="n" tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" />
                  <YAxis domain={['dataMin - 20', 'dataMax + 20']} tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }}
                    labelFormatter={l => t('chartSession', { n: Number(l) })}
                    formatter={v => [`${v ?? 0}${ms}`, t('average')]}
                  />
                  {pb !== null && <ReferenceLine y={pb} stroke="var(--primary)" strokeDasharray="4 4" />}
                  <Line type="monotone" dataKey="avg" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--primary)' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted">{t('chartHint')}</p>
          )}
          <p className="text-xs text-muted mt-2">{t('historyLocal')}</p>
        </div>
      )}

      <GameAchievements achievements={achievements} unlockedCount={unlockedCount} totalCount={totalCount} />
      <LeaderboardPanel leaderboard={leaderboard} />
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={result?.s.avg ?? 0}
        formatScore={leaderboard.config.formatScore}
        defaultName={leaderboard.savedPlayerName}
      />

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-sub leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {(['howTo', 'standards', 'tips'] as const).map(sec => (
          <div key={sec}>
            <h3 className="text-lg font-semibold text-fg mb-2">{t(`guide.${sec}.title`)}</h3>
            <ul className="space-y-1.5 text-sub list-disc pl-5">
              {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4">
                <p className="font-semibold text-fg">{f.q}</p>
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
