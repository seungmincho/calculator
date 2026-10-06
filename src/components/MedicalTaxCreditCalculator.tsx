'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/medicalTaxCredit'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import AddToCalendar, { useDeadlineEvent } from '@/components/AddToCalendar'
import { DEADLINE, TAX_YEAR } from '@/utils/yearEndTax'
import { analyze, couple, netOf, GROUPS, ZERO, EXTRA, EXAMPLES, type Expenses, type Group, type Who } from '@/utils/medicalTaxCredit'

// 계산은 medicalTaxCredit.ts → yearEndTax.ts (연말정산 계산기와 같은 함수).
// URL: s·ms·mg·mp·mi는 /year-end-tax와 같은 키(ms = 본인 + 한도 없는 가족, mf = 그중 가족 몫). r* = 실손보험금, ss·so = 배우자
const SALARY_PRESETS = [35_000_000, 50_000_000, 80_000_000, 100_000_000]
const INS: Record<Group, string> = { self: 'rs', family: 'rf', general: 'rg', premature: 'rp', infertility: 'ri' }
// 기본값 = 페이지 FAQ 예시와 같은 값 (첫 화면에 결과가 보이게)
const DEF = { salary: EXAMPLES.d.salary, paid: EXAMPLES.d.e as Expenses }
const MAX = 10_000_000_000
const NEXT = { yearEnd: '/year-end-tax/', card: '/card-deduction/', rent: '/rent-tax-credit/', pension: '/pension-tax-credit/' } as const

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)

function MoneyInput({ id, label, value, onChange, hint, unit, small }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string; small?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className={`block font-medium text-body mb-2 ${small ? 'text-xs' : 'text-sm'}`}>{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder="0"
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, MAX))}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

export default function MedicalTaxCreditCalculator() {
  const t = useTranslations('medicalTaxCredit')
  const sp = useSearchParams()
  const deadlineEvent = useDeadlineEvent()
  const [salary, setSalary] = useState(DEF.salary)
  const [paid, setPaid] = useState<Expenses>(DEF.paid)
  const [insuredOn, setInsuredOn] = useState(false)
  const [insured, setInsured] = useState<Expenses>(ZERO)
  const [spouseSalary, setSpouseSalary] = useState(0)
  const [spouseOwn, setSpouseOwn] = useState(0)

  // URL → 상태 (마운트 후 1회 — 첫 렌더는 기본값으로 정적 HTML과 같게)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const n = (k: string) => amount(sp.get(k))
    setSalary(n('s') ?? DEF.salary)
    if (['ms', 'mf', 'mg', 'mp', 'mi'].some((k) => sp.has(k))) {
      const special = n('ms') ?? 0
      const family = Math.min(n('mf') ?? 0, special)
      setPaid({ self: special - family, family, general: n('mg') ?? 0, premature: n('mp') ?? 0, infertility: n('mi') ?? 0 })
    }
    if (GROUPS.some((k) => sp.has(INS[k]))) {
      setInsuredOn(true)
      setInsured(Object.fromEntries(GROUPS.map((k) => [k, n(INS[k]) ?? 0])) as Expenses)
    }
    setSpouseSalary(n('ss') ?? 0)
    setSpouseOwn(n('so') ?? 0)
  }, [sp])

  useEffect(() => {
    if (!loaded.current) return
    const q = new URLSearchParams({ s: String(salary) })
    const set = (k: string, v: number) => { if (v) q.set(k, String(v)) }
    set('ms', paid.self + paid.family)
    set('mf', paid.family)
    set('mg', paid.general)
    set('mp', paid.premature)
    set('mi', paid.infertility)
    if (insuredOn) for (const k of GROUPS) set(INS[k], insured[k])
    set('ss', spouseSalary)
    set('so', spouseOwn)
    window.history.replaceState(window.history.state, '', `?${q}`)
  }, [salary, paid, insuredOn, insured, spouseSalary, spouseOwn])

  const e = netOf(paid, insuredOn ? insured : ZERO)
  const r = analyze(salary, e)
  const cp = spouseSalary > 0 ? couple(salary, spouseSalary, e, spouseOwn) : null
  const W = t('won')
  const general = r.rows.find((x) => x.key === 'general')!

  // 연말정산 계산기로 (실손 차감 후 금액, 같은 URL 키)
  const fullLink = `/year-end-tax/?${new URLSearchParams(Object.entries({ s: salary, ms: r.m.special, mg: r.m.general, mp: r.m.premature, mi: r.m.infertility })
    .filter(([, v]) => v).map(([k, v]) => [k, String(v)]))}`

  const statusText = t(`status.${r.status}`, { threshold: won(r.threshold), credit: won(r.credit), saving: won(r.saving) })
  const card = {
    tool: t('title'),
    label: t('share.label', { salary: man(salary), salaryM: mil(salary), spent: man(r.spent), spentM: mil(r.spent) }),
    headline: r.saving > 0 ? t('share.headline', { saving: won(r.saving) }) : t('share.headlineZero'),
    sub: t('share.sub', { credit: won(r.credit) }),
    rows: [
      { label: t('rows.spent'), value: `${won(r.spent)}${W}` },
      { label: t('rows.threshold'), value: `${won(r.threshold)}${W}` },
      { label: t('rows.credit'), value: `${won(r.credit)}${W}` },
      { label: t('rows.saving'), value: `${won(r.saving)}${W}` },
    ],
  }

  const calendarEvents = [
    {
      uid: `medical-year-end-${DEADLINE.yearEnd}`, date: DEADLINE.yearEnd, alarmDays: 7,
      title: t('calendar.title'), description: t('calendar.note', { url: 'https://toolhub.ai.kr/medical-tax-credit/' }),
    },
    deadlineEvent('simplified', DEADLINE.simplified, '/medical-tax-credit', 1),
  ]

  // 맞벌이 비교 표: 지금 / 모두 나 / 모두 배우자 / 추천 (같은 결과는 한 줄로)
  const familySum = e.family + e.general + e.premature + e.infertility
  const blocks: { key: 'mine' | 'spouse' | 'family'; amount: number }[] = [
    { key: 'mine', amount: e.self }, { key: 'spouse', amount: spouseOwn }, { key: 'family', amount: familySum },
  ]
  const home: Record<'mine' | 'spouse' | 'family', Who> = { mine: 'me', spouse: 'spouse', family: 'me' }
  type PlanRow = [string, NonNullable<typeof cp>['best']]
  const planRows: PlanRow[] = cp
    ? ([['current', cp.current], ['allMe', cp.allMe], ['allSpouse', cp.allSpouse], ['best', cp.best]] as PlanRow[])
      .filter(([, x], i, a) => !a.slice(0, i).some(([, y]) => y.me === x.me && y.spouse === x.spouse))
    : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: TAX_YEAR })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#medical-tax-credit-result" label={t('result.label')} value={`${won(r.saving)}${W}`} />
            <div>
              <MoneyInput id="mt-salary" label={t('salary')} value={salary} onChange={setSalary} unit={W} hint={t('salaryHint')} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SALARY_PRESETS.map((n) => (
                  <button
                    key={n} type="button" onClick={() => setSalary(n)} aria-pressed={salary === n}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${salary === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t('manUnit', { n: man(n), m: mil(n) })}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-5">
              <h2 className="text-sm font-semibold text-fg">{t('expenses.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('expenses.hint', { year: TAX_YEAR })}</p>
              <p className="text-xs text-muted mt-1">{t('capsNote')}</p>
            </div>

            {/* 실손 토글은 의료비 입력보다 위 — 켜면 각 의료비 아래에 수령액 칸이 생김 */}
            <div>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={insuredOn} onChange={(ev) => setInsuredOn(ev.target.checked)} className="w-5 h-5 accent-primary" aria-describedby="mt-ins-hint" />
                <span className="text-sm font-medium text-body">{t('insured.toggle')}</span>
              </label>
              <p id="mt-ins-hint" className="text-xs text-muted">{t('insured.hint')}</p>
            </div>

            {GROUPS.map((k) => (
              <div key={k} className="space-y-2">
                <MoneyInput
                  id={`mt-${k}`} label={t(`groups.${k}.label`)} value={paid[k]} unit={W}
                  onChange={(v) => setPaid((p) => ({ ...p, [k]: v }))}
                  hint={t(`groups.${k}.hint`, { year: TAX_YEAR, birth: TAX_YEAR - 65 })}
                />
                {insuredOn && (
                  <div className="pl-3 border-l-2 border-line">
                    <MoneyInput
                      id={`mt-ins-${k}`} small label={t('insured.label', { group: t(`groups.${k}.short`) })} value={insured[k]} unit={W}
                      onChange={(v) => setInsured((p) => ({ ...p, [k]: v }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="medical-tax-credit-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.saving)}{W}</p>
              <p className="text-sm text-sub mt-1">{statusText}</p>
            </div>

            {/* 3% 문턱 */}
            <div>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-body">{t('threshold.title')}</span>
                <span className="text-muted tabular-nums">{t('threshold.of', { spent: man(r.spent), threshold: man(r.threshold), spentM: mil(r.spent), thresholdM: mil(r.threshold) })}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-track overflow-hidden" role="progressbar" aria-label={t('threshold.title')}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((r.spent / Math.max(1, r.threshold)) * 100))}>
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (r.spent / Math.max(1, r.threshold)) * 100)}%` }} />
              </div>
              <p className="text-sm text-sub mt-2">
                {r.gap > 0 ? t('threshold.short', { gap: won(r.gap) }) : t('threshold.over', { over: won(r.spent - r.threshold) })}
              </p>
              {r.gap === 0 && r.spent > 0 && (
                <p className="text-sm text-sub mt-1">
                  {r.more > 0 ? t('threshold.more', { extra: man(EXTRA), extraM: mil(EXTRA), more: won(r.more) }) : t('threshold.moreZero')}
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('table.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('table.group')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.amount')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.cut')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.eligible')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('table.rate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((x) => (
                    <tr key={x.key} className="border-b border-line">
                      <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t(`legal.${x.key}`)}</th>
                      <td className="text-right py-3 px-2 text-sub">{won(x.amount)}</td>
                      <td className="text-right py-3 px-2 text-sub">{x.cut ? `−${won(x.cut)}` : '0'}</td>
                      <td className="text-right py-3 px-2 text-fg">{won(x.eligible)}</td>
                      <td className="text-right py-3 pl-2 text-sub">{Math.round(x.rate * 100)}%</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" colSpan={4} className="text-left font-semibold py-3 pr-2 text-fg">{t('table.total')}</th>
                    <td className="text-right py-3 pl-2 font-bold text-primary">{won(r.credit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {general.capped > 0 && <p className="text-sm text-sub">{t('table.capped', { capped: won(general.capped) })}</p>}
            <p className="text-xs text-muted">{t('table.note')}</p>

            <ShareResult card={card} text={t('share.text', { salary: man(salary), salaryM: mil(salary), spent: man(r.spent), spentM: mil(r.spent), credit: won(r.credit), saving: won(r.saving) })} fileName="medical-tax-credit" />
            <div className="flex flex-wrap gap-2">
              <Link href={fullLink} className="ui-btn px-4 py-3 text-sm">{t('actions.full')}</Link>
              <AddToCalendar file={`medical-tax-credit-${TAX_YEAR}.ics`} events={calendarEvents} />
            </div>
          </div>

          {/* 맞벌이 비교 */}
          <section aria-labelledby="mt-couple" className="ui-card p-6 space-y-5">
            <div>
              <h2 id="mt-couple" className="text-lg font-semibold text-fg">{t('couple.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('couple.desc')}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <MoneyInput id="mt-ss" label={t('couple.spouseSalary')} value={spouseSalary} onChange={setSpouseSalary} unit={W} hint={t('couple.spouseSalaryHint')} />
              <MoneyInput id="mt-so" label={t('couple.spouseOwn')} value={spouseOwn} onChange={setSpouseOwn} unit={W} hint={t('couple.spouseOwnHint')} />
            </div>

            <div aria-live="polite">
              {!cp && <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{t('couple.empty')}</p>}
              {cp && (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-4 ${cp.gain > 0 ? 'bg-primary-soft' : 'bg-subtle'}`}>
                    <p className={`text-lg font-bold tabular-nums ${cp.gain > 0 ? 'text-primary' : 'text-fg'}`}>
                      {cp.gain > 0 ? t('couple.best', { gain: won(cp.gain) }) : t('couple.same')}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {blocks.filter((b) => b.amount > 0).map((b) => (
                        <li key={b.key} className="flex flex-wrap justify-between gap-x-3">
                          <span className="text-body">{t(`couple.assign.${b.key}`, { amount: won(b.amount) })}</span>
                          <span className="font-medium text-fg">
                            {t(`couple.who.${cp.best.plan[b.key]}`)}
                            {cp.best.plan[b.key] !== home[b.key] && <span className="text-primary"> · {t('couple.moved')}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <caption className="sr-only">{t('couple.table.caption')}</caption>
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th scope="col" className="text-left font-medium py-2 pr-2">{t('couple.table.plan')}</th>
                          <th scope="col" className="text-right font-medium py-2 px-2">{t('couple.table.me')}</th>
                          <th scope="col" className="text-right font-medium py-2 px-2">{t('couple.table.spouse')}</th>
                          <th scope="col" className="text-right font-medium py-2 pl-2">{t('couple.table.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {planRows.map(([name, x]) => {
                          const top = x.total === cp.best.total
                          return (
                            <tr key={name} className="border-b border-line">
                              <th scope="row" className={`text-left py-3 pr-2 ${top ? 'font-semibold text-primary' : 'font-medium text-body'}`}>
                                {t(`couple.plans.${name}`)}{top && <span className="sr-only"> ({t('couple.top')})</span>}
                              </th>
                              <td className="text-right py-3 px-2 text-sub">{won(x.me)}</td>
                              <td className="text-right py-3 px-2 text-sub">{won(x.spouse)}</td>
                              <td className={`text-right py-3 pl-2 ${top ? 'font-bold text-primary' : 'text-fg'}`}>{won(x.total)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted">{t('couple.note')}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">{t('couple.rules.title')}</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub mt-2">
                {(t.raw('couple.rules.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          </section>
        </div>
      </div>

      {/* 포함·제외 */}
      <section aria-labelledby="mt-items" className="ui-card p-6 space-y-4">
        <h2 id="mt-items" className="text-lg font-semibold text-fg">{t('items.title')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('items.title')}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="text-left font-medium py-2 pr-2">{t('items.cols.item')}</th>
                <th scope="col" className="text-left font-medium py-2 px-2 whitespace-nowrap">{t('items.cols.ok')}</th>
                <th scope="col" className="text-left font-medium py-2 pl-2">{t('items.cols.note')}</th>
              </tr>
            </thead>
            <tbody>
              {(t.raw('items.rows') as { item: string; ok: boolean; note: string }[]).map((x) => (
                <tr key={x.item} className="border-b border-line align-top">
                  <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{x.item}</th>
                  <td className={`py-3 px-2 whitespace-nowrap font-medium ${x.ok ? 'text-primary' : 'text-sub'}`}>{t(x.ok ? 'items.yes' : 'items.no')}</td>
                  <td className="py-3 pl-2 text-sub">{x.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="mt-missing" className="ui-card p-6 space-y-3">
          <h2 id="mt-missing" className="text-lg font-semibold text-fg">{t('missing.title')}</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
            {(t.raw('missing.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </section>
        <section aria-labelledby="mt-refund" className="ui-card p-6 space-y-3">
          <h2 id="mt-refund" className="text-lg font-semibold text-fg">{t('refund.title')}</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-sub">
            {/* 경정청구 기한: 연말정산 납부기한(다음 해 3월 10일) + 5년 → 지금 열려 있는 가장 오래된 귀속연도 */}
            {(t.raw('refund.items') as string[]).map((x, i) => <li key={i}>{x.replace('{old}', String(TAX_YEAR - 5)).replace('{until}', String(TAX_YEAR + 1))}</li>)}
          </ol>
        </section>
      </div>

      <section aria-labelledby="mt-next" className="ui-card p-6 space-y-3">
        <h2 id="mt-next" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(NEXT) as (keyof typeof NEXT)[]).map((k) => (
            <li key={k}>
              <Link href={NEXT[k]} className="block rounded-2xl p-4 bg-subtle hover:bg-soft transition-colors min-h-[44px]">
                <span className="block text-sm font-semibold text-fg">{t(`next.${k}.title`)}</span>
                <span className="block text-xs text-muted mt-1">{t(`next.${k}.desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('source', { year: TAX_YEAR })}</p>
      </section>
    </div>
  )
}
