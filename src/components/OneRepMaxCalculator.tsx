'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/oneRepMax'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import {
  FORMULAS, MAX_REPS, WARN_REPS, GEAR, estimate1RM, percentTable, loadPlates, groupPlates, convertUnit, bigThree,
  round1, roundTo, type Unit,
} from '@/utils/oneRepMax'

type Mode = 'one' | 'total'
const EXERCISES = ['bench', 'squat', 'deadlift', 'ohp', 'other'] as const
type Exercise = (typeof EXERCISES)[number]
/** 3대: [URL 키, 운동] */
const LIFTS = [['sq', 'squat'], ['bp', 'bench'], ['dl', 'deadlift']] as const
const REPS = Array.from({ length: MAX_REPS }, (_, i) => i + 1)
const UNIT_KEY = 'toolhub-1rm-unit'
const MAX_W = 2000
const DEF = { ex: 'bench' as Exercise, w: '80', r: 5 }
const LIFT_DEF = [{ w: '100', r: 5 }, { w: '80', r: 5 }, { w: '120', r: 5 }]

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const fmt1 = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const num = (s: string) => parseFloat(s) || 0
/** 숫자와 소수점 하나만 남김 */
const decimal = (s: string) => {
  const c = s.replace(/[^\d.]/g, '')
  const i = c.indexOf('.')
  return (i < 0 ? c : c.slice(0, i + 1) + c.slice(i + 1).replace(/\./g, '')).slice(0, 7)
}
const weightParam = (v: string | null | undefined, def: string) => {
  const n = Number(v)
  return v && n > 0 && n <= MAX_W ? String(n) : def
}
const repsParam = (v: string | null | undefined, def: number) => {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= MAX_REPS ? n : def
}
/** '140x5' → 140kg × 5회, '180' → 1RM 180 */
const liftParam = (v: string | null, d: { w: string; r: number }) => {
  if (!v) return d
  const [w, r] = v.split('x')
  return { w: weightParam(w, d.w), r: r === undefined ? 1 : repsParam(r, d.r) }
}

/** 라디오 의미의 세그먼트 버튼 (방향키로 이동) */
function Segmented<T extends string | number>({
  label, options, value, onChange, render, cols,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  render: (v: T) => string
  cols: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (i + step + options.length) % options.length
    onChange(options[next])
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={`grid ${cols} gap-2`}>
      {options.map((o, i) => {
        const on = o === value
        return (
          <button
            key={String(o)} ref={(el) => { refs.current[i] = el }} type="button" role="radio" aria-checked={on}
            tabIndex={on ? 0 : -1} onClick={() => onChange(o)} onKeyDown={(e) => onKey(e, i)}
            className={`min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

function UnitInput({ id, value, onChange, unit, placeholder, describedBy }: {
  id: string
  value: string
  onChange: (v: string) => void
  unit: string
  placeholder?: string
  describedBy?: string
}) {
  return (
    <div className="relative">
      <input
        id={id} type="text" inputMode="decimal" value={value} placeholder={placeholder} aria-describedby={describedBy}
        onChange={(e) => onChange(decimal(e.target.value))}
        className="ui-field w-full px-4 py-3 pr-12 tabular-nums"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">{unit}</span>
    </div>
  )
}

/** 바벨 한쪽 그림 (안쪽 = 무거운 원판). 글로 같은 내용을 보여 주므로 보조기술에서는 숨김 */
function BarbellSide({ plates, max }: { plates: readonly number[]; max: number }) {
  return (
    <div className="flex items-center h-20" aria-hidden="true">
      <div className="h-2 w-8 bg-line-strong rounded-l" />
      <div className="h-7 w-2 bg-sub rounded-sm mr-0.5" />
      {plates.map((p, i) => (
        <div key={i} className="w-3 sm:w-4 mx-px rounded-sm bg-primary" style={{ height: `${35 + 65 * (p / max)}%`, opacity: 0.5 + 0.5 * (p / max) }} />
      ))}
      <div className="h-2 w-12 bg-line-strong rounded-r" />
    </div>
  )
}

export default function OneRepMaxCalculator() {
  const t = useTranslations('oneRepMax')
  const sp = useSearchParams()
  const initUnit: Unit = sp.get('u') === 'lb' ? 'lb' : 'kg'

  const [mode, setMode] = useState<Mode>(() => (sp.get('m') === 'total' ? 'total' : 'one'))
  const [ex, setEx] = useState<Exercise>(() => {
    const e = sp.get('e')
    return EXERCISES.includes(e as Exercise) ? (e as Exercise) : DEF.ex
  })
  const [unit, setUnit] = useState<Unit>(initUnit)
  const [weight, setWeight] = useState(() => weightParam(sp.get('w'), DEF.w))
  const [reps, setReps] = useState(() => repsParam(sp.get('r'), DEF.r))
  const [bw, setBw] = useState(() => weightParam(sp.get('bw'), ''))
  const [fine, setFine] = useState(() => sp.get('inc') === 's')
  const [target, setTarget] = useState(() => weightParam(sp.get('pt'), ''))
  const [bar, setBar] = useState<number>(() => {
    const b = Number(sp.get('bar'))
    return (GEAR[initUnit].bars as readonly number[]).includes(b) ? b : GEAR[initUnit].bars[0]
  })
  const [lifts, setLifts] = useState(() => LIFTS.map(([k], i) => liftParam(sp.get(k), LIFT_DEF[i])))

  /** 단위를 바꾸면 입력한 무게도 함께 환산 (소수 첫째 자리) */
  const switchUnit = (to: Unit) => {
    try { localStorage.setItem(UNIT_KEY, to) } catch { /* 저장 불가(사생활 보호 모드 등)면 무시 */ }
    if (to === unit) return
    const cv = (s: string) => (s ? String(round1(convertUnit(num(s), unit, to))) : s)
    setWeight(cv)
    setBw(cv)
    setTarget(cv)
    setLifts((ls) => ls.map((l) => ({ ...l, w: cv(l.w) })))
    setBar(GEAR[to].bars[0])
    setUnit(to)
  }

  // 마지막으로 쓴 단위 복원 — 첫 렌더는 항상 kg(정적 HTML과 같게), 공유 링크에 단위가 있으면 그걸 따름
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || sp.get('u')) return
    restored.current = true
    let saved: string | null = null
    try { saved = localStorage.getItem(UNIT_KEY) } catch { /* 무시 */ }
    if (saved === 'lb') switchUnit('lb')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const q = new URLSearchParams()
    if (mode === 'total') {
      q.set('m', 'total')
      lifts.forEach((l, i) => { if (l.w) q.set(LIFTS[i][0], l.r > 1 ? `${l.w}x${l.r}` : l.w) })
    } else {
      if (ex !== DEF.ex) q.set('e', ex)
      if (weight !== DEF.w) q.set('w', weight)
      if (reps !== DEF.r) q.set('r', String(reps))
      if (target) q.set('pt', target)
      if (fine) q.set('inc', 's')
      if (bar !== GEAR[unit].bars[0]) q.set('bar', String(bar))
    }
    if (unit === 'lb') q.set('u', 'lb')
    if (bw) q.set('bw', bw)
    const s = q.toString()
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname)
  }, [mode, ex, weight, reps, target, fine, bar, unit, bw, lifts])

  const U = t(`u.unit.${unit}`)
  const other: Unit = unit === 'kg' ? 'lb' : 'kg'
  const gear = GEAR[unit]
  const steps = gear.steps as readonly number[]
  const step = steps[fine ? 1 : 0]
  const bwN = num(bw)
  const exName = t(`u.ex.${ex}`)

  const est = estimate1RM(num(weight), reps)
  const oneRm = round1(est.average)
  const hasResult = est.weight > 0
  const ratio = hasResult && bwN > 0 ? est.average / bwN : 0
  const rows = percentTable(est.average, step)
  const autoTarget = roundTo(est.average, step)
  const targetN = target ? num(target) : autoTarget
  const plates = loadPlates(targetN, bar, gear.plates)
  const grouped = groupPlates(plates.perSide)

  const big = bigThree(lifts.map((l) => ({ weight: num(l.w), reps: l.r })), bwN)
  const setLift = (i: number, patch: Partial<{ w: string; r: number }>) =>
    setLifts((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const card = mode === 'one'
    ? {
        tool: t('title'),
        label: t('u.share.label', { ex: exName, w: fmt(est.weight), u: U, r: reps }),
        headline: t('u.share.headline', { ex: exName, v: fmt1(oneRm), u: U }),
        sub: ratio > 0 ? t('u.result.ratio', { x: fmt(ratio) }) : undefined,
        rows: FORMULAS.map((f) => ({ label: t(`u.formula.${f}`), value: `${fmt1(est.byFormula[f])}${U}` })),
      }
    : {
        tool: t('title'),
        label: t('u.share.totalLabel'),
        headline: t('u.share.totalHeadline', { v: fmt1(big.total), u: U }),
        sub: big.ratio > 0 ? t('u.result.ratio', { x: fmt(big.ratio) }) : undefined,
        rows: LIFTS.map(([, k], i) => ({ label: t(`u.ex.${k}`), value: `${fmt1(big.each[i])}${U}` })),
      }
  const shareText = mode === 'one'
    ? t('u.share.text', { ex: exName, v: fmt1(oneRm), u: U })
    : t('u.share.totalText', { v: fmt1(big.total), u: U })

  const guideSections = ['formulas', 'howTo', 'intensity', 'bigThree'] as const
  const sources = t.raw('guide.sources.items') as { label: string; url?: string }[]
  const bigNumber = (v: number) => (
    <p className="text-4xl font-bold text-fg tabular-nums mt-1">
      {fmt1(v)}<span className="text-xl font-semibold text-sub ml-1">{U}</span>
    </p>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('u.mode.label')}</p>
              <Segmented label={t('u.mode.label')} options={['one', 'total'] as const} value={mode} onChange={setMode} render={(m) => t(`u.mode.${m}`)} cols="grid-cols-2" />
            </div>
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('u.unit.label')}</p>
              <Segmented label={t('u.unit.label')} options={['kg', 'lb'] as const} value={unit} onChange={switchUnit} render={(u) => t(`u.unit.${u}`)} cols="grid-cols-2" />
            </div>

            {mode === 'one' ? (
              <>
                <div>
                  <p className="text-sm font-medium text-body mb-2">{t('u.ex.label')}</p>
                  <Segmented label={t('u.ex.label')} options={EXERCISES} value={ex} onChange={setEx} render={(e) => t(`u.ex.${e}`)} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-2" />
                </div>
                <div>
                  <label htmlFor="orm-weight" className="block text-sm font-medium text-body mb-2">{t('u.weight')} ({U})</label>
                  <UnitInput id="orm-weight" value={weight} onChange={setWeight} unit={U} />
                </div>
                <div>
                  <p className="text-sm font-medium text-body mb-2">{t('u.reps')}</p>
                  <Segmented label={t('u.reps')} options={REPS} value={reps} onChange={setReps} render={(n) => String(n)} cols="grid-cols-6" />
                  {reps > WARN_REPS ? (
                    <p className="text-xs bg-amber-50 text-amber-800 rounded-lg p-2 mt-2" role="status">{t('u.repsWarn')}</p>
                  ) : reps === 1 ? (
                    <p className="text-xs text-muted mt-1.5">{t('u.repsOne')}</p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-fg">{t('u.total.title')}</p>
                  <p className="text-xs text-muted mt-1">{t('u.total.desc')}</p>
                </div>
                {LIFTS.map(([key, k], i) => (
                  <fieldset key={key}>
                    <legend className="text-sm font-medium text-body mb-2">{t(`u.ex.${k}`)}</legend>
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`orm-${key}-w`} className="sr-only">{t(`u.ex.${k}`)} {t('u.weight')} ({U})</label>
                        <UnitInput id={`orm-${key}-w`} value={lifts[i].w} onChange={(w) => setLift(i, { w })} unit={U} />
                      </div>
                      <div className="w-32 shrink-0">
                        <label htmlFor={`orm-${key}-r`} className="sr-only">{t(`u.ex.${k}`)} {t('u.reps')}</label>
                        <select
                          id={`orm-${key}-r`} value={lifts[i].r} onChange={(e) => setLift(i, { r: Number(e.target.value) })}
                          className="ui-field w-full px-3 py-3 min-h-[44px]"
                        >
                          {REPS.map((n) => <option key={n} value={n}>{n === 1 ? t('u.repOne') : t('u.repOpt', { n })}</option>)}
                        </select>
                      </div>
                    </div>
                  </fieldset>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="orm-bw" className="block text-sm font-medium text-body mb-2">{t('u.bw')} ({U})</label>
              <UnitInput id="orm-bw" value={bw} onChange={setBw} unit={U} placeholder={t('u.bwPlaceholder')} describedBy="orm-bw-hint" />
              <p id="orm-bw-hint" className="text-xs text-muted mt-1.5">{t('u.bwHint')}</p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {mode === 'one' ? (
            <>
              <div className="ui-card p-6 space-y-5">
                <div aria-live="polite">
                  <p className="text-sm text-muted">{t('u.result.label', { ex: exName })}</p>
                  {hasResult ? (
                    <>
                      {bigNumber(oneRm)}
                      <p className="text-sm text-sub mt-1 tabular-nums">
                        {t('u.result.basis', { w: fmt(est.weight), u: U, r: reps })} · {t('u.result.approx', { v: fmt1(convertUnit(est.average, unit, other)), u: t(`u.unit.${other}`) })}
                      </p>
                      {ratio > 0 && <p className="text-sm font-medium text-primary mt-1">{t('u.result.ratio', { x: fmt(ratio) })}</p>}
                    </>
                  ) : (
                    <p className="text-sub mt-2">{t('u.result.empty')}</p>
                  )}
                </div>

                {hasResult && (
                  <>
                    <div>
                      <h2 className="text-sm font-semibold text-body mb-2">{t('u.formula.title')}</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {FORMULAS.map((f) => (
                          <div key={f} className="bg-subtle rounded-2xl p-4">
                            <p className="text-sm text-muted">{t(`u.formula.${f}`)}</p>
                            <p className="text-lg font-bold text-fg tabular-nums mt-1">{fmt1(est.byFormula[f])}{U}</p>
                            <p className="text-xs text-muted mt-0.5">{t(`u.formula.${f}Expr`)}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted mt-2">
                        {t('u.formula.note')}
                        {reps > 1 && ` ${t('u.result.range', { min: fmt1(est.min), max: fmt1(est.max), u: U })}`}
                      </p>
                    </div>
                    <ShareResult card={card} text={shareText} fileName={`one-rep-max-${ex}`} />
                  </>
                )}
              </div>

              {hasResult && (
                <div className="ui-card p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-fg">{t('u.table.title')}</h2>
                      <p className="text-sm text-muted mt-1">{t('u.table.desc')}</p>
                    </div>
                    <div className="w-44">
                      <p className="text-xs text-muted mb-1">{t('u.table.step')}</p>
                      <Segmented
                        label={t('u.table.step')} options={steps} value={step} onChange={(v) => setFine(v === steps[1])}
                        render={(v) => t('u.table.stepOpt', { v: fmt(v), u: U })} cols="grid-cols-2"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <caption className="sr-only">{t('u.table.caption', { v: fmt1(oneRm), u: U })}</caption>
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th scope="col" className="text-left font-medium py-2 pr-2">{t('u.table.colPct')}</th>
                          <th scope="col" className="text-right font-medium py-2 px-2">{t('u.table.colWeight')}</th>
                          <th scope="col" className="text-right font-medium py-2 px-2">{t('u.table.colReps')}</th>
                          <th scope="col" className="text-right font-medium py-2 pl-2">{t('u.table.colZone')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const on = row.weight === targetN
                          return (
                            <tr key={row.pct} className={`border-b border-line ${on ? 'bg-primary-soft' : ''}`}>
                              <th scope="row" className={`text-left font-medium py-1 pr-2 ${on ? 'text-primary' : 'text-body'}`}>{row.pct}%</th>
                              <td className="text-right py-1 px-2">
                                <button
                                  type="button" onClick={() => setTarget(String(row.weight))} aria-pressed={on}
                                  aria-label={t('u.table.pick', { w: fmt(row.weight), u: U })}
                                  className="min-h-[44px] px-2 font-semibold text-fg hover:text-primary hover:underline underline-offset-4"
                                >
                                  {fmt(row.weight)}{U}
                                </button>
                              </td>
                              <td className="text-right py-1 px-2 text-sub">{t('u.table.repsCell', { n: row.reps })}</td>
                              <td className="text-right py-1 pl-2 text-sub whitespace-nowrap">{t(`u.zone.${row.zone}`)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted">{t('u.table.note')}</p>
                </div>
              )}

              {(hasResult || target) && <div className="ui-card p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-fg">{t('u.plate.title')}</h2>
                  <p className="text-sm text-muted mt-1">{t('u.plate.desc')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="orm-target" className="block text-sm font-medium text-body mb-2">{t('u.plate.target')} ({U})</label>
                    <UnitInput id="orm-target" value={target} onChange={setTarget} unit={U} placeholder={fmt(autoTarget)} describedBy="orm-target-hint" />
                    <p id="orm-target-hint" className="text-xs text-muted mt-1.5">{t('u.plate.targetHint', { v: fmt(autoTarget), u: U })}</p>
                  </div>
                  <div>
                    <label htmlFor="orm-bar" className="block text-sm font-medium text-body mb-2">{t('u.plate.bar')}</label>
                    <select id="orm-bar" value={bar} onChange={(e) => setBar(Number(e.target.value))} className="ui-field w-full px-4 py-3 min-h-[44px]">
                      {(gear.bars as readonly number[]).map((b) => <option key={b} value={b}>{t('u.plate.barOpt', { v: b, u: U })}</option>)}
                    </select>
                  </div>
                </div>
                <div aria-live="polite" className="bg-subtle rounded-2xl p-5 space-y-3">
                  {plates.belowBar ? (
                    <p className="text-sm text-sub">{t('u.plate.belowBar', { bar, u: U })}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-body">{t('u.plate.perSide')}</p>
                      {grouped.length ? (
                        <>
                          <ul className="flex flex-wrap gap-2">
                            {grouped.map(([p, n]) => (
                              <li key={p} className="px-3 py-1.5 rounded-lg bg-surface border border-line text-sm font-semibold text-fg tabular-nums">
                                {t('u.plate.count', { p: fmt(p), u: U, n })}
                              </li>
                            ))}
                          </ul>
                          <BarbellSide plates={plates.perSide} max={gear.plates[0]} />
                        </>
                      ) : (
                        <p className="text-sm text-sub">{t('u.plate.barOnly')}</p>
                      )}
                      <p className="text-sm text-sub tabular-nums">{t('u.plate.sum', { total: fmt(plates.total), bar, side: fmt(plates.side), u: U })}</p>
                      {plates.short > 1e-9 && <p className="text-xs text-muted">{t('u.plate.short', { v: fmt(plates.short), u: U })}</p>}
                    </>
                  )}
                </div>
              </div>}
            </>
          ) : (
            <div className="ui-card p-6 space-y-5">
              <div aria-live="polite">
                <p className="text-sm text-muted">{t('u.total.label')}</p>
                {bigNumber(big.total)}
                {big.ratio > 0 && <p className="text-sm font-medium text-primary mt-1">{t('u.result.ratio', { x: fmt(big.ratio) })}</p>}
                {big.total > 0 && <p className="text-sm text-sub mt-1">{t('u.total.next', { goal: fmt(big.nextGoal), left: fmt1(big.nextGoal - big.total), u: U })}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LIFTS.map(([key, k], i) => (
                  <div key={key} className="bg-subtle rounded-2xl p-4">
                    <p className="text-sm text-muted">{t(`u.ex.${k}`)}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{fmt1(big.each[i])}{U}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {lifts[i].r > 1 ? t('u.total.est', { w: fmt(num(lifts[i].w)), u: U, r: lifts[i].r }) : t('u.total.direct')}
                    </p>
                  </div>
                ))}
              </div>
              {big.total > 0 && <ShareResult card={card} text={shareText} fileName="one-rep-max-total" />}
            </div>
          )}

          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
            <p className="font-medium text-body mb-2">{t('u.safety.title')}</p>
            <ul className="list-disc pl-5 space-y-1">
              {(t.raw('u.safety.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <p className="text-xs text-faint">{t('u.disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {guideSections.map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.label}>
                {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a> : s.label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.links.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {(['exercise-calorie', 'calorie-calculator', 'body-fat-calculator'] as const).map((href) => (
              <Link key={href} href={`/${href}/`} className="ui-btn-soft min-h-[44px] inline-flex items-center px-3 py-2 text-sm">{t(`guide.links.${href}`)}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
