'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { ExternalLink } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import DatePicker from '@/components/ui/DatePicker'
import ShareResult from '@/components/ShareResult'
import { addDays, addMonths, isValidDate, todayKST } from '@/utils/dday'
import {
  DAILY_CAP, BENEFIT_DAYS, PERIODS, WAITING_DAYS, benefitDays, daysIn3Months, avgDailyWage,
  dailyBenefit, dailyFloor, earlyBonus, lastEligiblePaidDay, schedule,
  type AgeGroup, type InsurancePeriod,
} from '@/utils/unemploymentBenefit'

type Mode = 'month' | 'year' | 'day'
type Reason = 'involuntary' | 'just' | 'voluntary'

const MODES: Mode[] = ['month', 'year', 'day']
const REASONS: Reason[] = ['involuntary', 'just', 'voluntary']
const AGES: AgeGroup[] = ['under50', 'over50']
const DEFAULT_AMOUNT: Record<Mode, number> = { month: 3_000_000, year: 36_000_000, day: 100_000 }
const FALLBACK_LEAVE = '2026-12-31'

const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`
const pick = <T extends string>(v: string | null, list: readonly T[]) => (v && (list as readonly string[]).includes(v) ? (v as T) : null)

const LINKS = [
  { key: 'work24', href: 'https://www.work24.go.kr' },
  { key: 'law', href: 'https://www.law.go.kr/법령/고용보험법' },
  { key: 'decree', href: 'https://www.law.go.kr/법령/고용보험법시행령' },
  { key: 'moel', href: 'https://www.moel.go.kr' },
]

export default function UnemploymentBenefit() {
  const t = useTranslations('unemploymentBenefit')
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<Mode>('month')
  const [amount, setAmount] = useState(DEFAULT_AMOUNT.month)
  const [age, setAge] = useState<AgeGroup>('under50')
  const [period, setPeriod] = useState<InsurancePeriod>('1to3')
  const [leave, setLeave] = useState('')
  const [hours, setHours] = useState(8)
  const [reason, setReason] = useState<Reason>('involuntary')
  const [insured, setInsured] = useState(true)
  const [justChecked, setJustChecked] = useState<number[]>([])
  const [paidDays, setPaidDays] = useState(30)
  const [ready, setReady] = useState(false)

  // URL → 상태 (예전 링크 ?wage=일급 호환)
  useEffect(() => {
    const g = (k: string) => searchParams.get(k)
    const m = pick(g('mode'), MODES)
    const amt = Number(g('amt'))
    const legacyWage = Number(g('wage'))
    if (m) setMode(m)
    if (amt > 0) setAmount(amt)
    else if (legacyWage > 0) { setMode('day'); setAmount(legacyWage) }
    const a = pick(g('age'), AGES); if (a) setAge(a)
    const p = pick(g('period'), PERIODS); if (p) setPeriod(p)
    const r = pick(g('reason'), REASONS); if (r) setReason(r)
    const h = Number(g('h')); if (h >= 1 && h <= 8) setHours(h)
    if (g('ins') === '0') setInsured(false)
    const l = g('leave')
    setLeave(isValidDate(l) ? l : todayKST())
    setReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 상태 → URL
  useEffect(() => {
    if (!ready) return
    const url = new URL(window.location.href)
    const sp = url.searchParams
    sp.delete('wage')
    sp.set('mode', mode); sp.set('amt', String(amount)); sp.set('age', age); sp.set('period', period)
    sp.set('reason', reason); sp.set('leave', leave)
    if (hours !== 8) sp.set('h', String(hours)); else sp.delete('h')
    if (!insured) sp.set('ins', '0'); else sp.delete('ins')
    window.history.replaceState({}, '', url)
  }, [ready, mode, amount, age, period, reason, leave, hours, insured])

  const leaveDate = leave || FALLBACK_LEAVE

  const r = useMemo(() => {
    const days3m = daysIn3Months(leaveDate)
    const monthly = mode === 'year' ? amount / 12 : amount
    const avgDaily = mode === 'day' ? amount : avgDailyWage(monthly, leaveDate)
    const d = dailyBenefit(avgDaily, hours)
    const days = benefitDays(age, period)
    const apply = addDays(leaveDate, 1)
    const start = addDays(apply, WAITING_DAYS)
    return {
      days3m, avgDaily, ...d, days, total: d.daily * days, per4w: d.daily * 28,
      apply, start, end: addDays(start, days - 1), expire: addMonths(apply, 12),
      sched: schedule(apply, days, d.daily),
    }
  }, [leaveDate, mode, amount, hours, age, period])

  const paid = Math.min(paidDays, r.days)
  const early = earlyBonus(r.daily, r.days, paid)
  const lastDay = lastEligiblePaidDay(r.days)

  const justItems = t.raw('u.just.items') as string[]
  const status: 'likely' | 'check' | 'unlikely' =
    !insured || reason === 'voluntary' ? 'unlikely'
      : reason === 'just' ? (justChecked.length ? 'check' : 'unlikely')
      : 'likely'

  const seg = (on: boolean) => `px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const label = 'block text-sm font-medium text-body mb-2'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <span className={label}>{t('u.wage.label')}</span>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {MODES.map((m) => (
                  <button key={m} type="button" className={seg(mode === m)}
                    onClick={() => { setMode(m); setAmount(DEFAULT_AMOUNT[m]) }}>
                    {t(`u.wage.mode.${m}`)}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text" inputMode="numeric" aria-label={t(`u.wage.mode.${mode}`)}
                  value={amount ? amount.toLocaleString('ko-KR') : ''}
                  onChange={(e) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                  className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">{t('u.won')}</span>
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`u.wage.hint.${mode}`)}</p>
            </div>

            <div>
              <span className={label}>{t('u.leave')}</span>
              <DatePicker value={leave} onChange={setLeave} />
            </div>

            <div>
              <span className={label}>{t('u.age.label')}</span>
              <div className="grid grid-cols-2 gap-2">
                {AGES.map((a) => (
                  <button key={a} type="button" className={seg(age === a)} onClick={() => setAge(a)}>{t(`u.age.${a}`)}</button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="ub-period" className={label}>{t('u.period.label')}</label>
              <select id="ub-period" value={period} onChange={(e) => setPeriod(e.target.value as InsurancePeriod)} className="ui-field w-full px-4 py-3">
                {PERIODS.map((p) => <option key={p} value={p}>{t(`u.period.${p}`)}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="ub-hours" className={label}>{t('u.hours.label')}</label>
              <select id="ub-hours" value={hours} onChange={(e) => setHours(Number(e.target.value))} className="ui-field w-full px-4 py-3">
                {[8, 7, 6, 5, 4, 3, 2, 1].map((h) => <option key={h} value={h}>{t('u.hours.option', { h })}</option>)}
              </select>
              <p className="text-xs text-muted mt-1.5">{t('u.hours.hint')}</p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 수급 자격 체크 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('u.elig.title')}</h2>
            <div>
              <p className="text-sm text-body mb-2">{t('u.elig.insured')}</p>
              <div className="grid grid-cols-2 gap-2 max-w-xs">
                <button type="button" className={seg(insured)} onClick={() => setInsured(true)}>{t('u.yes')}</button>
                <button type="button" className={seg(!insured)} onClick={() => setInsured(false)}>{t('u.no')}</button>
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.elig.insuredHint')}</p>
            </div>
            <div>
              <p className="text-sm text-body mb-2">{t('u.elig.reason')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {REASONS.map((x) => (
                  <button key={x} type="button" className={seg(reason === x)} onClick={() => setReason(x)}>{t(`u.reason.${x}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`u.reasonHint.${reason}`)}</p>
            </div>
            {reason === 'just' && (
              <fieldset className="bg-subtle rounded-2xl p-4 space-y-2">
                <legend className="sr-only">{t('u.just.title')}</legend>
                <p className="text-sm font-medium text-fg">{t('u.just.title')}</p>
                {justItems.map((item, i) => (
                  <label key={i} className="flex items-start gap-2 text-sm text-body cursor-pointer">
                    <input type="checkbox" className="mt-1 accent-[var(--primary)]"
                      checked={justChecked.includes(i)}
                      onChange={(e) => setJustChecked((c) => (e.target.checked ? [...c, i] : c.filter((v) => v !== i)))} />
                    <span>{item}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <div className={`rounded-2xl p-4 text-sm ${status === 'likely' ? 'bg-primary-soft text-primary' : status === 'check' ? 'bg-subtle text-sub' : 'bg-amber-50 text-amber-800'}`} role="status">
              <p className="font-semibold">{t(`u.status.${status}`)}</p>
              <p className="mt-1">{t(`u.statusDesc.${status}`)}</p>
            </div>
          </div>

          {/* 핵심 결과 */}
          <div className="ui-card p-6">
            <p className="text-sm text-muted">{t('u.result.totalLabel', { days: r.days })}</p>
            <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.total)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              {[
                { k: 'daily', v: won(r.daily), s: r.applied === 'none' ? t('u.result.dailySub') : t(`u.result.applied.${r.applied}`) },
                { k: 'days', v: t('u.daysN', { n: r.days }), s: t('u.result.daysSub', { m: (r.days / 30).toFixed(1) }) },
                { k: 'per4w', v: won(r.per4w), s: t('u.result.per4wSub') },
              ].map((c) => (
                <div key={c.k} className="bg-subtle rounded-2xl p-4">
                  <p className="text-xs text-muted">{t(`u.result.${c.k}`)}</p>
                  <p className="text-xl font-bold text-fg tabular-nums mt-1">{c.v}</p>
                  <p className="text-xs text-muted mt-0.5">{c.s}</p>
                </div>
              ))}
            </div>

            <details className="mt-5">
              <summary className="text-sm font-medium text-body cursor-pointer">{t('u.basis.title')}</summary>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  [t('u.basis.avgDaily'), mode === 'day' ? won(r.avgDaily) : t('u.basis.avgDailyCalc', { total: won((mode === 'year' ? amount / 12 : amount) * 3), days: r.days3m, v: won(r.avgDaily) })],
                  [t('u.basis.raw'), won(r.raw)],
                  [t('u.basis.cap'), won(DAILY_CAP)],
                  [t('u.basis.floor', { h: hours }), won(r.floor)],
                  [t('u.basis.daily'), won(r.daily)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-sub">{k}</dt><dd className="text-fg tabular-nums text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted mt-2">{t('u.basis.note')}</p>
            </details>

            <ShareResult
              className="mt-5"
              card={{
                tool: t('title'),
                label: t('u.share.label', { days: r.days }),
                headline: won(r.total),
                sub: t('u.share.sub', { daily: won(r.daily) }),
                rows: [
                  { label: t('u.result.daily'), value: won(r.daily) },
                  { label: t('u.result.days'), value: t('u.daysN', { n: r.days }) },
                  { label: t('u.result.per4w'), value: won(r.per4w) },
                  { label: t('u.early.bonus'), value: won(earlyBonus(r.daily, r.days, 0).bonus) },
                ],
              }}
              text={t('u.share.text', { days: r.days, total: won(r.total) })}
              fileName="unemployment-benefit"
            />
          </div>

          {/* 지급 일정 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.sched.title')}</h2>
            <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {([
                ['leave', leaveDate], ['apply', r.apply], ['start', r.start], ['end', r.end],
              ] as const).map(([k, d]) => (
                <li key={k} className="bg-subtle rounded-2xl p-4">
                  <p className="text-xs text-muted">{t(`u.sched.${k}`)}</p>
                  <p className="font-semibold text-fg tabular-nums mt-0.5">{d}</p>
                </li>
              ))}
            </ol>
            <details className="mt-4" open>
              <summary className="text-sm font-medium text-body cursor-pointer">{t('u.sched.listTitle', { n: r.sched.length })}</summary>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-sub text-left">
                      <th className="py-2 pr-3 font-medium">{t('u.sched.colN')}</th>
                      <th className="py-2 pr-3 font-medium">{t('u.sched.colDate')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{t('u.sched.colDays')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{t('u.sched.colAmount')}</th>
                      <th className="py-2 font-medium text-right">{t('u.sched.colCum')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.sched.map((s) => (
                      <tr key={s.n} className="border-t border-line">
                        <td className="py-2 pr-3 text-body">{t('u.sched.nth', { n: s.n })}</td>
                        <td className="py-2 pr-3 text-fg">{s.date}</td>
                        <td className="py-2 pr-3 text-right text-body">{t('u.daysN', { n: s.payDays })}</td>
                        <td className="py-2 pr-3 text-right text-fg">{won(s.amount)}</td>
                        <td className="py-2 text-right text-sub">{won(s.cumulative)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="text-xs text-muted mt-3">{t('u.sched.note', { expire: r.expire })}</p>
          </div>

          {/* 조기재취업수당 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.early.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('u.early.desc', { last: lastDay, date: addDays(r.start, lastDay) })}</p>
            <label htmlFor="ub-paid" className="block text-sm text-body mt-5">
              {t('u.early.slider', { n: paid, date: addDays(r.start, paid) })}
            </label>
            <input id="ub-paid" type="range" min={0} max={r.days} value={paid}
              onChange={(e) => setPaidDays(Number(e.target.value))} className="w-full mt-2 accent-[var(--primary)]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-xs text-muted">{t('u.early.received')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{won(r.daily * paid)}</p>
              </div>
              <div className={`rounded-2xl p-4 ${early.eligible ? 'bg-primary-soft' : 'bg-subtle'}`}>
                <p className="text-xs text-muted">{t('u.early.bonus')}</p>
                <p className={`text-lg font-bold tabular-nums mt-1 ${early.eligible ? 'text-primary' : 'text-faint'}`}>{won(early.bonus)}</p>
                <p className="text-xs text-muted mt-0.5">{early.eligible ? t('u.early.remain', { n: early.remaining }) : t('u.early.notEligible')}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-xs text-muted">{t('u.early.total')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{won(early.total)}</p>
                <p className="text-xs text-muted mt-0.5">{t('u.early.plusSalary')}</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-3">{t('u.early.note')}</p>
          </div>
        </div>
      </div>

      {/* 소정급여일수 표 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-1">{t('u.table.title')}</h2>
        <p className="text-sm text-muted mb-4">{t('u.table.desc')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-subtle">
                <th className="px-3 py-2 text-left text-sub font-medium">{t('u.table.head')}</th>
                {PERIODS.map((p) => <th key={p} className="px-3 py-2 text-center text-sub font-medium">{t(`u.period.${p}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {AGES.map((a) => (
                <tr key={a} className="border-t border-line">
                  <td className="px-3 py-3 text-body font-medium">{t(`u.age.${a}`)}</td>
                  {BENEFIT_DAYS[a].map((d, i) => {
                    const on = a === age && PERIODS[i] === period
                    return (
                      <td key={i} className={`px-3 py-3 text-center font-semibold tabular-nums ${on ? 'bg-primary-soft text-primary' : 'text-fg'}`}>
                        {t('u.daysN', { n: d })}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-fg mb-4">{t('u.steps.title')}</h2>
          <ol className="space-y-3">
            {(t.raw('u.steps.items') as string[]).map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-body">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['know', 'extended'] as const).map((k) => (
            <section key={k} className="bg-subtle rounded-2xl p-5">
              <h3 className="font-semibold text-fg mb-3">{t(`u.${k}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
                {(t.raw(`u.${k}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <section className="bg-amber-50 text-amber-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-3">{t('u.caution.title')}</h3>
          <ul className="space-y-2 list-disc pl-5 text-sm">
            {(t.raw('u.caution.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-fg mb-4">{t('u.faq.title')}</h2>
          <div className="space-y-2">
            {(t.raw('u.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <details key={i} className="bg-subtle rounded-2xl p-4">
                <summary className="font-medium text-fg cursor-pointer">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-semibold text-fg mb-3">{t('u.links.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {LINKS.map((l) => (
              <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-soft hover:bg-subtle text-body text-sm">
                {t(`u.links.${l.key}`)} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">{t('u.links.note', { floor8: won(dailyFloor(8)) })}</p>
        </section>
      </div>
    </div>
  )
}
