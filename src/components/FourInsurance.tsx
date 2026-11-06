'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/fourInsurance'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { INSURANCE, INSURANCE_YEARS, insuranceFor, isInsuranceYear, pct, type InsuranceYear } from '@/utils/insuranceRates'
import { ACCIDENT_AVG, COMPANY_SIZES, ITEMS, STABILITY_RATE, fourInsurance, type CompanySize } from '@/utils/fourInsurance'

type PayType = 'monthly' | 'annual'
interface Form { type: PayType; pay: number; nt: number; size: CompanySize; acc: number; year: InsuranceYear }
const MAX_PAY = 10_000_000_000
const DEFAULT_PAY: Record<PayType, number> = { monthly: 3_000_000, annual: 36_000_000 }
const num = (v: string | null, max: number) => {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null
}
const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const seg = (on: boolean) => `flex-1 min-h-[44px] py-2.5 rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`

export default function FourInsurance() {
  const t = useTranslations('fourInsurance')
  const sp = useSearchParams()
  // Static HTML uses the defaults; a shared link's values are read after hydration.
  const hydrated = useHydrated()
  const q = (k: string) => (hydrated ? sp.get(k) : null)
  const urlType: PayType = q('type') === 'annual' ? 'annual' : 'monthly'
  const urlSize = q('size')
  const fromUrl: Form = {
    type: urlType,
    pay: num(q('pay'), MAX_PAY) ?? DEFAULT_PAY[urlType],
    nt: num(q('nt'), MAX_PAY) ?? 200_000,
    size: COMPANY_SIZES.find((s) => s === urlSize) ?? 'under150',
    acc: num(q('acc'), 20) ?? ACCIDENT_AVG * 100,
    year: isInsuranceYear(q('year')) ? (Number(q('year')) as InsuranceYear) : INSURANCE.year,
  }
  const [edited, setEdited] = useState<Form | null>(null)
  const f = edited ?? fromUrl
  const set = (patch: Partial<Form>) => {
    const next = { ...f, ...patch }
    setEdited(next)
    history.replaceState(null, '', `?${new URLSearchParams({ type: next.type, pay: String(next.pay), nt: String(next.nt), size: next.size, acc: String(next.acc), year: String(next.year) })}`)
  }
  const switchType = (type: PayType) => { if (type !== f.type) set({ type, pay: type === 'annual' ? f.pay * 12 : Math.floor(f.pay / 12) }) }

  const monthlyGross = f.type === 'annual' ? Math.floor(f.pay / 12) : f.pay
  const base = Math.max(0, monthlyGross - f.nt)
  const r = fourInsurance(base, f.year, f.size, f.acc / 100)
  const otherYear: InsuranceYear = f.year === 2026 ? 2027 : 2026
  const o = fourInsurance(base, otherYear, f.size, f.acc / 100)
  const OR = insuranceFor(otherYear)
  const won = (n: number) => `${fmt(n)}${t('won')}`
  const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmt(Math.abs(n))}${t('won')}`
  const rateText = (k: (typeof ITEMS)[number]) => {
    const R = insuranceFor(f.year)
    const rate = { pension: R.pensionRate, health: R.healthRate, ltc: R.longTermCareRate, employment: R.employmentRate, stability: STABILITY_RATE[f.size], accident: f.acc / 100 }[k]
    return t(`rates.${k}`, { rate: pct(rate) })
  }
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            {r && <MobileResultLink href="#four-insurance-result" label={t('employeeTotal')} value={won(r.employee)} />}
            <div>
              <p id="fi-year-label" className="block text-sm font-medium text-body mb-2">{t('yearLabel')}</p>
              <div className="flex p-1 rounded-2xl bg-soft" role="group" aria-labelledby="fi-year-label">
                {INSURANCE_YEARS.map((y) => <button key={y} type="button" aria-pressed={f.year === y} onClick={() => set({ year: y })} className={seg(f.year === y)}>{t('yearOption', { year: y })}</button>)}
              </div>
            </div>
            <div>
              <p id="fi-type-label" className="block text-sm font-medium text-body mb-2">{t('typeLabel')}</p>
              <div className="flex p-1 rounded-2xl bg-soft" role="group" aria-labelledby="fi-type-label">
                {(['monthly', 'annual'] as const).map((ty) => <button key={ty} type="button" aria-pressed={f.type === ty} onClick={() => switchType(ty)} className={seg(f.type === ty)}>{t(`types.${ty}`)}</button>)}
              </div>
            </div>
            <div>
              <label htmlFor="fi-pay" className="block text-sm font-medium text-body mb-2">{t(`payLabel.${f.type}`)}</label>
              <div className="relative">
                <input id="fi-pay" inputMode="numeric" value={f.pay ? fmt(f.pay) : ''} onChange={(e) => set({ pay: Math.min(MAX_PAY, Number(e.target.value.replace(/[^\d]/g, '')) || 0) })} className="ui-field w-full px-4 py-3 pr-10 text-right tabular-nums" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sub text-sm">{t('won')}</span>
              </div>
            </div>
            <div>
              <label htmlFor="fi-nt" className="block text-sm font-medium text-body mb-2">{t('nonTaxableLabel')}</label>
              <div className="relative">
                <input id="fi-nt" inputMode="numeric" value={fmt(f.nt)} onChange={(e) => set({ nt: Math.min(MAX_PAY, Number(e.target.value.replace(/[^\d]/g, '')) || 0) })} className="ui-field w-full px-4 py-3 pr-10 text-right tabular-nums" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sub text-sm">{t('won')}</span>
              </div>
              <p className="text-xs text-muted mt-2">{t('nonTaxableHint')}</p>
            </div>
            <div>
              <label htmlFor="fi-size" className="block text-sm font-medium text-body mb-2">{t('sizeLabel')}</label>
              <select id="fi-size" value={f.size} onChange={(e) => { const s = COMPANY_SIZES.find((x) => x === e.target.value); if (s) set({ size: s }) }} className="ui-field w-full px-4 py-3 min-h-[44px]">
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{t(`sizes.${s}`)} ({pct(STABILITY_RATE[s])})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="fi-acc" className="block text-sm font-medium text-body mb-2">{t('accidentLabel')}</label>
              <input id="fi-acc" type="number" inputMode="decimal" min={0} max={20} step={0.01} value={f.acc} onChange={(e) => set({ acc: Math.min(20, Math.max(0, Number(e.target.value) || 0)) })} className="ui-field w-full px-4 py-3 text-right tabular-nums" />
              <p className="text-xs text-muted mt-2">{t('accidentHint', { avg: pct(ACCIDENT_AVG) })}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {r && (
            <div id="four-insurance-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
              <p className="text-sm text-sub">{t('resultLabel', { year: f.year, base: fmt(r.base) })}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><p className="text-xs text-muted">{t('employeeTotal')}</p><p className="text-3xl font-bold text-fg tabular-nums">{won(r.employee)}</p></div>
                <div><p className="text-xs text-muted">{t('employerTotal')}</p><p className="text-2xl font-bold text-fg tabular-nums sm:mt-1">{won(r.employer)}</p></div>
                <div><p className="text-xs text-muted">{t('laborCost')}</p><p className="text-2xl font-bold text-fg tabular-nums sm:mt-1">{won(monthlyGross + r.employer)}</p></div>
              </div>
              <p className="text-sm text-sub">{t('annualNote', { employee: fmt(r.employee * 12), employer: fmt(r.employer * 12) })}</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t('table.title')}</caption>
                  <thead>
                    <tr className="text-left text-muted border-b border-line">
                      <th scope="col" className="py-2 font-medium">{t('table.item')}</th>
                      <th scope="col" className="py-2 font-medium text-right">{t('table.employee')}</th>
                      <th scope="col" className="py-2 font-medium text-right">{t('table.employer')}</th>
                      <th scope="col" className="py-2 font-medium text-right">{t('table.total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ITEMS.map((k) => (
                      <tr key={k}>
                        <th scope="row" className="py-2.5 text-left font-normal"><span className="text-body">{t(`items.${k}`)}</span><span className="block text-xs text-muted">{rateText(k)}</span></th>
                        <td className="py-2.5 text-right tabular-nums text-fg">{r.rows[k].employee ? won(r.rows[k].employee) : '—'}</td>
                        <td className="py-2.5 text-right tabular-nums text-fg">{won(r.rows[k].employer)}</td>
                        <td className="py-2.5 text-right tabular-nums text-sub">{won(r.rows[k].employee + r.rows[k].employer)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <th scope="row" className="py-2.5 text-left text-fg">{t('table.sum')}</th>
                      <td className="py-2.5 text-right tabular-nums text-fg">{won(r.employee)}</td>
                      <td className="py-2.5 text-right tabular-nums text-fg">{won(r.employer)}</td>
                      <td className="py-2.5 text-right tabular-nums text-fg">{won(r.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {(r.pensionClamp || r.healthClamp || r.proposedExtra > 0 || f.year === 2027) && (
                <ul className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2 list-disc pl-9">
                  {r.pensionClamp === 'cap' && <li>{t('notes.pensionCap', { cap: fmt(r.rates.pensionMonthlyCap) })}</li>}
                  {r.pensionClamp === 'floor' && <li>{t('notes.pensionFloor', { floor: fmt(r.rates.pensionMonthlyFloor) })}</li>}
                  {r.healthClamp && <li>{t('notes.healthCap')}</li>}
                  {r.proposedExtra > 0 && r.rates.employmentProposed && <li>{t('notes.proposed', { rate: pct(r.rates.employmentProposed), amount: fmt(r.proposedExtra) })}</li>}
                  {f.year === 2027 && <li>{t('notes.accident2027')}</li>}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <Link href="/salary-calculator/" className="ui-btn px-4 py-3 text-sm inline-flex items-center min-h-[44px]">{t('links.salary')}</Link>
                <Link href="/pay-slip/" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center min-h-[44px]">{t('links.payslip')}</Link>
                <Link href="/health-insurance/" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center min-h-[44px]">{t('links.health')}</Link>
              </div>

              <ShareResult
                card={{
                  tool: t('title'),
                  label: t('resultLabel', { year: f.year, base: fmt(r.base) }),
                  headline: won(r.employee),
                  sub: t('share.sub', { cost: fmt(monthlyGross + r.employer) }),
                  rows: [{ label: t('employerTotal'), value: won(r.employer) }, ...(o ? [{ label: t('compare.title', { year: otherYear }), value: signed(r.employee - o.employee) }] : [])],
                }}
                text={t('share.text', { year: f.year, pay: fmt(monthlyGross), employee: fmt(r.employee), employer: fmt(r.employer) })}
              />
            </div>
          )}

          {r && o && (
            <div className="ui-card p-6 space-y-3">
              <h2 className="text-xl font-semibold text-fg">{t('compare.title', { year: otherYear })}</h2>
              <p className="text-lg font-semibold text-fg tabular-nums">{t('compare.employee', { diff: signed(r.employee - o.employee) })} · {t('compare.employer', { diff: signed(r.employer - o.employer) })}</p>
              <p className="text-sm text-sub">{t('compare.rates', { year: otherYear, pension: pct(OR.pensionRate), health: pct(OR.healthRate), ltc: pct(OR.longTermCareRate), employment: pct(OR.employmentRate) })}</p>
            </div>
          )}
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['basics', 'y2027', 'employer'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((x) => (
              <details key={x.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{x.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{x.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
