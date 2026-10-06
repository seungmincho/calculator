'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/cardDeduction'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import AddToCalendar, { useDeadlineEvent } from '@/components/AddToCalendar'
import {
  cardDeduction, cardTaxSaving, annualSpend, q4Strategy, CARD_KEYS, CARD_RATE, DEFAULT_INPUT, DEADLINE, PREVIEW_MONTHS, TAX_YEAR,
  type CardSpend,
} from '@/utils/yearEndTax'

// 계산은 전부 yearEndTax.ts (연말정산 계산기와 같은 함수). URL 키도 /year-end-tax와 같게 → 그대로 넘겨 전체 환급액 계산
type Period = 'ytd' | 'year'
const SALARY_PRESETS = [30_000_000, 40_000_000, 50_000_000, 70_000_000, 100_000_000]
const CODE: Record<keyof CardSpend, string> = { credit: 'cc', debit: 'dc', transport: 'tr', market: 'mk', culture: 'cu' }
// 기본값: 총급여 5,000만 직장인의 1~9월 사용액 (신용카드 위주 → 10~12월 전략이 보이게)
const DEF = { salary: 50_000_000, children: 0, spend: { credit: 12_000_000, debit: 2_000_000, transport: 450_000, market: 0, culture: 0 } as CardSpend }
const MAX = 10_000_000_000

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 (만원 단위는 영어로 옮기면 어색) */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)
const sum = (s: CardSpend) => CARD_KEYS.reduce((a, k) => a + s[k], 0)

function MoneyInput({ id, label, value, onChange, hint, unit }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
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

export default function CardDeductionCalculator() {
  const t = useTranslations('cardDeduction')
  const sp = useSearchParams()
  const deadlineEvent = useDeadlineEvent()
  const [salary, setSalary] = useState(DEF.salary)
  const [period, setPeriod] = useState<Period>('ytd')
  const [children, setChildren] = useState(DEF.children)
  const [spend, setSpend] = useState<CardSpend>(DEF.spend)

  // URL → 상태 (마운트 후 1회 — 첫 렌더는 기본값으로 정적 HTML과 같게. 다시 읽으면 아래 쓰기 effect의 기본값이 공유 링크를 덮음)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    setSalary(amount(sp.get('s')) ?? DEF.salary)
    setPeriod(sp.get('p') === 'y' ? 'year' : 'ytd')
    setChildren(Math.min(2, amount(sp.get('ch')) ?? DEF.children))
    if (CARD_KEYS.some((k) => sp.has(CODE[k]))) setSpend(Object.fromEntries(CARD_KEYS.map((k) => [k, amount(sp.get(CODE[k])) ?? 0])) as unknown as CardSpend)
  }, [sp])

  const query = (extra: Record<string, string> = {}) => {
    const q = new URLSearchParams(extra)
    q.set('s', String(salary))
    if (children) q.set('ch', String(children))
    for (const k of CARD_KEYS) if (spend[k]) q.set(CODE[k], String(spend[k]))
    return q
  }
  useEffect(() => {
    if (!loaded.current) return
    const q = query(period === 'year' ? { p: 'y' } : {})
    window.history.replaceState(window.history.state, '', `?${q}`)
  }, [salary, period, children, spend]) // eslint-disable-line react-hooks/exhaustive-deps

  const ytd = period === 'ytd'
  const annual = ytd ? annualSpend(spend) : spend
  const r = cardDeduction(salary, annual, children)
  const saving = cardTaxSaving(salary, annual, children)
  const q4 = ytd ? q4Strategy({ ...DEFAULT_INPUT, salary, children, ...annual }, annual.credit - spend.credit) : null
  const ytdSpent = sum(spend)
  const ytdLeft = Math.max(0, r.threshold - ytdSpent)
  const lowSalary = salary <= 70_000_000
  const W = t('won')

  // 연말정산 계산기로 넘기는 링크 (같은 URL 키, 1~9월이면 미리보기 모드)
  const fullLink = ytd
    ? `/year-end-tax/?${new URLSearchParams({ mode: 'preview', s: String(salary), ...(children ? { ch: String(children) } : {}), ...Object.fromEntries(CARD_KEYS.filter((k) => spend[k]).map((k) => [`y${CODE[k]}`, String(spend[k])])) })}`
    : `/year-end-tax/?${query()}`

  const card = {
    tool: t('title'),
    label: t('share.label', { salary: man(salary), salaryM: mil(salary) }),
    headline: t('share.headline', { amount: won(r.total) }),
    sub: saving > 0 ? t('share.sub', { saving: won(saving) }) : t('share.subZero'),
    rows: [
      { label: t('rows.spent'), value: `${won(r.spent)}${W}` },
      { label: t('rows.threshold'), value: `${won(r.threshold)}${W}` },
      { label: t('rows.deduction'), value: `${won(r.total)}${W}` },
      { label: t('rows.saving'), value: `${won(saving)}${W}` },
    ],
  }

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
            <MobileResultLink href="#card-deduction-result" label={t(ytd ? 'result.labelYtd' : 'result.label')} value={`${won(r.total)}${W}`} />
            <div>
              <MoneyInput id="cd-salary" label={t('salary')} value={salary} onChange={setSalary} unit={W} hint={t('salaryHint')} />
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

            <div>
              <p id="cd-period" className="text-sm font-medium text-body mb-2">{t('period.label')}</p>
              <div role="radiogroup" aria-labelledby="cd-period" className="grid grid-cols-2 gap-2">
                {(['ytd', 'year'] as const).map((p) => (
                  <button
                    key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
                    className={`min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t(`period.${p}`, { months: PREVIEW_MONTHS })}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`period.hint_${period}`)}</p>
            </div>

            {CARD_KEYS.map((k) => (
              <MoneyInput
                key={k} id={`cd-${k}`} label={t(`kinds.${k}`)} value={spend[k]} unit={W}
                onChange={(n) => setSpend((s) => ({ ...s, [k]: n }))}
                hint={k === 'culture' ? t(lowSalary ? 'cultureHint' : 'cultureHintHigh') : k === 'debit' ? t('debitHint') : undefined}
              />
            ))}

            <div>
              <label htmlFor="cd-children" className="block text-sm font-medium text-body mb-2">{t('children')}</label>
              <select id="cd-children" value={children} onChange={(e) => setChildren(Number(e.target.value))} className="ui-field w-full px-4 py-3 min-h-[44px]">
                {[0, 1, 2].map((n) => <option key={n} value={n}>{t(n === 2 ? 'childrenOpt2' : 'childrenOpt', { n })}</option>)}
              </select>
              <p className="text-xs text-muted mt-1.5">{t('childrenHint', { per: man(lowSalary ? 500_000 : 250_000), perM: mil(lowSalary ? 500_000 : 250_000) })}</p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="card-deduction-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t(ytd ? 'result.labelYtd' : 'result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.total)}{W}</p>
              <p className="text-sm text-sub mt-1">
                {saving > 0 ? t('result.saving', { saving: won(saving) }) : t('result.noSaving')}
              </p>
            </div>

            {/* 25% 문턱 */}
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
                {r.shortfall > 0
                  ? t('threshold.short', { gap: won(r.shortfall) })
                  : t('threshold.over', { over: won(r.spent - r.threshold) })}
              </p>
              {ytd && (
                <p className="text-sm text-sub mt-1">
                  {ytdLeft > 0
                    ? t('threshold.ytdLeft', { spent: won(ytdSpent), left: won(ytdLeft), monthly: won(Math.ceil(ytdLeft / 3)) })
                    : t('threshold.ytdOver', { spent: won(ytdSpent) })}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('limit.basic')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{t('limit.used', { used: man(r.basic), cap: man(r.limits.basic), usedM: mil(r.basic), capM: mil(r.limits.basic) })}</p>
              </div>
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('limit.extra')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{t('limit.used', { used: man(r.extra), cap: man(r.limits.extra), usedM: mil(r.extra), capM: mil(r.limits.extra) })}</p>
              </div>
            </div>
            {r.gross > r.total && <p className="text-sm text-sub">{t('limit.capped', { lost: won(r.gross - r.total) })}</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('table.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('table.kind')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t(ytd ? 'table.spentYtd' : 'table.spent')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.rate')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('table.deduction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {CARD_KEYS.map((k) => (
                    <tr key={k} className="border-b border-line">
                      <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t(`kinds.${k}`)}</th>
                      <td className="text-right py-3 px-2 text-sub">{won(annual[k])}</td>
                      <td className="text-right py-3 px-2 text-sub">{k === 'culture' && !lowSalary ? t('table.asCredit') : `${CARD_RATE[k] * 100}%`}</td>
                      <td className="text-right py-3 pl-2 text-fg">{won(r.parts[k])}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="text-left font-semibold py-3 pr-2 text-fg">{t('table.total')}</th>
                    <td className="text-right py-3 px-2 font-semibold text-fg">{won(r.spent)}</td>
                    <td />
                    <td className="text-right py-3 pl-2 font-bold text-primary">{won(r.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('table.note')}</p>

            <ShareResult card={card} text={t('share.text', { salary: man(salary), salaryM: mil(salary), amount: won(r.total), saving: won(saving) })} fileName="card-deduction" />
          </div>

          {/* 10~12월 전략 */}
          {q4 && (
            <div className="ui-card p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">{t('q4.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('q4.desc', { credit: won(annual.credit - spend.credit) })}</p>
              </div>
              <div className={`rounded-2xl p-4 ${q4.kind === 'switch' ? 'bg-primary-soft' : 'bg-subtle'}`} aria-live="polite">
                {q4.kind === 'switch' && <p className="text-xl font-bold text-primary tabular-nums">{t('q4.gain', { gain: won(q4.gain) })}</p>}
                <p className="text-sm text-body mt-1">{t(`q4.${q4.kind}`, { moved: won(q4.moved), gap: won(q4.gap), gain: won(q4.gain) })}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={fullLink} className="ui-btn px-4 py-3 text-sm">{t('q4.full')}</Link>
                <AddToCalendar file={`card-deduction-${TAX_YEAR}.ics`} events={[deadlineEvent('cardYearEnd', DEADLINE.yearEnd, '/card-deduction', 7)]} />
              </div>
            </div>
          )}
          {!q4 && (
            <div className="flex flex-wrap gap-2">
              <Link href={fullLink} className="ui-btn px-4 py-3 text-sm">{t('q4.full')}</Link>
            </div>
          )}

          {/* 공제율·한도 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('guide.title')}</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
              {(t.raw('guide.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <p className="text-xs text-muted">{t('guide.source')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
