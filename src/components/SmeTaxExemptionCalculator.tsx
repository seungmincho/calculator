'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/smeTaxExemption'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import DatePicker from '@/components/ui/DatePicker'
import { TAX_YEAR } from '@/utils/yearEndTax'
import { analyze, isDate, KINDS, DEADLINE, FROM, MILITARY_CAP, EXAMPLES, type Kind, type SmeInput } from '@/utils/smeTaxExemption'

// 계산은 smeTaxExemption.ts → yearEndTax.ts (연말정산 계산기와 같은 함수).
// URL: s 연봉(/year-end-tax와 같은 키) · d 취업일 · b 생년월일 · m 병역 개월 · k 구분(y 청년, s 60세 이상, d 장애인, c 경력단절)
//      · x=1 제외 업종 · p 이전 회사 감면 시작일. 기본값 그대로면 쿼리를 붙이지 않는다
const CODE: Record<Kind, string> = { youth: 'y', senior: 's', disabled: 'd', careerBreak: 'c' }
const KIND_OF = Object.fromEntries(KINDS.map((k) => [CODE[k], k])) as Record<string, Kind>
const DEF = EXAMPLES.d
const SALARY_PRESETS = [28_000_000, 36_000_000, 45_000_000, 60_000_000]
const MAX = 10_000_000_000

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)

function parse(sp: URLSearchParams): SmeInput {
  const date = (k: string, d: string) => { const v = sp.get(k); return isDate(v) ? v : d }
  const p = sp.get('p')
  return {
    start: date('d', DEF.start), birth: date('b', DEF.birth),
    military: Math.min(amount(sp.get('m')) ?? DEF.military, 120),
    kind: KIND_OF[sp.get('k') ?? ''] ?? DEF.kind,
    salary: amount(sp.get('s')) ?? DEF.salary,
    excluded: sp.get('x') === '1',
    prev: isDate(p) ? p : '',
  }
}

export default function SmeTaxExemptionCalculator() {
  const t = useTranslations('smeTaxExemption')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo(() => (hydrated ? parse(sp) : DEF), [hydrated, sp])
  const [edited, setEdited] = useState<SmeInput | null>(null)
  const x = edited ?? fromUrl

  const update = (patch: Partial<SmeInput>) => {
    const n = { ...x, ...patch }
    setEdited(n)
    const q = new URLSearchParams({ s: String(n.salary), d: n.start, b: n.birth, m: String(n.military), k: CODE[n.kind] })
    if (n.excluded) q.set('x', '1')
    if (n.prev) q.set('p', n.prev)
    const isDef = (Object.keys(DEF) as (keyof SmeInput)[]).every((k) => n[k] === DEF[k])
    window.history.replaceState(window.history.state, '', isDef ? window.location.pathname : `?${q}`)
  }

  const r = analyze(x)
  const W = t('won')
  const youth = x.kind === 'youth'
  const date = (s: string) => t('date', { y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)), d: Number(s.slice(8, 10)), iso: s })
  const kindLabel = t(`kinds.${x.kind}.label`)
  const end = date(r.end.date)
  const v = {
    year: TAX_YEAR, kind: kindLabel, pct: r.pct, years: r.years, end, first: date(r.first), start: date(x.start),
    endIfNew: date(r.endIfNew.date), deadline: date(DEADLINE), from: date(FROM[x.kind]),
    age: r.age, adj: r.adjAge, military: r.military, until: date(r.until), untilNoMil: date(r.untilNoMil),
    salary: man(x.salary), salaryM: mil(x.salary), saving: won(r.saving), reduction: won(r.reduction), remaining: won(r.remaining),
  }
  const statusText = t(`result.${r.status}`, v)
  const fullLink = `/year-end-tax/?${new URLSearchParams({ s: String(r.now?.gross ?? x.salary), ...(r.reduction > 0 ? { sme: '1' } : {}) })}`
  const card = {
    tool: t('title'),
    label: t('share.label', v),
    headline: r.saving > 0 ? t('share.headline', v) : t('share.headlineZero', v),
    sub: r.eligible ? t('share.sub', v) : t('result.no'),
    rows: r.eligible ? [
      { label: t('result.rate'), value: t('result.rateValue', v) },
      { label: t('result.end'), value: end },
      { label: t('result.reduction'), value: `${won(r.reduction)}${W}` },
      { label: t('result.remaining', v), value: `${won(r.remaining)}${W}` },
    ] : [],
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', v)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 min-w-0">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#sme-tax-exemption-result" label={t('result.label', v)} value={`${won(r.saving)}${W}`} />

            <fieldset>
              <legend className="block text-sm font-medium text-body mb-2">{t('in.kind')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k} type="button" onClick={() => update({ kind: k })} aria-pressed={x.kind === k}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium transition-colors ${x.kind === k ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t(`kinds.${k}.label`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`kinds.${x.kind}.hint`)}</p>
            </fieldset>

            <div>
              <label htmlFor="sme-start" className="block text-sm font-medium text-body mb-2">{t('in.start')}</label>
              <DatePicker id="sme-start" label={t('in.start')} value={x.start} onChange={(s) => update({ start: s })} />
              <p className="text-xs text-muted mt-1.5">{t('in.startHint', v)}</p>
            </div>

            <div>
              <label htmlFor="sme-birth" className="block text-sm font-medium text-body mb-2">{t('in.birth')}</label>
              <input
                id="sme-birth" type="date" value={x.birth} min="1930-01-01" max={DEADLINE}
                onChange={(e) => { if (isDate(e.target.value)) update({ birth: e.target.value }) }}
                className="ui-field w-full px-4 py-3"
              />
            </div>

            {youth && (
              <div>
                <label htmlFor="sme-military" className="block text-sm font-medium text-body mb-2">{t('in.military')}</label>
                <div className="relative">
                  <input
                    id="sme-military" type="text" inputMode="numeric" value={x.military || ''} placeholder="0" aria-describedby="sme-military-hint"
                    onChange={(e) => update({ military: Math.min(Number(digits(e.target.value)) || 0, 120) })}
                    className="ui-field w-full px-4 py-3 pr-16 tabular-nums"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('monthsUnit')}</span>
                </div>
                <p id="sme-military-hint" className="text-xs text-muted mt-1.5">{t('in.militaryHint', { cap: MILITARY_CAP })}</p>
              </div>
            )}

            <div>
              <label htmlFor="sme-salary" className="block text-sm font-medium text-body mb-2">{t('in.salary')}</label>
              <div className="relative">
                <input
                  id="sme-salary" type="text" inputMode="numeric" value={x.salary ? won(x.salary) : ''} placeholder="0" aria-describedby="sme-salary-hint"
                  onChange={(e) => update({ salary: Math.min(Number(digits(e.target.value)) || 0, MAX) })}
                  className="ui-field w-full px-4 py-3 pr-12 tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{W}</span>
              </div>
              <p id="sme-salary-hint" className="text-xs text-muted mt-1.5">{t('in.salaryHint')}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SALARY_PRESETS.map((n) => (
                  <button
                    key={n} type="button" onClick={() => update({ salary: n })} aria-pressed={x.salary === n}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${x.salary === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t('manUnit', { n: man(n), m: mil(n) })}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-5 space-y-3">
              <div>
                <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={x.excluded} onChange={(e) => update({ excluded: e.target.checked })} className="w-5 h-5 accent-primary" aria-describedby="sme-excluded-hint" />
                  <span className="text-sm font-medium text-body">{t('in.excluded')}</span>
                </label>
                <p id="sme-excluded-hint" className="text-xs text-muted">
                  {t('in.excludedHint')}{' '}
                  <a href="#sme-industries" className="text-primary hover:underline">{t('in.excludedLink')}</a>
                </p>
              </div>
              <div>
                <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input
                    type="checkbox" checked={!!x.prev} className="w-5 h-5 accent-primary"
                    // 켜면 지금 취업일 1년 전 달 1일을 임시로 넣는다 (날짜 계산 없이 결정적)
                    onChange={(e) => update({ prev: e.target.checked ? `${Number(x.start.slice(0, 4)) - 1}${x.start.slice(4, 8)}01` : '' })}
                  />
                  <span className="text-sm font-medium text-body">{t('in.moved')}</span>
                </label>
                {!!x.prev && (
                  <div className="mt-2">
                    <label htmlFor="sme-prev" className="block text-sm font-medium text-body mb-2">{t('in.prev')}</label>
                    <DatePicker id="sme-prev" label={t('in.prev')} value={x.prev} onChange={(s) => update({ prev: s })} />
                    <p className="text-xs text-muted mt-1.5">{r.moved ? t('in.prevHint') : t('in.prevInvalid')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-6">
          <div id="sme-tax-exemption-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label', v)}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.saving)}{W}</p>
              <p className="text-sm text-sub mt-1">{statusText}</p>
              {!r.eligible && (
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-body">
                  {r.reasons.map((k) => <li key={k}>{t(`reasons.${k}`, v)}</li>)}
                </ul>
              )}
            </div>

            {r.eligible && (
              <>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    [t('result.rate'), t('result.rateValue', v)],
                    [t('result.period'), t('result.periodValue', v)],
                    [t('result.end'), end],
                    [t('result.months', v), r.now ? t('result.monthsValue', { work: r.now.work, months: r.now.months }) : '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl p-4 bg-subtle min-w-0">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="text-base font-semibold text-fg mt-1 tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>

                {r.now && (
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.before')}</dt><dd className="tabular-nums text-fg">{won(r.now.before)}{W}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.reduction')}</dt><dd className="tabular-nums text-fg">−{won(r.now.reduction)}{W}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.earnedCut')}</dt><dd className="tabular-nums text-fg">+{won(r.now.earnedCut)}{W}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.after')}</dt><dd className="tabular-nums text-fg">{won(r.now.after)}{W}</dd></div>
                    <div className="flex justify-between gap-3 border-t border-line pt-1.5"><dt className="font-semibold text-fg">{t('result.saving')}</dt><dd className="tabular-nums font-bold text-primary">{won(r.saving)}{W}</dd></div>
                  </dl>
                )}

                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <caption className="sr-only">{t('table.caption')}</caption>
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th scope="col" className="text-left font-medium py-2 pr-2">{t('table.year')}</th>
                        <th scope="col" className="text-right font-medium py-2 px-2">{t('table.months')}</th>
                        <th scope="col" className="text-right font-medium py-2 px-2">{t('table.reduction')}</th>
                        <th scope="col" className="text-right font-medium py-2 pl-2">{t('table.saving')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.rows.map((row) => (
                        <tr key={row.year} className={`border-b border-line ${row.year === TAX_YEAR ? 'font-semibold' : ''}`}>
                          <th scope="row" className="text-left font-medium py-3 pr-2 text-body">
                            {row.year}
                            {row.year < TAX_YEAR && <span className="block text-xs font-normal text-muted">{t('table.past')}</span>}
                          </th>
                          <td className="text-right py-3 px-2 text-sub">{t('table.monthsValue', { work: row.work, months: row.months })}</td>
                          <td className="text-right py-3 px-2 text-sub">{won(row.reduction)}</td>
                          <td className="text-right py-3 pl-2 text-fg">{won(row.saving)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3"><dt className="font-semibold text-fg">{t('result.remaining', v)}</dt><dd className="tabular-nums font-bold text-fg">{won(r.remaining)}{W}</dd></div>
                  {r.past > 0 && <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.past')}</dt><dd className="tabular-nums text-fg">{won(r.past)}{W}</dd></div>}
                </dl>
                {r.past > 0 && <p className="text-sm text-sub">{t('result.pastNote')}</p>}
              </>
            )}
            <p className="text-xs text-muted">{t('result.note')}</p>

            <ShareResult card={card} text={t(r.saving > 0 ? 'share.text' : 'share.textZero', v)} fileName="sme-tax-exemption" />
            <div className="space-y-2">
              <Link href={fullLink} className="ui-btn inline-block px-4 py-3 text-sm">{t('actions.full')}</Link>
              <p className="text-xs text-muted">{t('actions.fullNote')}</p>
            </div>
          </div>

          {/* 이직·병역 */}
          <section aria-labelledby="sme-sim" className="ui-card p-6 space-y-4">
            <h2 id="sme-sim" className="text-lg font-semibold text-fg">{t('sim.title')}</h2>
            <div aria-live="polite" className="space-y-3">
              <div className="rounded-2xl p-4 bg-subtle text-sm">
                <h3 className="font-semibold text-fg">{t('sim.moveTitle')}</h3>
                <p className="text-body mt-1">{t(r.moved ? 'sim.moved' : 'sim.stay', v)}</p>
              </div>
              <div className="rounded-2xl p-4 bg-subtle text-sm">
                <h3 className="font-semibold text-fg">{t('sim.armyTitle')}</h3>
                <p className="text-body mt-1">{!youth ? t('sim.armyOther') : r.military > 0 ? t('sim.army', v) : t('sim.armyNone', v)}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 대상 업종 */}
      <section id="sme-industries" aria-labelledby="sme-ind" className="ui-card p-6 space-y-4 scroll-mt-20">
        <div>
          <h2 id="sme-ind" className="text-lg font-semibold text-fg">{t('industries.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('industries.desc')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-fg mb-2">{t('industries.eligibleTitle')}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-sub">
              {(t.raw('industries.eligible') as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-fg mb-2">{t('industries.excludedTitle')}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-sub">
              {(t.raw('industries.excluded') as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="sme-people" className="ui-card p-6 space-y-3">
        <h2 id="sme-people" className="text-lg font-semibold text-fg">{t('people.title')}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('people.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </section>

      <section aria-labelledby="sme-apply" className="ui-card p-6 space-y-3">
        <h2 id="sme-apply" className="text-lg font-semibold text-fg">{t('apply.title')}</h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('apply.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
          <h3 className="font-semibold text-fg">{t('reform.title')}</h3>
          <p className="mt-1">{t('reform.text')}</p>
        </div>
        <p className="text-xs text-muted">{t('source')}</p>
      </section>
    </div>
  )
}
