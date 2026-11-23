'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/salaryRaise'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { INSURANCE_YEARS, insuranceFor, pct } from '@/utils/insuranceRates'
import {
  CHECKED, CPI_PRESETS, CPI_RANGE, DEFAULT, DEP_RANGE, MODES, NT_RANGE, REF, SOURCES, S_RANGE,
  afterOf, compareOffer, compute, convert, inRange, minWageRaise, offerExample, parseState, rateOf, rateTable, toQuery,
  valid, yearsTable, type Mode, type State,
} from '@/utils/salaryRaise'

type Kind = 'won' | 'swon' | 'pct'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const swon = (n: number) => (n > 0 ? '+' : n < 0 ? '-' : '') + won(Math.abs(n))
const p2 = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const sp2 = (n: number) => (n > 0 ? '+' : '') + p2(n)
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })

const clean = (kind: Kind, v: string) => {
  if (kind === 'pct') return v.replace(/[^\d.-]/g, '').replace(/(?!^)-/g, '').replace(/(\..*)\./g, '$1').slice(0, 7)
  const neg = kind === 'swon' && v.trim().startsWith('-')
  const d = v.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 10)
  return (neg ? '-' : '') + (d ? Number(d).toLocaleString('ko-KR') : '')
}
const parse = (v: string) => (/\d/.test(v) ? Number(v.replace(/,/g, '')) : NaN)
const show = (kind: Kind, n: number) => (kind === 'pct' ? String(n) : kind === 'swon' ? (n < 0 ? '-' : '') + won(Math.abs(n)) : won(n))

const labelCls = 'block text-sm font-medium text-body mb-1.5'
const hintCls = 'mt-1.5 text-xs text-muted'
const errCls = 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const seg = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const thCls = 'py-2 pr-3 font-medium text-left whitespace-nowrap'
const tdCls = 'py-2 pr-3 tabular-nums whitespace-nowrap'

/** 숫자 입력 하나: 입력 중에는 글자 그대로, 올바른 값이면 바로 반영 */
function NumField({ id, label, value, kind, unit, ok, onCommit, hint, err, placeholder, allowEmpty }: {
  id: string; label: string; value: number; kind: Kind; unit: string; ok: (n: number) => boolean
  onCommit: (n: number) => void; hint: ReactNode; err: string; placeholder?: string; allowEmpty?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? (allowEmpty && value === 0 ? '' : show(kind, value))
  const empty = allowEmpty && text.trim() === ''
  const bad = !empty && !ok(parse(text))
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="relative">
        <input
          id={id} inputMode={kind === 'pct' ? 'decimal' : 'numeric'} autoComplete="off" value={text} placeholder={placeholder}
          onChange={(e) => {
            const v = clean(kind, e.target.value)
            setDraft(v)
            if (allowEmpty && v.trim() === '') onCommit(0)
            else if (ok(parse(v))) onCommit(parse(v))
          }}
          onBlur={() => setDraft(null)}
          aria-invalid={bad || undefined} aria-describedby={`${id}-hint`}
          className="ui-field w-full min-h-11 px-4 py-3 pr-12 text-base tabular-nums"
        />
        <span className={unitCls}>{unit}</span>
      </div>
      <p id={`${id}-hint`} className={bad ? errCls : hintCls}>{bad ? err : hint}</p>
    </div>
  )
}

export default function SalaryRaise() {
  const t = useTranslations('salaryRaise')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값(정적 HTML 과 같다). 사용자가 고치면 그 값이 우선, URL 은 기본값과 다른 것만
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  const setMode = (m: Mode) => m !== s.m && commit({ ...s, m, v: convert(s, m) })

  const ok = valid(s)
  const r = ok ? compute(s) : null
  const after = afterOf(s)
  const R = insuranceFor(s.y)
  const offer = s.o || offerExample(s.s)
  const cmp = ok && inRange(offer, S_RANGE) ? compareOffer(s, offer) : null
  const table = ok ? rateTable(s) : []
  const years = ok ? yearsTable(s) : []
  const curRate = ok ? rateOf(s.s, after) : NaN
  const mw = minWageRaise(2027) ?? 0
  const refs = [
    { k: 'wage', v: REF.wage2025 },
    { k: 'minWage', v: Math.round(mw * 10) / 10 },
    { k: 'cpiOct', v: REF.cpiOct2026 },
  ] as const
  const presetOn = CPI_PRESETS.find((x) => x.v === s.cpi)?.id ?? null

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const GUIDE = ['formula', 'why', 'tips'] as const
  const SOURCE_KEYS = ['cpi', 'cpiOct', 'bok', 'wage', 'wageIndex', 'minWage'] as const

  const valueField = {
    rate: { unit: '%', kind: 'pct' as const, ok: (n: number) => valid({ ...s, m: 'rate', v: Math.round(n * 100) / 100 }) },
    after: { unit: t('unit.won'), kind: 'won' as const, ok: (n: number) => Number.isInteger(n) && valid({ ...s, m: 'after', v: n }) },
    amt: { unit: t('unit.won'), kind: 'swon' as const, ok: (n: number) => Number.isInteger(n) && valid({ ...s, m: 'amt', v: n }) },
  }[s.m]

  /** 금액 표시: ko 는 '5,250만원', en 은 '₩52,500,000' */
  const mv = (n: number) => t('manVal', { n: man(n), full: won(n) })
  const resultLabel = t('result.label')
  const diffText = r ? t('won', { n: swon(r.netDiff) }) : '—'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="sr-input">
          <MobileResultLink href="#salary-raise-result" label={resultLabel} value={diffText} />
          <h2 id="sr-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <NumField
            id="sr-salary" label={t('input.salary')} value={s.s} kind="won" unit={t('unit.won')}
            ok={(n) => Number.isInteger(n) && inRange(n, S_RANGE)}
            onCommit={(n) => commit({ ...s, s: n })}
            hint={t('input.salaryHint', { man: mv(s.s) })}
            err={t('input.salaryErr', { min: mv(S_RANGE[0]), max: mv(S_RANGE[1]) })}
          />

          <div>
            <p id="sr-mode" className={labelCls}>{t('input.mode')}</p>
            <div role="group" aria-labelledby="sr-mode" className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button key={m} type="button" aria-pressed={s.m === m} onClick={() => setMode(m)} className={seg(s.m === m)}>{t(`input.modes.${m}`)}</button>
              ))}
            </div>
          </div>

          <NumField
            key={s.m} id="sr-value" label={t(`input.value.${s.m}`)} value={s.v} kind={valueField.kind} unit={valueField.unit}
            ok={valueField.ok}
            onCommit={(n) => commit({ ...s, v: s.m === 'rate' ? Math.round(n * 100) / 100 : n })}
            hint={ok ? t('input.valueHint', { after: won(after), raise: swon(after - s.s), rate: sp2(curRate) }) : ''}
            err={t('input.valueErr')}
          />

          <NumField
            id="sr-nt" label={t('input.nonTaxable')} value={s.nt} kind="won" unit={t('unit.won')}
            ok={(n) => Number.isInteger(n) && inRange(n, NT_RANGE)}
            onCommit={(n) => commit({ ...s, nt: n })}
            hint={t('input.nonTaxableHint')}
            err={t('input.nonTaxableErr', { max: won(NT_RANGE[1]) })}
          />

          <div>
            <label htmlFor="sr-dep" className={labelCls}>{t('input.dependents')}</label>
            <select id="sr-dep" value={s.dep} onChange={(e) => commit({ ...s, dep: Number(e.target.value) })}
              aria-describedby="sr-dep-hint" className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
              {Array.from({ length: DEP_RANGE[1] }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{t('input.dependentsOpt', { n })}</option>)}
            </select>
            <p id="sr-dep-hint" className={hintCls}>{t('input.dependentsHint')}</p>
          </div>

          <div>
            <p id="sr-year" className={labelCls}>{t('input.year')}</p>
            <div role="group" aria-labelledby="sr-year" className="grid grid-cols-2 gap-2">
              {INSURANCE_YEARS.map((y) => (
                <button key={y} type="button" aria-pressed={s.y === y} onClick={() => s.y !== y && commit({ ...s, y })} className={seg(s.y === y)}>
                  {t('input.yearOpt', { year: y })}
                </button>
              ))}
            </div>
            <p className={hintCls}>
              {t('input.yearHint', { pension: pct(R.pensionRate), health: pct(R.healthRate), ltc: pct(R.longTermCareRate), emp: pct(R.employmentRate) })}
            </p>
          </div>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="salary-raise-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="sr-result-label">
            <div aria-live="polite">
              <p id="sr-result-label" className="text-sm text-sub">{resultLabel}</p>
              {r ? (
                <>
                  <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{diffText}</p>
                  <p className="mt-1 text-sm text-body tabular-nums">{t('result.from', { before: won(r.before.netMonthly), after: won(r.aft.netMonthly) })}</p>
                </>
              ) : <p className="mt-2 text-base text-body">{t('result.invalid')}</p>}
            </div>

            {r && (
              <>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['after', t('won', { n: won(r.after) })],
                    ['raise', t('won', { n: swon(r.raise) })],
                    ['raiseMonthly', t('won', { n: swon(r.raiseMonthly) })],
                    ['netRate', `${sp2(r.netRate)}%`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-subtle rounded-2xl px-4 py-3 min-w-0">
                      <dt className="text-xs text-sub">{t(`result.${k}`)}</dt>
                      <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums [overflow-wrap:anywhere]">{v}</dd>
                    </div>
                  ))}
                </dl>
                {r.raise > 0 && (
                  <p className="text-sm text-body leading-relaxed">
                    {t('result.why', { rate: p2(r.rate), netRate: p2(r.netRate), raise: won(r.raise), share: p2(r.takenShare * 100), taken: won(r.raise * r.takenShare) })}
                  </p>
                )}
                <p className="text-xs text-muted">{t('result.sameYear', { year: s.y, dep: s.dep, nt: won(s.nt) })}</p>

                {/* 물가 */}
                <div className="rounded-2xl border border-line p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-fg">{t('inflation.title')}</h3>
                  <div role="group" aria-label={t('inflation.presetsAria')} className="flex flex-wrap gap-2">
                    {CPI_PRESETS.map((x) => (
                      <button key={x.id} type="button" aria-pressed={presetOn === x.id} onClick={() => commit({ ...s, cpi: x.v })} className={seg(presetOn === x.id)}>
                        {t(`inflation.presets.${x.id}`, { v: x.v })}
                      </button>
                    ))}
                  </div>
                  <div className="max-w-xs">
                    <NumField
                      id="sr-cpi" label={t('inflation.custom')} value={s.cpi} kind="pct" unit="%"
                      ok={(n) => inRange(n, CPI_RANGE)} onCommit={(n) => commit({ ...s, cpi: Math.round(n * 100) / 100 })}
                      hint={t('inflation.customHint')} err={t('inflation.customErr', { min: CPI_RANGE[0], max: CPI_RANGE[1] })}
                    />
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-subtle rounded-2xl px-4 py-3">
                      <dt className="text-xs text-sub">{t('inflation.real')}</dt>
                      <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{sp2(r.real)}%</dd>
                    </div>
                    <div className="bg-subtle rounded-2xl px-4 py-3">
                      <dt className="text-xs text-sub">{t('inflation.realNet')}</dt>
                      <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{sp2(r.realNet)}%</dd>
                    </div>
                  </dl>
                  {r.real < 0
                    ? <p className={warnCls}>{t('inflation.negative', { cpi: p2(s.cpi) })}</p>
                    : <p className="text-xs text-muted">{t('inflation.how', { rate: p2(r.rate), cpi: p2(s.cpi) })}</p>}
                </div>

                {/* 참고 지표 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-fg">{t('ref.title')}</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {refs.map(({ k, v }) => {
                      const d = Math.round((r.rate - v) * 100) / 100
                      return (
                        <li key={k} className="bg-subtle rounded-2xl px-4 py-3 min-w-0">
                          <p className="text-xs text-sub">{t(`ref.${k}`)}</p>
                          <p className="mt-0.5 text-base font-semibold text-fg tabular-nums">{p2(v)}%</p>
                          <p className="text-xs text-muted">{d === 0 ? t('ref.same') : t(d > 0 ? 'ref.above' : 'ref.below', { d: p2(Math.abs(d)) })}</p>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="text-xs text-muted">{t('ref.note', { y24: mv(REF.regular2024), y25: mv(REF.regular2025), real: p2(REF.realWage2025) })}</p>
                </div>
              </>
            )}
          </section>

          {r && (
            <ShareResult
              fileName="salary-raise"
              card={{
                tool: t('share.tool'),
                label: t('share.label', { from: mv(s.s), to: mv(r.after), rate: sp2(r.rate) }),
                headline: t('share.headline', { diff: swon(r.netDiff) }),
                sub: t('share.sub', { before: won(r.before.netMonthly), after: won(r.aft.netMonthly) }),
                rows: [
                  { label: t('result.raise'), value: t('won', { n: swon(r.raise) }) },
                  { label: t('result.netRate'), value: `${sp2(r.netRate)}%` },
                  { label: t('inflation.real'), value: `${sp2(r.real)}% (${t('share.cpi', { cpi: p2(s.cpi) })})` },
                ],
              }}
              text={t('share.text', { from: mv(s.s), to: mv(r.after), rate: sp2(r.rate), diff: swon(r.netDiff) })}
            />
          )}
        </div>
      </div>

      {r && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 인상률 표 */}
          <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="sr-table">
            <div>
              <h2 id="sr-table" className="text-lg font-semibold text-fg">{t('table.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('table.desc', { salary: mv(s.s) })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <caption className="sr-only">{t('table.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-sub">
                    <th scope="col" className={thCls}>{t('table.rate')}</th>
                    <th scope="col" className={thCls}>{t('table.after')}</th>
                    <th scope="col" className={thCls}>{t('table.net')}</th>
                    <th scope="col" className={thCls}>{t('table.diff')}</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row) => {
                    // 인상률로 비교하면 3,333만3,333원 × 3% 처럼 rateOf 가 3.00000003 이 돼 표시가 빠진다 → 인상 후 연봉으로 비교
                    const on = row.after === after
                    return (
                      <tr key={row.r} className={`border-b border-line ${on ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`} aria-current={on || undefined}>
                        <th scope="row" className={`${tdCls} font-medium`}>{row.r}%</th>
                        <td className={tdCls}>{mv(row.after)}</td>
                        <td className={tdCls}>{won(row.net)}</td>
                        <td className={tdCls}>{swon(row.diff)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('table.note')}</p>
          </section>

          {/* N년 뒤 */}
          <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="sr-years">
            <div>
              <h2 id="sr-years" className="text-lg font-semibold text-fg">{t('years.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('years.desc', { rate: p2(curRate), cpi: p2(s.cpi) })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <caption className="sr-only">{t('years.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-sub">
                    <th scope="col" className={thCls}>{t('years.n')}</th>
                    <th scope="col" className={thCls}>{t('years.salary')}</th>
                    <th scope="col" className={thCls}>{t('years.net')}</th>
                    <th scope="col" className={thCls}>{t('years.real')}</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.n} className="border-b border-line text-body">
                      <th scope="row" className={`${tdCls} font-medium`}>{t('years.nVal', { n: y.n })}</th>
                      <td className={tdCls}>{mv(y.salary)}</td>
                      <td className={tdCls}>{y.net === null ? '—' : won(y.net)}</td>
                      <td className={tdCls}>{mv(y.realToday)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('years.note')}</p>
          </section>
        </div>
      )}

      {/* 이직 제시 연봉 비교 */}
      {r && (
        <section className="ui-card p-6 space-y-5" aria-labelledby="sr-offer">
          <div>
            <h2 id="sr-offer" className="text-lg font-semibold text-fg">{t('offer.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('offer.desc')}</p>
          </div>
          <div className="max-w-sm">
            <NumField
              id="sr-offer-input" label={t('offer.label')} value={s.o} kind="won" unit={t('unit.won')} allowEmpty
              placeholder={won(offerExample(s.s))}
              ok={(n) => Number.isInteger(n) && inRange(n, S_RANGE)}
              onCommit={(n) => commit({ ...s, o: n })}
              hint={s.o ? t('offer.hint') : t('offer.example', { v: won(offerExample(s.s)) })}
              err={t('offer.err', { min: mv(S_RANGE[0]), max: mv(S_RANGE[1]) })}
            />
          </div>
          {cmp && (
            <div aria-live="polite" className="space-y-3">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-subtle rounded-2xl px-4 py-3">
                  <dt className="text-xs text-sub">{t('offer.stay', { rate: sp2(r.rate) })}</dt>
                  <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{t('offer.netVal', { salary: mv(r.after), net: won(cmp.netStay) })}</dd>
                </div>
                <div className="bg-subtle rounded-2xl px-4 py-3">
                  <dt className="text-xs text-sub">{t(s.o ? 'offer.move' : 'offer.moveExample', { rate: sp2(cmp.offerRate) })}</dt>
                  <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{t('offer.netVal', { salary: mv(cmp.offer), net: won(cmp.netOffer) })}</dd>
                </div>
              </dl>
              <p className="text-base text-fg font-semibold tabular-nums">
                {cmp.netDiff === 0 ? t('offer.same') : t(cmp.netDiff > 0 ? 'offer.more' : 'offer.less', { diff: won(Math.abs(cmp.netDiff)), annual: won(Math.abs(cmp.annualDiff)) })}
              </p>
              <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('offer.note')}</p>
            </div>
          )}
        </section>
      )}

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
        <section className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <h3 className="font-medium text-body">{t('sources.title')}</h3>
          <ul className="space-y-1">
            {SOURCE_KEYS.map((k) => (
              <li key={k}><a href={SOURCES[k]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{t(`sources.${k}`)}</a></li>
            ))}
            <li>{t('sources.netSalary')}</li>
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
          <p className="text-xs text-muted">{t('disclaimer')}</p>
        </section>
      </div>
    </div>
  )
}
