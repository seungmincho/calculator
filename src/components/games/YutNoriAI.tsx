'use client'

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/yutNori'
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react'
import YutNoriBoard, { PLAYER_COLORS, THROW_KEY } from '@/components/YutNoriBoard'
import GameConfetti from '@/components/GameConfetti'
import GameResultShare from '@/components/GameResultShare'
import { AchievementToast } from '@/components/GameAchievements'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import { useHydrated } from '@/hooks/useHydrated'
import {
  newGame, applyThrow, applyMove, legalMoves, aiMove, throwSticks, throwProbs, stationOf,
  HOME, DONE, ROUTES, type YutState, type Move, type MoveEvent, type Throw, type AILevel,
} from '@/utils/gameAI/yutNori'

type Mode = 'ai' | 'local'
interface Settings { mode: Mode; players: number; pieces: 2 | 4; backdo: boolean; level: AILevel }
type LastEvent =
  | { type: 'throw'; player: number; value: Throw; skipped: boolean; next: number }
  | { type: 'move'; ev: MoveEvent; winner: number | null; next: number; turnChanged: boolean }

const LEVELS: AILevel[] = ['easy', 'normal', 'hard']
const ARROWS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
const PICK = '[data-yut-pick]:not(:disabled)'
// 키보드로 하던 중 누르던 버튼이 사라지면 이 순서로 다음 할 일에 포커스
const NEXT_FOCUS = ['[data-yut-dest]', '[data-yut-throw]:not([aria-disabled="true"])', PICK]

interface YutNoriAIProps {
  /** 게임 허브에서 고른 AI 수준(설정에서 바꿀 수 있음) */
  difficulty?: AILevel
  /** 게임 허브 안에서 열 때만. 없으면 /yut-nori 페이지(h1) */
  onBack?: () => void
}

export default function YutNoriAI({ difficulty = 'normal', onBack }: YutNoriAIProps) {
  const t = useTranslations('yutNori')
  const hydrated = useHydrated()
  const [draft, setDraft] = useState<Settings>({ mode: 'ai', players: 2, pieces: 4, backdo: true, level: difficulty })
  const [cfg, setCfg] = useState<Settings>(draft)
  const [game, setGame] = useState<YutState>(() => newGame(draft.players, draft.pieces, draft.backdo))
  const [tossing, setTossing] = useState(false)
  const [tossKey, setTossKey] = useState(0)
  const [lastThrow, setLastThrow] = useState<{ flat: boolean[]; value: Throw } | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [lastTo, setLastTo] = useState<number | null>(null)
  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null)
  const [moves, setMoves] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const kbdRef = useRef(false)
  const pendingFocus = useRef<string | null>(null)
  const recordedRef = useRef(false)

  const { newlyUnlocked, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playMove, playCapture, playWin, playLose, enabled: soundOn, setEnabled: setSoundOn } = useGameSounds()

  const isAI = (pl: number) => cfg.mode === 'ai' && pl > 0
  const names = Array.from({ length: cfg.players }, (_, i) =>
    cfg.mode === 'ai' ? (i === 0 ? t('names.you') : t('names.ai', { n: i })) : t('names.player', { n: i + 1 }))
  const stations = t.raw('stations') as string[]
  const throwName = (v: Throw) => t(`throws.${THROW_KEY[v]}`)
  const resultText = (v: Throw) =>
    (v === -1 ? t('result.backdo') : t('result.forward', { name: throwName(v), n: v })) + (v >= 4 ? ` ${t('result.extra')}` : '')

  // ── 진행 ──
  const startThrow = useCallback((g: YutState, byHuman: boolean) => {
    const r = throwSticks(g.backdo)
    setLastThrow(r)
    setTossing(true)
    setTossKey(k => k + 1)
    setSelected(null)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const next = applyThrow(g, r.value)
      setGame(next)
      setTossing(false)
      setLastEvent({ type: 'throw', player: g.turn, value: r.value, skipped: next.turn !== g.turn, next: next.turn })
      if (byHuman && next.turn === g.turn && next.throws === 0) pendingFocus.current = PICK
      playMove()
    }, reduce ? 120 : 650)
  }, [playMove])

  const doMove = useCallback((g: YutState, m: Move, byHuman: boolean) => {
    const { state, event } = applyMove(g, m)
    setGame(state)
    setSelected(null)
    setLastTo(event.to)
    setLastEvent({ type: 'move', ev: event, winner: state.winner, next: state.turn, turnChanged: state.turn !== g.turn })
    if (byHuman) setMoves(c => c + 1)
    if (event.captured.length) playCapture()
    else playMove()
  }, [playCapture, playMove])

  // AI 차례: 사람이 따라볼 수 있게 조금 쉬었다가 던지고 옮긴다
  useEffect(() => {
    if (game.winner !== null || tossing || !(cfg.mode === 'ai' && game.turn > 0)) return
    const id = setTimeout(() => {
      if (game.throws > 0) startThrow(game, false)
      else {
        const m = aiMove(game, cfg.level)
        if (m) doMove(game, m, false)
      }
    }, game.throws > 0 ? 600 : 850)
    return () => clearTimeout(id)
  }, [game, tossing, cfg.mode, cfg.level, startThrow, doMove])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // 승패 기록(AI 대전만 업적에)
  useEffect(() => {
    if (game.winner === null) { recordedRef.current = false; return }
    if (recordedRef.current) return
    recordedRef.current = true
    if (cfg.mode === 'ai') {
      recordGameResult({ gameType: 'yutnori', result: game.winner === 0 ? 'win' : 'loss', difficulty: cfg.level, moves })
      if (game.winner === 0) playWin()
      else playLose()
    } else playWin()
  }, [game.winner, cfg.mode, cfg.level, moves, recordGameResult, playWin, playLose])

  // 키보드로 하던 중이면 다음 할 일에 포커스(마우스·터치로 하면 건드리지 않음)
  useEffect(() => {
    const root = rootRef.current
    const want = pendingFocus.current
    pendingFocus.current = null
    if (!root || !kbdRef.current) return
    const lost = !document.activeElement || document.activeElement === document.body
    if (!want && !lost) return
    const target = [want, ...NEXT_FOCUS].map(s => (s ? root.querySelector<HTMLElement>(s) : null)).find(Boolean)
    target?.focus()
  })

  const restart = (s: Settings) => {
    clearTimeout(timerRef.current)
    setCfg(s)
    setGame(newGame(s.players, s.pieces, s.backdo))
    setTossing(false)
    setLastThrow(null)
    setSelected(null)
    setLastTo(null)
    setLastEvent(null)
    setMoves(0)
  }

  // ── 지금 할 수 있는 것 ──
  const humanTurn = game.winner === null && !isAI(game.turn)
  const legal = humanTurn && !tossing ? legalMoves(game) : []
  const pickable = new Set(legal.map(m => m.piece))
  const mine = game.pieces[game.turn]
  const homeCount = mine.filter(p => p.idx === HOME).length
  const homeRep = legal.find(m => mine[m.piece].idx === HOME)?.piece
  const dests = selected === null ? [] : legal.filter(m => m.piece === selected)
  const canThrow = humanTurn && !tossing && game.throws > 0

  const pick = (piece: number) => {
    if (selected === piece) { setSelected(null); return }
    setSelected(piece)
    pendingFocus.current = '[data-yut-dest]'
  }
  const move = (m: Move) => { if (humanTurn && !tossing) doMove(game, m, true) }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    kbdRef.current = true
    const el = e.target as HTMLElement
    const root = e.currentTarget
    const step = ARROWS[e.key]
    if (step) {
      const sel = el.closest('[data-yut-dest]') ? '[data-yut-dest]'
        : el.closest('[data-yut-pick]') || el.hasAttribute('data-yut-board') ? PICK : null
      const items = sel ? [...root.querySelectorAll<HTMLElement>(sel)] : []
      if (!items.length) return
      e.preventDefault()
      const i = items.indexOf(el.closest<HTMLElement>(sel!)!)
      items[i < 0 ? 0 : (i + step + items.length) % items.length].focus()
    } else if (e.key === 'Escape' && selected !== null) {
      e.preventDefault()
      setSelected(null)
      pendingFocus.current = PICK
    } else if ((e.key === ' ' || e.key === 'Enter') && el.hasAttribute('data-yut-board')) {
      e.preventDefault()
      if (canThrow) startThrow(game, true)
      else root.querySelector<HTMLElement>(PICK)?.focus()
    }
  }

  // ── 안내 문장(화면 한 줄 + 스크린리더) ──
  let status = ''
  const parts: string[] = []
  if (lastEvent?.type === 'throw') {
    if (lastEvent.skipped) status = t('announce.skip')
    parts.push(`${names[lastEvent.player]}: ${resultText(lastEvent.value)}`, status)
  } else if (lastEvent) {
    const { ev } = lastEvent
    const who = names[ev.player]
    const s = [
      ev.to === null ? t('announce.finished', { name: who, count: ev.moved })
        : ev.from === null ? t('announce.entered', { name: who, to: stations[ev.to] })
        : t(ev.moved > 1 ? 'announce.movedGroup' : 'announce.moved', { name: who, count: ev.moved, to: stations[ev.to] }),
      ev.stacked ? t('announce.stacked', { count: ev.moved + ev.stacked }) : '',
      ev.shortcut ? t('announce.shortcut') : '',
      ...ev.captured.map(c => t('announce.captured', { name: names[c.player], count: c.count })),
      lastEvent.winner !== null ? t('announce.win', { name: names[lastEvent.winner] }) : '',
    ]
    status = s.filter(Boolean).join(' ')
    parts.push(status)
  }
  if (lastEvent && game.winner === null && (lastEvent.type === 'throw' ? lastEvent.skipped : lastEvent.turnChanged)) {
    parts.push(isAI(game.turn) || cfg.mode === 'local' ? t('announce.turn', { name: names[game.turn] }) : t('announce.yourTurn'))
  }
  const live = parts.filter(Boolean).join(' ')

  const turnLabel = game.winner !== null ? t('status.over')
    : cfg.mode === 'ai' ? (game.turn === 0 ? t('status.yourTurn') : t('status.aiTurn', { name: names[game.turn] }))
    : t('status.turn', { name: names[game.turn] })
  const won = cfg.mode === 'ai' && game.winner === 0
  const optionLabel = (m: Move) => {
    const to = m.to.idx === DONE ? null : ROUTES[m.to.route][m.to.idx]
    const base = t('action.option', { throw: throwName(game.pool[m.throwIdx]), to: to === null ? t('action.finish') : stations[to] })
    if (to === null) return base
    if (game.pieces.some((row, pl) => pl !== game.turn && row.some(p => stationOf(p) === to))) return `${base} · ${t('action.capture')}`
    return mine.some(p => stationOf(p) === to) ? `${base} · ${t('action.stack')}` : base
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} onPointerDown={() => { kbdRef.current = false }} className="space-y-4">
      <style>{`
        @keyframes yut-toss { 0% { transform: translateY(0) rotate(0) } 35% { transform: translateY(-28px) rotate(160deg) } 70% { transform: translateY(-6px) rotate(320deg) } 100% { transform: translateY(0) rotate(360deg) } }
        .yut-toss { animation: yut-toss .6s ease-out both }
        @media (prefers-reduced-motion: reduce) { .yut-toss { animation: none } }
      `}</style>

      <header>
        {onBack && (
          <button type="button" onClick={onBack} className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sub hover:bg-soft hover:text-fg">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            {t('back')}
          </button>
        )}
        {onBack ? <h2 className="text-2xl font-bold text-fg">{t('title')}</h2> : <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>}
        <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>
      </header>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{live}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* 진행: 차례 · 윷가락 · 할 일 */}
        <section className="ui-card space-y-4 p-4 sm:p-5 lg:col-start-2 lg:row-start-1" aria-label={t('panel.label')}>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold text-fg">
              <span className={`h-3 w-3 rounded-full ${PLAYER_COLORS[game.winner ?? game.turn]}`} aria-hidden="true" />
              {turnLabel}
            </p>
            {hydrated && (
              <button type="button" onClick={() => setSoundOn(!soundOn)} aria-pressed={soundOn} aria-label={t('sound')}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-soft">
                {soundOn ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div key={tossKey} className="flex shrink-0 gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3].map(i => {
                const flat = lastThrow?.flat[i]
                const tone = tossing ? 'bg-amber-300 border-amber-400'
                  : lastThrow === null ? 'bg-track border-line'
                  : flat ? 'bg-amber-100 border-amber-300' : 'bg-amber-700 border-amber-800'
                return (
                  <span key={i} className={`relative block h-14 w-4 rounded-full border ${tone} ${tossing ? 'yut-toss' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                    {i === 0 && game.backdo && <span className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500" />}
                  </span>
                )
              })}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-fg sm:text-3xl">
                {tossing ? t('status.throwing') : lastThrow ? resultText(lastThrow.value) : t('status.ready')}
              </p>
              {status && <p className="mt-1 text-sm text-sub">{status}</p>}
            </div>
          </div>

          {game.winner !== null ? (
            <div className="rounded-2xl bg-primary-soft p-5 text-center">
              <p className="text-2xl font-bold text-primary">{won ? t('win.you') : t('win.other', { name: names[game.winner] })}</p>
              {cfg.mode === 'ai' && <p className="mt-1 text-sm text-sub">{t('win.moves', { n: moves })}</p>}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" className="ui-btn px-5 py-3" onClick={() => restart(cfg)}>{t('win.again')}</button>
                {cfg.mode === 'ai' && (
                  <GameResultShare gameName={t('title')} result={won ? 'win' : 'loss'} difficulty={t(`setup.levels.${cfg.level}`)}
                    moves={moves} url="https://toolhub.ai.kr/yut-nori/" />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {game.pool.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm text-muted">{t('action.pool')}</span>
                  <ul className="flex flex-wrap gap-1.5">
                    {game.pool.map((v, i) => (
                      <li key={i} className="rounded-full bg-soft px-3 py-1 text-sm font-semibold text-body">{throwName(v)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!humanTurn ? (
                <p className="text-sm text-sub">{t(game.throws > 0 ? 'status.aiThrowing' : 'status.aiMoving', { name: names[game.turn] })}</p>
              ) : game.throws > 0 ? (
                <button type="button" data-yut-throw aria-disabled={tossing} onClick={() => { if (canThrow) startThrow(game, true) }}
                  className={`ui-btn w-full px-4 py-4 text-lg ${tossing ? 'opacity-60' : ''}`}>
                  {game.pool.length ? t('action.throwAgain') : t('action.throw')}
                </button>
              ) : (
                <>
                  {homeCount > 0 && (
                    <button type="button" data-yut-pick disabled={homeRep === undefined} aria-pressed={homeRep !== undefined && selected === homeRep}
                      onClick={() => homeRep !== undefined && pick(homeRep)}
                      className={`w-full min-h-11 rounded-xl border px-4 py-3 text-left font-medium disabled:opacity-50 ${homeRep !== undefined && selected === homeRep ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-soft text-body hover:bg-subtle'}`}>
                      {t('action.enter', { count: homeCount })}
                    </button>
                  )}
                  {dests.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted">{t('action.pickDest')}</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        {dests.map(m => (
                          <button key={`${m.throwIdx}-${m.to.route}-${m.to.idx}`} type="button" data-yut-dest onClick={() => move(m)}
                            className="ui-btn-soft min-h-11 px-4 py-2 text-left">
                            {optionLabel(m)}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => setSelected(null)} className="min-h-11 text-sm text-sub hover:text-fg">{t('action.cancel')}</button>
                    </div>
                  ) : (
                    <p className="text-sm text-sub">{t('action.pickPiece')}</p>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* 말판 */}
        <section className="ui-card p-2 sm:p-4 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <YutNoriBoard game={game} names={names} pickable={pickable} selected={selected} dests={dests} lastTo={lastTo} onPick={pick} onMove={move} />
          <p className="mt-2 px-2 text-center text-xs text-muted">{t('board.hint')}</p>
        </section>

        {/* 사람별 말 */}
        <section className="ui-card p-4 lg:col-start-2" aria-label={t('players.label')}>
          <ul className="space-y-1">
            {names.map((n, pl) => {
              const row = game.pieces[pl]
              const home = row.filter(p => p.idx === HOME).length
              const done = row.filter(p => p.idx === DONE).length
              const now = pl === game.turn && game.winner === null
              return (
                <li key={pl} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 ${now ? 'bg-primary-soft' : ''}`}>
                  <span className={`h-4 w-4 shrink-0 rounded-full ${PLAYER_COLORS[pl]}`} aria-hidden="true" />
                  <span className={`font-semibold ${now ? 'text-primary' : 'text-fg'}`}>{n}</span>
                  <span className="ml-auto text-sm text-sub tabular-nums">
                    {t('players.summary', { home, board: row.length - home - done, done, total: row.length })}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        {/* 새 게임 설정 */}
        <section className="ui-card space-y-4 p-4 sm:p-5 lg:col-start-2">
          <h2 className="font-semibold text-fg">{t('setup.title')}</h2>
          <Seg label={t('setup.mode')} value={draft.mode} onChange={mode => setDraft(d => ({ ...d, mode }))}
            options={[['ai', t('setup.modeAi')], ['local', t('setup.modeLocal')]]} />
          <Seg label={draft.mode === 'ai' ? t('setup.aiCount') : t('setup.players')} value={draft.players}
            onChange={players => setDraft(d => ({ ...d, players }))}
            options={[2, 3, 4].map((n): [number, string] => [n, draft.mode === 'ai' ? t('setup.aiN', { n: n - 1 }) : t('setup.playersN', { n })])} />
          <Seg label={t('setup.pieces')} value={draft.pieces} onChange={pieces => setDraft(d => ({ ...d, pieces }))}
            options={[[4, t('setup.piecesN', { n: 4 })], [2, t('setup.piecesN', { n: 2 })]]} />
          <Seg label={t('setup.backdo')} hint={t('setup.backdoHint')} value={draft.backdo} onChange={backdo => setDraft(d => ({ ...d, backdo }))}
            options={[[true, t('setup.on')], [false, t('setup.off')]]} />
          {draft.mode === 'ai' && (
            <Seg label={t('setup.level')} value={draft.level} onChange={level => setDraft(d => ({ ...d, level }))}
              options={LEVELS.map((l): [AILevel, string] => [l, t(`setup.levels.${l}`)])} />
          )}
          <button type="button" className="ui-btn w-full px-4 py-3" onClick={() => restart(draft)}>{t('setup.start')}</button>
        </section>
      </div>

      <GameConfetti active={game.winner !== null && (cfg.mode === 'local' || won)} />
      <AchievementToast achievement={newlyUnlocked[0] ?? null} onDismiss={dismissNewAchievements} />
    </div>
  )
}

function Seg<V extends string | number | boolean>({ label, hint, value, options, onChange }: {
  label: string; hint?: string; value: V; options: [V, string][]; onChange: (v: V) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-body">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)}
            className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium ${v === value ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
            {text}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </fieldset>
  )
}

/** /yut-nori 페이지 정적 HTML 가이드: 하는 법·말판·확률·빽도·업기잡기·FAQ */
export function YutNoriGuide() {
  const t = useTranslations('yutNori')
  const sections = ['howToPlay', 'board', 'backdo', 'stackCapture'] as const
  const probs = throwProbs(true)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const order: Throw[] = [1, 2, 3, 4, 5, -1]
  const pct = (p: number) => `${(p * 100).toFixed(2).replace(/\.?0+$/, '')}%`
  return (
    <section className="ui-card space-y-6 p-6">
      <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {sections.map(sec => (
          <div key={sec}>
            <h3 className="mb-3 font-semibold text-fg">{t(`guide.${sec}.title`)}</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-sub">
              {(t.raw(`guide.${sec}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-3 font-semibold text-fg">{t('guide.throws.title')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-sm">
            <caption className="sr-only">{t('guide.throws.title')}</caption>
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2 font-medium">{t('guide.throws.cols.result')}</th>
                <th scope="col" className="py-2 font-medium">{t('guide.throws.cols.flats')}</th>
                <th scope="col" className="py-2 font-medium">{t('guide.throws.cols.steps')}</th>
                <th scope="col" className="py-2 text-right font-medium">{t('guide.throws.cols.prob')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.map(v => (
                <tr key={v}>
                  <th scope="row" className="py-2 text-left font-semibold text-fg">{t(`throws.${THROW_KEY[v]}`)}</th>
                  <td className="py-2 text-sub">{t(`guide.throws.flats.${THROW_KEY[v]}`)}</td>
                  <td className="py-2 text-sub tabular-nums">{v === -1 ? t('guide.throws.back') : t('guide.throws.stepsN', { n: v })}</td>
                  <td className="py-2 text-right text-fg tabular-nums">{t('guide.throws.prob', { k: Math.round(probs[v] * 16), pct: pct(probs[v]) })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-sub">
          {(t.raw('guide.throws.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 font-semibold text-fg">{t('guide.faq.title')}</h3>
        <div className="divide-y divide-line border-y border-line">
          {faq.map(f => (
            <details key={f.q} className="py-3">
              <summary className="min-h-6 cursor-pointer text-sm font-medium text-body">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-sub">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
