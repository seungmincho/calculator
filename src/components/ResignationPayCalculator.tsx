'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/resignationPay'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { isDate } from '@/utils/retirementPay'
import { addDays } from '@/utils/dday'
import { compute, simulate, DEF, REASONS, type Input, type Reason } from '@/utils/resignationPay'

// 계산은 resignationPay.ts → 퇴직금·연차·실업급여·연말정산 util (각 상세 계산기와 같은 함수).
// URL: s 입사일 · last 마지막 근무일 · pay 월급 · bonus 연간 상여 · rem 남은 연차 | used 사용한 연차 · reason · age · dis=1 장애 · dep 부양가족
const MAX = 10_000_000_000
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const fmtDays = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const dot = (d: string) => d.replaceAll('-', '.')
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Math.min(Number(v), MAX) : null)
const dayNum = (v: string | null) => (v && /^\d{1,3}(\.\d{1,2})?$/.test(v) ? Number(v) : null)

function fromParams(sp: { get(k: string): string | null }): Input {
  const date = (k: string) => { const v = sp.get(k); return isDate(v) ? v : null }
  const used = dayNum(sp.get('used'))
  const reason = sp.get('reason') ?? ''
  const age = amount(sp.get('age'))
  return {
    start: date('s') ?? DEF.start, last: date('last') ?? DEF.last,
    monthly: amount(sp.get('pay')) ?? DEF.monthly, bonus: amount(sp.get('bonus')) ?? DEF.bonus,
    leaveMode: used !== null ? 'used' : 'remaining', leaveDays: used ?? dayNum(sp.get('rem')) ?? DEF.leaveDays,
    reason: (REASONS as readonly string[]).includes(reason) ? (reason as Reason) : DEF.reason,
    age: age !== null && age >= 15 && age <= 100 ? age : DEF.age,
    disabled: sp.get('dis') === '1',
    dependents: Math.min(amount(sp.get('dep')) ?? DEF.dependents, 10),
  }
}

function toQuery(x: Input) {
  const q = new URLSearchParams({ s: x.start, last: x.last, pay: String(x.monthly) })
  if (x.bonus) q.set('bonus', String(x.bonus))
  q.set(x.leaveMode === 'used' ? 'used' : 'rem', String(x.leaveDays))
  q.set('reason', x.reason)
  q.set('age', String(x.age))
  if (x.disabled) q.set('dis', '1')
  if (x.dependents) q.set('dep', String(x.dependents))
  return q.toString()
}
const DEF_QUERY = toQuery(DEF)

function MoneyInput({ id, label, value, onChange, hint, unit }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder="0"
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, MAX))}
          className="ui-field w-full px-4 py-3 pr-14 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function Rows({ rows }: { rows: [string, string, boolean?][] }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map(([k, v, strong]) => (
        <div key={k} className={`flex justify-between gap-3 ${strong ? 'border-t border-line pt-1.5' : ''}`}>
          <dt className={strong ? 'font-semibold text-fg' : 'text-sub'}>{k}</dt>
          <dd className={`tabular-nums text-right ${strong ? 'font-bold text-fg' : 'text-fg'}`}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function ResignationPayCalculator() {
  const t = useTranslations('resignationPay')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo(() => (hydrated ? fromParams(sp) : DEF), [hydrated, sp])
  const [edited, setEdited] = useState<Input | null>(null)
  const x = edited ?? fromUrl

  // 값 → URL. 기본값이면 쿼리 없음
  const update = (patch: Partial<Input>) => {
    const next = { ...x, ...patch }
    setEdited(next)
    const q = toQuery(next)
    window.history.replaceState(window.history.state, '', q === DEF_QUERY ? window.location.pathname : `?${q}`)
  }

  const r = compute(x)
  const sim = r ? simulate(x, r) : []
  const W = t('won')
  const money = (n: number) => `${won(n)}${W}`
  const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${won(Math.abs(n))}${W}`

  const links = r && {
    sev: `/retirement-calculator/?${new URLSearchParams({ s: x.start, e: r.end, pay: String(x.monthly), bonus: String(x.bonus), leave: '0' })}`,
    leave: `/annual-leave/?${new URLSearchParams({ join: x.start, ref: x.last, out: '1', pay: String(x.monthly), [x.leaveMode === 'used' ? 'used' : 'rem']: String(x.leaveDays) })}`,
    ue: `/unemployment-benefit/?${new URLSearchParams({ mode: 'month', amt: String(Math.round(x.monthly + x.bonus / 12)), age: r.ue.ageGroup, period: r.ue.period, reason: x.reason === 'voluntary' ? 'voluntary' : 'involuntary', leave: x.last })}`,
    tax: `/year-end-tax/?${new URLSearchParams({ s: String(r.tax.salary), pp: String(r.tax.prepaid), cc: '0', dc: '0', tr: '0', ...(x.dependents ? { ot: String(x.dependents) } : {}) })}`,
  }

  const card = r && {
    tool: t('title'),
    label: t('share.label', { last: dot(x.last) }),
    headline: money(r.total),
    sub: r.ue.eligible ? t('share.sub', { ue: money(r.ue.total) }) : t('share.subNoUe'),
    rows: [
      { label: t('sev.title'), value: money(r.sev.net) },
      { label: t('leave.title'), value: money(r.leavePay) },
      { label: t('tax.title'), value: signed(r.tax.refund) },
      ...(r.ue.eligible ? [{ label: t('ue.title'), value: money(r.ue.total) }] : []),
    ],
  }

  const ueYearChange = sim.find((s) => s.ueDaily !== sim[0]?.ueDaily)
  const label = 'block text-sm font-medium text-body mb-2'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 min-w-0">
          <div className="ui-card p-6 space-y-5">
            {r && <MobileResultLink href="#resignation-pay-result" label={t('total.label')} value={money(r.total)} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
              <div>
                <label htmlFor="rp-start" className={label}>{t('in.start')}</label>
                <input id="rp-start" type="date" value={x.start} min="1960-01-01" max={x.last}
                  onChange={(e) => { if (isDate(e.target.value)) update({ start: e.target.value }) }} className="ui-field w-full px-4 py-3" />
              </div>
              <div>
                <label htmlFor="rp-last" className={label}>{t('in.last')}</label>
                <input id="rp-last" type="date" value={x.last} min={x.start} max="2099-12-31" aria-describedby="rp-last-hint"
                  onChange={(e) => { if (isDate(e.target.value)) update({ last: e.target.value }) }} className="ui-field w-full px-4 py-3" />
                <p id="rp-last-hint" className="text-xs text-muted mt-1.5">{t('in.lastHint')}</p>
              </div>
            </div>

            <MoneyInput id="rp-pay" label={t('in.pay')} value={x.monthly} onChange={(n) => update({ monthly: n })} unit={W} hint={t('in.payHint')} />
            <MoneyInput id="rp-bonus" label={t('in.bonus')} value={x.bonus} onChange={(n) => update({ bonus: n })} unit={W} hint={t('in.bonusHint')} />

            <fieldset className="border-t border-line pt-5">
              <legend className="text-sm font-medium text-body">{t('in.leave.label')}</legend>
              {r && (
                <p className="text-xs text-muted mt-1">
                  {r.lv.active > 0 ? t('in.leave.available', { days: fmtDays(r.lv.active) }) : t('in.leave.none')}
                </p>
              )}
              <div className="grid grid-cols-2 gap-1 p-1 mt-3 rounded-xl bg-soft">
                {(['remaining', 'used'] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={x.leaveMode === m} onClick={() => update({ leaveMode: m })}
                    className={`min-h-11 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${x.leaveMode === m ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}>
                    {t(`in.leave.${m}`)}
                  </button>
                ))}
              </div>
              <label htmlFor="rp-leave" className="sr-only">{t(`in.leave.${x.leaveMode}`)}</label>
              <div className="relative mt-2">
                <input id="rp-leave" type="number" inputMode="decimal" min={0} max={365} step={0.5} value={x.leaveDays}
                  onChange={(e) => update({ leaveDays: Math.min(365, Math.max(0, Number(e.target.value) || 0)) })}
                  className="ui-field w-full px-4 py-3 pr-12 tabular-nums" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('dayUnit')}</span>
              </div>
            </fieldset>

            <div className="border-t border-line pt-5">
              <label htmlFor="rp-reason" className={label}>{t('in.reason')}</label>
              <select id="rp-reason" value={x.reason} onChange={(e) => update({ reason: e.target.value as Reason })}
                aria-describedby="rp-reason-hint" className="ui-field w-full px-4 py-3">
                {REASONS.map((k) => <option key={k} value={k}>{t(`reasons.${k}.label`)}</option>)}
              </select>
              <p id="rp-reason-hint" className="text-xs text-muted mt-1.5">
                {t(`reasons.${x.reason}.hint`)}{' '}
                {x.reason === 'voluntary' && <a href="#resignation-pay-exceptions" className="text-primary font-medium hover:underline">{t('reasons.exceptionsLink')}</a>}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rp-age" className={label}>{t('in.age')}</label>
                <input id="rp-age" type="number" inputMode="numeric" min={15} max={100} value={x.age}
                  onChange={(e) => update({ age: Math.min(100, Math.max(0, Math.floor(Number(e.target.value)) || 0)) })}
                  className="ui-field w-full px-4 py-3 tabular-nums" />
              </div>
              <div>
                <label htmlFor="rp-dep" className={label}>{t('in.dependents')}</label>
                <input id="rp-dep" type="number" inputMode="numeric" min={0} max={10} value={x.dependents} aria-describedby="rp-dep-hint"
                  onChange={(e) => update({ dependents: Math.min(10, Math.max(0, Math.floor(Number(e.target.value)) || 0)) })}
                  className="ui-field w-full px-4 py-3 tabular-nums" />
              </div>
            </div>
            <p id="rp-dep-hint" className="text-xs text-muted -mt-3">{t('in.dependentsHint')}</p>
            <label className="flex items-center gap-2 min-h-11 text-sm text-body">
              <input type="checkbox" checked={x.disabled} onChange={(e) => update({ disabled: e.target.checked })} className="w-4 h-4 accent-primary" />
              {t('in.disabled')}
            </label>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-6">
          {!r ? (
            <div id="resignation-pay-result" className="ui-card p-6 scroll-mt-20" aria-live="polite">
              <p className="text-sm text-sub">{t('in.invalid')}</p>
            </div>
          ) : (
            <>
              <div id="resignation-pay-result" className="ui-card p-6 space-y-5 scroll-mt-20">
                <div aria-live="polite">
                  <p className="text-sm text-muted">{t('total.label')}</p>
                  <p className="text-3xl font-bold text-fg tabular-nums mt-1">{money(r.total)}</p>
                  <p className="text-sm text-sub mt-1">
                    {r.ue.eligible ? t('total.withUe', { sure: money(r.sure), ue: money(r.ue.total) }) : t('total.noUe', { sure: money(r.sure) })}
                  </p>
                </div>
                <Rows rows={[
                  [t('sev.net'), money(r.sev.net)],
                  [t('leave.title'), money(r.leavePay)],
                  [r.tax.refund >= 0 ? t('tax.refund') : t('tax.extra'), signed(r.tax.refund)],
                  [r.ue.eligible ? t('ue.ifEligible') : t('ue.notEligibleShort'), r.ue.eligible ? money(r.ue.total) : money(0)],
                  [t('total.label'), money(r.total), true],
                ]} />
                <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{t('total.payBy', { date: dot(r.payBy) })}</p>
                {card && <ShareResult card={card} text={t('share.text', { last: dot(x.last), total: money(r.total) })} fileName="resignation-pay" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 퇴직금 */}
                <section aria-labelledby="rp-sev" className="ui-card p-6 space-y-4 min-w-0">
                  <h2 id="rp-sev" className="text-lg font-semibold text-fg">{t('sev.title')}</h2>
                  {r.sev.eligible ? (
                    <>
                      <Rows rows={[
                        [t('sev.avg'), money(Math.floor(r.sev.avgDaily))],
                        [t('sev.days'), t('sev.daysValue', { days: won(r.sev.days), years: Math.round(r.sev.days / 36.5) / 10 })],
                        [t('sev.gross'), money(r.sev.pay)],
                        [t('sev.tax'), money(r.sev.totalTax)],
                        [t('sev.net'), money(r.sev.net), true],
                      ]} />
                      <p className="text-xs text-muted">{t('sev.irp', { tax: money(r.sev.irp70) })}</p>
                    </>
                  ) : (
                    <p className="text-sm text-sub">{t('sev.none', { date: dot(addDays(r.sev.oneYearEnd, -1)), days: won(r.sev.daysToEligible) })}</p>
                  )}
                  <Link href={links!.sev} className="ui-btn-soft inline-flex items-center min-h-11 px-4 py-2 text-sm">{t('sev.link')}</Link>
                </section>

                {/* 연차수당 */}
                <section aria-labelledby="rp-leave-pay" className="ui-card p-6 space-y-4 min-w-0">
                  <h2 id="rp-leave-pay" className="text-lg font-semibold text-fg">{t('leave.title')}</h2>
                  <Rows rows={[
                    [t('leave.daily'), money(r.daily)],
                    [t('leave.days'), t('leave.daysValue', { days: fmtDays(r.unused) })],
                    [t('leave.title'), money(r.leavePay), true],
                  ]} />
                  <p className="text-xs text-muted">{t('leave.note')}</p>
                  <Link href={links!.leave} className="ui-btn-soft inline-flex items-center min-h-11 px-4 py-2 text-sm">{t('leave.link')}</Link>
                </section>

                {/* 실업급여 */}
                <section aria-labelledby="rp-ue" className="ui-card p-6 space-y-4 min-w-0">
                  <h2 id="rp-ue" className="text-lg font-semibold text-fg">{t('ue.title')}</h2>
                  {!r.ue.involuntary ? (
                    <p className="text-sm text-sub">
                      {t('ue.voluntary', { total: money(r.ue.total) })}{' '}
                      <a href="#resignation-pay-exceptions" className="text-primary font-medium hover:underline">{t('reasons.exceptionsLink')}</a>
                    </p>
                  ) : !r.ue.insuredOk ? (
                    <p className="text-sm text-sub">{t('ue.short', { unit: won(r.ue.unitDays), min: 180 })}</p>
                  ) : null}
                  <Rows rows={[
                    [t('ue.daily'), money(r.ue.daily)],
                    [t('ue.days'), t('ue.daysValue', { days: r.ue.days })],
                    [r.ue.eligible ? t('ue.total') : t('ue.totalIf'), money(r.ue.total), true],
                  ]} />
                  <p className="text-xs text-muted">
                    {t(`ue.applied.${r.ue.applied}`, { cap: money(r.ue.daily), floor: money(r.ue.floor), year: x.last.slice(0, 4) })}{' '}
                    {t('ue.applyUntil', { date: dot(r.ue.applyUntil) })}
                  </p>
                  <Link href={links!.ue} className="ui-btn-soft inline-flex items-center min-h-11 px-4 py-2 text-sm">{t('ue.link')}</Link>
                </section>

                {/* 중도퇴사 연말정산 */}
                <section aria-labelledby="rp-tax" className="ui-card p-6 space-y-4 min-w-0">
                  <h2 id="rp-tax" className="text-lg font-semibold text-fg">{t('tax.title')}</h2>
                  <Rows rows={[
                    [t('tax.salary', { year: r.tax.year }), money(r.tax.salary)],
                    [t('tax.prepaid'), money(r.tax.prepaid)],
                    [t('tax.determined'), money(r.tax.determined)],
                    [r.tax.refund >= 0 ? t('tax.refund') : t('tax.extra'), signed(r.tax.refund), true],
                  ]} />
                  <p className="text-xs text-muted">{t('tax.note', { year: r.tax.year + 1 })}</p>
                  <Link href={links!.tax} className="ui-btn-soft inline-flex items-center min-h-11 px-4 py-2 text-sm">{t('tax.link')}</Link>
                </section>
              </div>

              {/* 퇴사일 바꿔 보기 */}
              <section aria-labelledby="rp-sim" className="ui-card p-6 space-y-4">
                <div>
                  <h2 id="rp-sim" className="text-lg font-semibold text-fg">{t('sim.title')}</h2>
                  <p className="text-sm text-muted mt-1">{t('sim.desc')}</p>
                </div>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <caption className="sr-only">{t('sim.title')}</caption>
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th scope="col" className="text-left font-medium py-2 pr-2">{t('sim.cols.last')}</th>
                        <th scope="col" className="text-right font-medium py-2 px-2">{t('sim.cols.sev')}</th>
                        <th scope="col" className="text-right font-medium py-2 px-2">{t('sim.cols.leave')}</th>
                        <th scope="col" className="text-right font-medium py-2 px-2">{t('sim.cols.ue')}</th>
                        <th scope="col" className="text-right font-medium py-2 pl-2">{t('sim.cols.sum')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.map((s) => (
                        <tr key={s.key} className={`border-b border-line ${s.key === 'now' ? 'bg-primary-soft' : ''}`}>
                          <th scope="row" className="text-left font-medium py-3 pr-2 text-body whitespace-nowrap">
                            {dot(s.last)}
                            <span className={`block text-xs font-normal ${s.key === 'now' ? 'text-primary' : 'text-muted'}`}>{t(`sim.rows.${s.key}`, { added: fmtDays(s.added) })}</span>
                          </th>
                          <td className="text-right py-3 px-2 text-sub">{s.sevEligible ? won(s.sev) : t('sim.none')}</td>
                          <td className="text-right py-3 px-2 text-sub">{won(s.leavePay)}</td>
                          <td className="text-right py-3 px-2 text-sub">{s.ue ? won(s.ue) : t('sim.none')}</td>
                          <td className="text-right py-3 pl-2 font-semibold text-fg">{won(s.sum)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted">
                  {t('sim.note')}
                  {ueYearChange && r.ue.eligible && <> {t('sim.ueYear', { year: ueYearChange.last.slice(0, 4), daily: money(ueYearChange.ueDaily) })}</>}
                </p>
              </section>

              {/* 퇴사 후 할 일 */}
              <section aria-labelledby="rp-todo" className="ui-card p-6 space-y-4">
                <h2 id="rp-todo" className="text-lg font-semibold text-fg">{t('todo.title')}</h2>
                <ol className="list-decimal pl-5 space-y-3 marker:text-primary marker:font-semibold">
                  {(['pay', 'ue', 'health', 'irp', 'may'] as const).map((k) => (
                    <li key={k}>
                      <p className="text-sm font-semibold text-fg">{t(`todo.${k}.title`, { date: dot(r.payBy), until: dot(r.ue.applyUntil), year: r.tax.year + 1 })}</p>
                      <p className="text-sm text-sub mt-0.5">{t(`todo.${k}.desc`, { from: dot(r.ue.applyFrom), until: dot(r.ue.applyUntil), year: r.tax.year + 1 })}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </div>

      {/* 자발적 퇴사여도 실업급여를 받는 경우 */}
      <section id="resignation-pay-exceptions" aria-labelledby="rp-exc" className="ui-card p-6 space-y-3 scroll-mt-20">
        <h2 id="rp-exc" className="text-lg font-semibold text-fg">{t('exceptions.title')}</h2>
        <p className="text-sm text-sub">{t('exceptions.desc')}</p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('exceptions.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
        <Link href="/unemployment-benefit/?reason=just" className="ui-btn-soft inline-flex items-center min-h-11 px-4 py-2 text-sm">{t('exceptions.link')}</Link>
        <p className="text-xs text-muted">{t('source')}</p>
      </section>
    </div>
  )
}
