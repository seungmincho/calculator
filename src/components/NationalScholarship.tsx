'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/nationalScholarship'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { fmtKRW } from '@/utils/bogeumjari'
import {
  evaluate, parseValues, toQuery, boundaries, median4, phaseAt,
  DEFAULTS, BRACKETS, BANDED, BRACKET_PCT, ANNUAL, CODES, MAX_DIGITS, SOURCES, CHECKED, BOUNDARY_YEAR, PREV_YEAR,
  type Key, type Values, type Amount, type Bracket,
} from '@/utils/nationalScholarship'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const digits = (s: string) => s.replace(/\D/g, '').slice(0, MAX_DIGITS)
const num = (s: string) => Number(s) || 0
const GUIDE = ['howTo', 'method', 'changes'] as const
const SOURCE_KEYS = ['boundary', 'method', 'type1', 'multi'] as const
const linkCls = 'inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline'
const seg = (on: boolean) =>
  `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

/** 마운트 후에만 현재 시각 (정적 HTML과 hydration 일치) */
function useNow() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 60 * 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function Seg<V extends string>({ id, label, hint, options, value, onChange }: {
  id: string; label: string; hint?: string; options: [V, string][]; value: V; onChange: (v: V) => void
}) {
  return (
    <div>
      <p id={id} className="text-sm font-medium text-body mb-2">{label}</p>
      <div role="group" aria-labelledby={id} aria-describedby={hint ? `${id}-hint` : undefined} className="flex flex-wrap gap-2">
        {options.map(([c, text]) => (
          <button key={c} type="button" aria-pressed={c === value} onClick={() => onChange(c)} className={seg(c === value)}>{text}</button>
        ))}
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function Money({ id, label, hint, unit, value, onChange, reading }: {
  id: string; label: string; hint?: string; unit: string; value: string; onChange: (v: string) => void; reading?: string
}) {
  const showReading = !!reading && num(value) > 0
  const describedBy = [showReading ? `${id}-reading` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} type="text" inputMode="numeric" autoComplete="off" value={value ? num(value).toLocaleString('ko-KR') : ''}
          onChange={(e) => onChange(digits(e.target.value))} placeholder="0" aria-describedby={describedBy}
          className="ui-field w-full min-h-11 px-4 py-3 pr-14 text-base tabular-nums" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint pointer-events-none">{unit}</span>
      </div>
      {showReading && <p id={`${id}-reading`} className="text-xs text-sub mt-1 tabular-nums">{reading}</p>}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

function Row({ label, value, strong, minus }: { label: ReactNode; value: string; strong?: boolean; minus?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 text-sm ${strong ? 'font-semibold text-fg border-t border-line pt-2' : 'text-body'}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0 text-right tabular-nums">{minus ? '−' : ''}{value}</dd>
    </div>
  )
}

export default function NationalScholarship() {
  const t = useTranslations('nationalScholarship')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const now = useNow()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선.
  const fromUrl = useMemo(() => (hydrated ? parseValues((k) => sp.get(k)) : DEFAULTS), [hydrated, sp])
  const [edited, setEdited] = useState<Values | null>(null)
  const v = edited ?? fromUrl
  const set = (k: Key, val: string) => {
    const next = { ...v, [k]: val }
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }

  const o = useMemo(() => evaluate(v), [v])
  const est = v.m === 'est'
  const single = v.st === 's'
  const multi = single && num(v.sib) >= 3
  const kind = o.award.kind

  const W = (n: number) => t('unit.won', { v: won(n) })
  const M = (n: number) => t('unit.man', { man: (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 }), won: won(n) })
  const krw = (n: number) => fmtKRW(n, t)
  const amount = (a: Amount) => (a === 'full' ? t('result.full') : a === 0 ? t('result.none') : M(a))
  const bname = (b: Bracket) => t(`bracket.${b}`)

  const bd = boundaries()
  const prev = boundaries(PREV_YEAR)
  const m4 = median4(BOUNDARY_YEAR)
  const semester = amount(o.award.semester)
  const annual = amount(o.award.annual)
  const kindText = t(`result.kind.${kind}`)
  const label = t('result.label')
  const headline = semester
  const phase = now === null ? null : phaseAt(now)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const pctText = o.pct === null ? '' : o.pct.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
  const below = BANDED[BANDED.indexOf(o.bracket as (typeof BANDED)[number]) - 1] ?? (o.bracket === 'ma' ? 'ra' : null)

  const shareRows = [
    { label: t('share.rows.bracket'), value: bname(o.bracket) },
    { label: t('share.rows.annual'), value: annual },
    ...(o.rec ? [{ label: t('share.rows.recognized'), value: W(o.rec.total) }, { label: t('share.rows.pct'), value: t('unit.pct', { p: pctText }) }] : []),
    ...(o.award.net !== null ? [{ label: t('result.tuition.net'), value: W(o.award.net) }] : []),
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* 신청 일정 */}
      <section className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1" aria-labelledby="ns-schedule">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="ns-schedule" className="font-semibold text-fg">{t('schedule.title')}</h2>
          {phase && <p className="font-medium text-primary tabular-nums">{t(`schedule.phase.${phase.phase}`, { d: phase.days })}</p>}
        </div>
        <p className="tabular-nums">{t('schedule.apply')}</p>
        <p className="tabular-nums">{t('schedule.docs')}</p>
        <p className="text-xs text-muted">{t('schedule.note')}</p>
        <a href={SOURCES.apply} target="_blank" rel="noopener noreferrer" className={linkCls}>{t('schedule.cta')}</a>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 ui-card p-6 space-y-6 min-w-0" aria-labelledby="ns-input">
          <MobileResultLink href="#national-scholarship-result" label={label} value={`${bname(o.bracket)} · ${headline}`} />
          <h2 id="ns-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <Seg id="ns-mode" label={t('mode.label')} hint={t(`mode.hint.${v.m}`)} value={v.m}
            options={(CODES.m as readonly string[]).map((c): [string, string] => [c, t(`mode.${c}`)])} onChange={(c) => set('m', c)} />

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-fg mb-3">{t('family.title')}</legend>
            <Seg id="ns-st" label={t('family.status')} hint={t(`family.statusHint.${v.st}`)} value={v.st}
              options={[['s', t('family.statusOpt.s')], ['m', t('family.statusOpt.m')]]} onChange={(c) => set('st', c)} />
            {single && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label htmlFor="ns-sib" className="block text-sm font-medium text-body mb-1.5">{t('family.siblings')}</label>
                  <select id="ns-sib" value={v.sib} onChange={(e) => set('sib', e.target.value)} aria-describedby="ns-sib-hint"
                    className="ui-field w-full min-h-11 px-3 py-2.5 text-base">
                    {(CODES.sib as readonly string[]).map((n) => <option key={n} value={n}>{t('family.siblingsOpt', { n })}</option>)}
                  </select>
                  <p id="ns-sib-hint" className="text-xs text-muted mt-1">{t('family.siblingsHint')}</p>
                </div>
                {multi && (
                  <Seg id="ns-ord" label={t('family.order')} hint={t('family.orderHint')} value={v.ord}
                    options={[['12', t('family.orderOpt.first')], ['3', t('family.orderOpt.third')]]} onChange={(c) => set('ord', c)} />
                )}
              </div>
            )}
          </fieldset>

          {est ? (
            <>
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-fg mb-1">{t('income.title')}</legend>
                <p className="text-xs text-muted -mt-2">{t('income.desc')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Money id="ns-pi" label={t(`income.parent.${v.st}`)} hint={t('income.parentHint')} unit={t('unit.wonShort')} value={v.pi} onChange={(x) => set('pi', x)} reading={krw(num(v.pi))} />
                  <Money id="ns-pd" label={t(`income.daily.${v.st}`)} hint={t('income.dailyHint')} unit={t('unit.wonShort')} value={v.pd} onChange={(x) => set('pd', x)} reading={krw(num(v.pd))} />
                  <Money id="ns-si" label={t('income.student')} hint={t('income.studentHint')} unit={t('unit.wonShort')} value={v.si} onChange={(x) => set('si', x)} reading={krw(num(v.si))} />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-fg mb-1">{t('property.title')}</legend>
                <p className="text-xs text-muted -mt-2">{t(`property.desc.${v.st}`)}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(['re', 'dep', 'fin', 'car', 'debt'] as const).map((k) => (
                    <Money key={k} id={`ns-${k}`} label={t(`property.${k}.label`)} hint={t(`property.${k}.hint`)} unit={t('unit.manShort')}
                      value={v[k]} onChange={(x) => set(k, x)} reading={krw(num(v[k]) * 10_000)} />
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <fieldset>
              <legend className="text-sm font-semibold text-fg mb-1">{t('known.label')}</legend>
              <p className="text-xs text-muted mb-3">{t('known.hint')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BRACKETS.map((b) => {
                  const on = v.b === b
                  return (
                    <button key={b} type="button" aria-pressed={on} onClick={() => set('b', b)}
                      className={`min-h-11 rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? 'bg-primary-soft text-primary border-primary' : 'bg-surface text-body border-line hover:bg-soft'}`}>
                      <span className="block text-sm font-semibold">{bname(b)}</span>
                      <span className={`block text-xs ${on ? 'text-primary' : 'text-muted'}`}>{t(`old.${b}`)}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          <Money id="ns-tu" label={t('tuition.label')} hint={t('tuition.hint')} unit={t('unit.wonShort')} value={v.tu} onChange={(x) => set('tu', x)} reading={krw(num(v.tu))} />
        </section>

        {/* 결과 */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section id="national-scholarship-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-labelledby="ns-result-label">
            <div aria-live="polite">
              <p id="ns-result-label" className="text-sm text-sub">{label}</p>
              <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{headline}</p>
              <p className="text-sm text-body mt-1">
                {t('result.line', { bracket: bname(o.bracket), kind: kindText })}
              </p>
              {o.bracket !== 'ma' && <p className="text-sm text-sub mt-0.5 tabular-nums">{t('result.perYear', { v: annual })}</p>}
            </div>

            {o.rec && (
              <div className="space-y-2">
                <p className="text-sm text-sub">{t('result.recognized')}</p>
                <p className="text-xl font-semibold text-fg tabular-nums">{W(o.rec.total)}</p>
                <p className="text-sm text-body tabular-nums">{t('result.ofMedian', { m: W(m4), p: pctText })}</p>
                {o.dist?.down != null && below && (
                  <p className="text-sm text-body tabular-nums">{t('result.down', { to: bname(below), v: W(o.dist.down) })}</p>
                )}
                {o.dist?.up != null && (
                  <p className="text-sm text-body tabular-nums">{o.dist.up === 0 ? t('result.upEdge') : t('result.up', { v: W(o.dist.up), bracket: bname(o.bracket) })}</p>
                )}
                <details className="rounded-2xl border border-line">
                  <summary className="cursor-pointer min-h-11 flex items-center px-4 py-2 text-sm font-medium text-body">{t('result.breakdown.title')}</summary>
                  <dl className="px-4 pb-4 space-y-1.5">
                    <Row label={t('result.breakdown.income')} value={W(o.rec.income)} />
                    <Row label={t('result.breakdown.general')} value={W(o.rec.general)} />
                    <Row label={t('result.breakdown.financial')} value={W(o.rec.financial)} />
                    <Row label={t('result.breakdown.car')} value={W(o.rec.car)} />
                    {o.rec.sibling > 0 && <Row label={t('result.breakdown.sibling')} value={W(o.rec.sibling)} minus />}
                    <Row label={t('result.breakdown.total')} value={W(o.rec.total)} strong />
                  </dl>
                </details>
              </div>
            )}

            {o.bracket === 'basic' && <p className="text-sm text-sub">{t('result.basicNote')}</p>}
            {o.bracket === 'ma' && <p className="text-sm text-sub">{t('result.maNote')}</p>}

            {o.award.net !== null ? (
              <div className="bg-subtle rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-fg mb-2">{t('result.tuition.title')}</h3>
                <dl className="space-y-1.5">
                  <Row label={t('result.tuition.tuition')} value={W(num(v.tu))} />
                  <Row label={t('result.tuition.aid')} value={W(o.award.aid ?? 0)} minus />
                  <Row label={t('result.tuition.net')} value={W(o.award.net)} strong />
                </dl>
              </div>
            ) : (
              <p className="text-xs text-muted">{t('result.tuitionHint')}</p>
            )}

            <div className="space-y-1 text-xs text-muted">
              <p>{t('result.amountNote')}</p>
              {est && <p>{t('result.boundaryNote', { m: won(m4) })}</p>}
            </div>
          </section>

          <ShareResult
            fileName="national-scholarship"
            card={{ tool: t('share.tool'), label, headline, sub: t('result.line', { bracket: bname(o.bracket), kind: kindText }), rows: shareRows }}
            text={t('share.text', { bracket: bname(o.bracket), amount: headline })}
          />
          <div className="flex flex-col items-start">
            <a href={SOURCES.boundary} target="_blank" rel="noopener noreferrer" className={linkCls}>{t('result.links.boundary')}</a>
            <a href={SOURCES.method} target="_blank" rel="noopener noreferrer" className={linkCls}>{t('result.links.method')}</a>
          </div>
        </div>
      </div>

      {/* 구간 경계 표 */}
      <section className="ui-card p-6 space-y-4" aria-labelledby="ns-table">
        <div>
          <h2 id="ns-table" className="text-lg font-semibold text-fg">{t('table.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('table.desc', { m: won(m4) })}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">{t('table.caption')}</caption>
            <thead>
              <tr className="border-b border-line text-left text-sub">
                {(['bracket', 'pct', 'est', 'prev', 'type1', 'multi12', 'multi3'] as const).map((k) => (
                  <th key={k} scope="col" className={`py-2 px-2 font-medium ${k === 'bracket' || k === 'pct' ? '' : 'text-right'}`}>
                    {t(`table.th.${k}`, { y: BOUNDARY_YEAR, p: PREV_YEAR })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRACKETS.map((b) => {
                const on = b === o.bracket
                const limit = (x: Record<string, number>) => (b === 'basic' ? '—' : b === 'ma' ? t('table.over', { v: won(x.ra) }) : won(x[b]))
                return (
                  <tr key={b} className={`border-b border-line ${on ? 'bg-primary-soft' : ''}`} aria-current={on ? 'true' : undefined}>
                    <th scope="row" className={`py-2.5 px-2 text-left font-medium whitespace-nowrap ${on ? 'text-primary' : 'text-fg'}`}>
                      {bname(b)}
                      <span className="block text-xs font-normal text-muted">{t(`old.${b}`)}</span>
                      {on && <span className="block text-xs font-semibold text-primary">{t('table.mine')}</span>}
                    </th>
                    <td className="py-2.5 px-2 text-body whitespace-nowrap">
                      {b === 'basic' ? t('table.basicPct') : b === 'ma' ? t('table.pctOver', { p: BRACKET_PCT.ra }) : t('table.pctUpTo', { p: BRACKET_PCT[b] })}
                    </td>
                    <td className="py-2.5 px-2 text-right text-fg tabular-nums whitespace-nowrap">{limit(bd)}</td>
                    <td className="py-2.5 px-2 text-right text-sub tabular-nums whitespace-nowrap">{limit(prev)}</td>
                    {(['type1', 'multi12', 'multi3'] as const).map((k) => (
                      <td key={k} className={`py-2.5 px-2 text-right tabular-nums whitespace-nowrap ${on && k === kind ? 'font-semibold text-primary' : 'text-body'}`}>{amount(ANNUAL[k][b])}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">{t('table.note')}</p>
      </section>

      {/* 정확도·출처 */}
      <section className="ui-card p-6 space-y-4" aria-labelledby="ns-accuracy">
        <h2 id="ns-accuracy" className="text-lg font-semibold text-fg">{t('accuracy.title')}</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
          {(t.raw('accuracy.items') as string[]).map((x) => <li key={x}>{x}</li>)}
        </ul>
        <div>
          <h3 className="text-sm font-semibold text-fg">{t('sources.title')}</h3>
          <ul className="mt-1">
            {SOURCE_KEYS.map((k) => (
              <li key={k}><a href={SOURCES[k]} target="_blank" rel="noopener noreferrer" className={linkCls}>{t(`sources.items.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-1">{t('sources.checked', { date: CHECKED })}</p>
        </div>
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GUIDE.map((sec) => (
            <section key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
