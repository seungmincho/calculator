'use client'

import { useState, useEffect, useMemo, useId } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/healthInsurance'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import { INSURANCE, pct } from '@/utils/insuranceRates'
import { HI, workplace, extraIncome, regional, dependent, afterRetirement, type Relation } from '@/utils/healthInsurance'

type Tab = 'workplace' | 'regional' | 'dependent' | 'retire'
const TABS: Tab[] = ['workplace', 'regional', 'dependent', 'retire']
const RELATIONS: Relation[] = ['spouse', 'parent', 'child', 'grandparent', 'grandchild', 'sibling']
const TABLE_SALARIES = [30, 40, 50, 60, 70, 80, 100, 150] // 백만원

// URL 파라미터 = 상태. 금액은 숫자 문자열(콤마 없음). 기본값이면 URL에서 생략
const DEFAULTS = {
  tab: 'workplace',
  salary: '3500000', annual: '0', nonTaxable: '200000', extra: '',
  biz: '30000000', fin: '', wage: '', pen: '', oth: '', prop: '150000000', dep: '', rent: '',
  rel: 'parent', dinc: '15000000', dbiz: '', dreg: '0', dprop: '300000000', dsp: '0',
  ravg: '4000000', rprop: '200000000', rdep: '', rpen: '',
}
type Key = keyof typeof DEFAULTS

const n = (s: string) => Number(s) || 0
const fmt = (v: number) => Math.round(v).toLocaleString('ko-KR')

export default function HealthInsuranceCalculator() {
  const t = useTranslations('healthInsurance')
  const searchParams = useSearchParams()
  const [f, setF] = useState(() => {
    const s = { ...DEFAULTS }
    for (const k of Object.keys(DEFAULTS) as Key[]) {
      const v = searchParams.get(k)
      if (v !== null) s[k] = k === 'tab' || k === 'rel' ? v : v.replace(/\D/g, '')
    }
    if (s.tab === 'comparison') s.tab = 'retire' // 예전 탭 링크
    if (!TABS.includes(s.tab as Tab)) s.tab = 'workplace'
    if (!RELATIONS.includes(s.rel as Relation)) s.rel = 'parent'
    return s
  })
  const set = (k: Key) => (v: string) => setF(p => ({ ...p, [k]: v }))
  const tab = f.tab as Tab

  useEffect(() => {
    const url = new URL(window.location.href)
    for (const k of Object.keys(DEFAULTS) as Key[]) {
      if (f[k] === DEFAULTS[k]) url.searchParams.delete(k)
      else url.searchParams.set(k, f[k])
    }
    window.history.replaceState(window.history.state, '', url)
  }, [f])

  const won = (v: number) => `${fmt(v)}${t('unit.won')}`

  // ── 직장 ──
  const wageMonthly = f.annual === '1' ? Math.floor(n(f.salary) / 12) : n(f.salary)
  const base = Math.max(0, wageMonthly - n(f.nonTaxable))
  const wp = workplace(base)
  const ex = extraIncome(n(f.extra))
  const exTotal = ex.health + ex.ltc
  const myMonthly = wp.employeeTotal + exTotal
  const pension = base > 0 ? Math.floor(Math.min(Math.max(base, INSURANCE.pensionMonthlyFloor), INSURANCE.pensionMonthlyCap) * INSURANCE.pensionRate / 10) * 10 : 0
  const employment = Math.floor(base * INSURANCE.employmentRate / 10) * 10

  // ── 지역 ──
  const rg = regional({
    business: n(f.biz), financial: n(f.fin), wage: n(f.wage), pension: n(f.pen), other: n(f.oth),
    propertyTaxBase: n(f.prop), deposit: n(f.dep), monthlyRent: n(f.rent),
  })

  // ── 피부양자 ──
  const dpIn = {
    relation: f.rel as Relation, income: n(f.dinc), business: n(f.dbiz), bizRegistered: f.dreg === '1',
    propertyTaxBase: n(f.dprop), siblingSpecial: f.dsp === '1',
  }
  const dp = dependent(dpIn)
  // 소득 유형을 모르므로 사업 외 소득을 100% 반영한 보수적 추정
  const dpRegional = regional({ business: dpIn.business, other: Math.max(0, dpIn.income - dpIn.business), propertyTaxBase: dpIn.propertyTaxBase }).total

  // ── 퇴직 후 ──
  const rt = afterRetirement(n(f.ravg), { pension: n(f.rpen), propertyTaxBase: n(f.rprop), deposit: n(f.rdep) })
  const rtOptions = [
    { key: 'continued', label: t('rt.optContinued'), value: rt.continued },
    { key: 'withWage', label: t('rt.optWithWage'), value: rt.withWage },
    { key: 'withoutWage', label: t('rt.optWithoutWage'), value: rt.withoutWage },
  ]
  const rtMax = Math.max(...rtOptions.map(o => o.value), 1)
  const rtBest = rtOptions.reduce((a, b) => (b.value < a.value ? b : a))
  const rtSaving = rt.withWage - rt.continued

  const table = useMemo(() => TABLE_SALARIES.map(m => {
    const w = workplace(Math.max(0, Math.floor(m * 1_000_000 / 12) - n(f.nonTaxable)))
    return { salary: m * 100, monthly: w.employeeTotal }
  }), [f.nonTaxable])

  const share = {
    workplace: {
      label: t('share.wpLabel', { wage: won(base) }), headline: won(myMonthly),
      rows: [
        { label: t('wp.health'), value: won(wp.employee.health) },
        { label: t('wp.ltc'), value: won(wp.employee.ltc) },
        { label: t('unit.perYear'), value: won(myMonthly * 12) },
      ],
    },
    regional: {
      label: t('share.rgLabel'), headline: won(rg.total),
      rows: [
        { label: t('rg.incomePremiumShort'), value: won(rg.incomePremium) },
        { label: t('rg.propertyPremiumShort'), value: won(rg.propertyPremium) },
        { label: t('rg.ltcShort'), value: won(rg.ltc) },
      ],
    },
    dependent: {
      label: t('share.dpLabel'), headline: dp.eligible ? t('dp.eligible') : t('dp.notEligible'),
      rows: [
        { label: t('dp.rowIncome'), value: dp.income ? t('dp.pass') : t('dp.fail') },
        { label: t('dp.rowBusiness'), value: dp.business ? t('dp.pass') : t('dp.fail') },
        { label: t('dp.rowProperty'), value: dp.property ? t('dp.pass') : t('dp.fail') },
      ],
    },
    retire: {
      label: t('share.rtLabel'), headline: won(rtBest.value), sub: rtBest.label,
      rows: rtOptions.map(o => ({ label: o.label, value: won(o.value) })),
    },
  }[tab]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-xs text-sub mt-2">
          {t('rateBadge', { rate: pct(HI.rate), ltc: pct(HI.ltcRate, 2), point: HI.pointValue })}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label={t('a11y.tabs')}>
        {TABS.map(id => (
          <button
            key={id}
            type="button"
            id={`hi-tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls="hi-panel"
            onClick={() => set('tab')(id)}
            className={`min-h-10 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${tab === id ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      <div id="hi-panel" role="tabpanel" aria-labelledby={`hi-tab-${tab}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 입력 ── */}
        <div className="ui-card p-6 space-y-4 h-fit">
          {tab === 'workplace' && (
            <>
              <Segment
                label={t('a11y.wageBasis')}
                value={f.annual}
                onChange={set('annual')}
                options={[{ v: '0', label: t('wp.modeMonthly') }, { v: '1', label: t('wp.modeAnnual') }]}
              />
              <Money label={f.annual === '1' ? t('wp.annual') : t('wp.monthly')} value={f.salary} onChange={set('salary')} unit={t('unit.won')} />
              <Money label={t('wp.nonTaxable')} hint={t('wp.nonTaxableHint')} value={f.nonTaxable} onChange={set('nonTaxable')} unit={t('unit.won')} />
              <Money label={t('wp.extra')} hint={t('wp.extraHint')} value={f.extra} onChange={set('extra')} unit={t('unit.won')} />
            </>
          )}
          {tab === 'regional' && (
            <>
              <h2 className="text-sm font-semibold text-fg">{t('rg.income')}</h2>
              <Money label={t('rg.business')} value={f.biz} onChange={set('biz')} unit={t('unit.won')} />
              <Money label={t('rg.financial')} hint={t('rg.financialHint')} value={f.fin} onChange={set('fin')} unit={t('unit.won')} />
              <Money label={t('rg.wage')} hint={t('rg.halfHint')} value={f.wage} onChange={set('wage')} unit={t('unit.won')} />
              <Money label={t('rg.pension')} hint={t('rg.halfHint')} value={f.pen} onChange={set('pen')} unit={t('unit.won')} />
              <Money label={t('rg.other')} value={f.oth} onChange={set('oth')} unit={t('unit.won')} />
              <h2 className="text-sm font-semibold text-fg pt-2">{t('rg.property')}</h2>
              <Money label={t('rg.taxBase')} hint={t('rg.taxBaseHint')} value={f.prop} onChange={set('prop')} unit={t('unit.won')} />
              <Money label={t('rg.deposit')} value={f.dep} onChange={set('dep')} unit={t('unit.won')} />
              <Money label={t('rg.rent')} value={f.rent} onChange={set('rent')} unit={t('unit.won')} />
            </>
          )}
          {tab === 'dependent' && (
            <>
              <label className="block">
                <span className="block text-sm font-medium text-body mb-1.5">{t('dp.relation')}</span>
                <select value={f.rel} onChange={e => set('rel')(e.target.value)} className="ui-field w-full px-4 py-3">
                  {RELATIONS.map(r => <option key={r} value={r}>{t(`dependent.relationships.${r}`)}</option>)}
                </select>
              </label>
              <Money label={t('dp.income')} hint={t('dp.incomeHint')} value={f.dinc} onChange={set('dinc')} unit={t('unit.won')} />
              <Money label={t('dp.business')} value={f.dbiz} onChange={set('dbiz')} unit={t('unit.won')} />
              {n(f.dbiz) > 0 && <Check label={t('dp.bizReg')} checked={f.dreg === '1'} onChange={v => set('dreg')(v ? '1' : '0')} />}
              <Money label={t('dp.taxBase')} hint={t('rg.taxBaseHint')} value={f.dprop} onChange={set('dprop')} unit={t('unit.won')} />
              {f.rel === 'sibling' && <Check label={t('dp.siblingSpecial')} checked={f.dsp === '1'} onChange={v => set('dsp')(v ? '1' : '0')} />}
            </>
          )}
          {tab === 'retire' && (
            <>
              <Money label={t('rt.avgWage')} hint={t('rt.avgWageHint')} value={f.ravg} onChange={set('ravg')} unit={t('unit.won')} />
              <Money label={t('rg.taxBase')} hint={t('rg.taxBaseHint')} value={f.rprop} onChange={set('rprop')} unit={t('unit.won')} />
              <Money label={t('rg.deposit')} value={f.rdep} onChange={set('rdep')} unit={t('unit.won')} />
              <Money label={t('rt.pension')} hint={t('rg.halfHint')} value={f.rpen} onChange={set('rpen')} unit={t('unit.won')} />
            </>
          )}
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          {tab === 'workplace' && (
            <>
              <div className="ui-card p-6">
                <p className="text-sm text-muted">{t('wp.headline')}</p>
                <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1" aria-live="polite">{won(myMonthly)}</p>
                <p className="text-sm text-sub mt-1">{t('wp.headlineSub', { annual: won(myMonthly * 12) })}</p>
                <p className="text-sm text-sub">{t('wp.employerSame', { amount: won(wp.employeeTotal) })}</p>

                <table className="w-full text-sm mt-6 tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="text-left font-medium py-2">{t('wp.item')}</th>
                      <th scope="col" className="text-right font-medium py-2">{t('wp.employee')}</th>
                      <th scope="col" className="text-right font-medium py-2">{t('wp.employer')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-body">
                    <tr><td className="py-2">{t('wp.health')}</td><td className="text-right">{won(wp.employee.health)}</td><td className="text-right">{won(wp.employer.health)}</td></tr>
                    <tr><td className="py-2">{t('wp.ltc')}</td><td className="text-right">{won(wp.employee.ltc)}</td><td className="text-right">{won(wp.employer.ltc)}</td></tr>
                    {exTotal > 0 && <tr><td className="py-2">{t('wp.extraRow')}</td><td className="text-right">{won(exTotal)}</td><td className="text-right text-faint">-</td></tr>}
                    <tr className="border-t border-line font-semibold text-fg"><td className="py-2">{t('wp.sum')}</td><td className="text-right">{won(myMonthly)}</td><td className="text-right">{won(wp.employeeTotal)}</td></tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted mt-3">{t('wp.base', { amount: won(base) })}</p>
                {wp.capped && <p className="text-xs text-amber-700 mt-1">{t('wp.capped')}</p>}

                <details className="mt-4 bg-subtle rounded-2xl p-4">
                  <summary className="text-sm font-medium text-body cursor-pointer">{t('wp.all4')}</summary>
                  <div className="mt-3 space-y-2">
                    <Row label={t('wp.healthLtc')} value={won(wp.employeeTotal)} />
                    <Row label={t('wp.pension', { rate: pct(INSURANCE.pensionRate) })} value={won(pension)} />
                    <Row label={t('wp.employment', { rate: pct(INSURANCE.employmentRate) })} value={won(employment)} />
                    <Row label={t('wp.all4Sum')} value={won(wp.employeeTotal + pension + employment)} strong />
                    <Row label={t('wp.afterIns')} value={won(wageMonthly - wp.employeeTotal - pension - employment)} />
                  </div>
                </details>
              </div>

              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('wp.tableTitle')}</h2>
                <p className="text-xs text-muted mt-1">{t('wp.tableNote', { amount: won(n(f.nonTaxable)) })}</p>
                <table className="w-full text-sm mt-4 tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="text-left font-medium py-2">{t('wp.colSalary')}</th>
                      <th scope="col" className="text-right font-medium py-2">{t('wp.colMonthly')}</th>
                      <th scope="col" className="text-right font-medium py-2">{t('wp.colAnnual')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-body">
                    {table.map(r => (
                      <tr key={r.salary} className="border-b border-line last:border-0">
                        <td className="py-2">{t('wp.salaryMan', { n: fmt(r.salary), m: r.salary / 100 })}</td>
                        <td className="text-right">{won(r.monthly)}</td>
                        <td className="text-right">{won(r.monthly * 12)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'regional' && (
            <div className="ui-card p-6">
              <p className="text-sm text-muted">{t('rg.headline')}</p>
              <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1" aria-live="polite">{won(rg.total)}</p>
              <p className="text-sm text-sub mt-1">{t('wp.headlineSub', { annual: won(rg.total * 12) })}</p>
              <div className="mt-6 space-y-2">
                <Row label={t('rg.assessed')} value={won(rg.assessedIncome)} />
                <Row label={t('rg.incomeMonthly')} value={won(rg.incomeMonthly)} />
                <Row label={t('rg.incomePremium', { rate: pct(HI.rate) })} value={won(rg.incomePremium)} strong />
                {rg.minApplied && <p className="text-xs text-muted">{t('rg.minApplied', { amount: won(HI.premiumFloor) })}</p>}
                <div className="border-t border-line my-3" />
                <Row label={t('rg.rentValue')} value={won(rg.rentValue)} />
                <Row label={t('rg.propertyAmount')} value={won(rg.propertyAmount)} />
                <Row label={t('rg.grade')} value={rg.grade ? t('rg.gradeValue', { grade: rg.grade, score: fmt(rg.score) }) : '-'} />
                <Row label={t('rg.propertyPremium', { score: fmt(rg.score), point: HI.pointValue })} value={won(rg.propertyPremium)} strong />
                <div className="border-t border-line my-3" />
                <Row label={t('rg.healthSum')} value={won(rg.health)} />
                <Row label={t('rg.ltc', { rate: pct(HI.ltcRate, 2) })} value={won(rg.ltc)} />
                <Row label={t('rg.total')} value={won(rg.total)} strong />
              </div>
              <p className="text-xs text-muted mt-4">{t('rg.carNote')}</p>
            </div>
          )}

          {tab === 'dependent' && (
            <div className="ui-card p-6">
              <p className={`text-3xl font-bold ${dp.eligible ? 'text-primary' : 'text-red-600'}`} aria-live="polite">
                {dp.eligible ? t('dp.eligible') : t('dp.notEligible')}
              </p>
              <p className="text-sm text-sub mt-1">{dp.eligible ? t('dp.eligibleSub') : t('dp.notEligibleSub')}</p>
              <ul className="mt-6 space-y-3">
                <Cond pass={dp.income} label={t('dp.cIncome')} status={dp.income ? t('dp.pass') : t('dp.fail')} />
                <Cond pass={dp.business} label={t('dp.cBusiness')} status={dp.business ? t('dp.pass') : t('dp.fail')} />
                <Cond pass={dp.property} label={f.rel === 'sibling' ? t('dp.cPropertySibling') : t('dp.cProperty')} status={dp.property ? t('dp.pass') : t('dp.fail')} />
                {f.rel === 'sibling' && <Cond pass={dp.relation} label={t('dp.cRelation')} status={dp.relation ? t('dp.pass') : t('dp.fail')} />}
              </ul>
              {!dp.eligible && (
                <div className="mt-6 bg-subtle rounded-2xl p-5">
                  <p className="text-sm text-sub">{t('dp.estimate')}</p>
                  <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(dpRegional)}</p>
                  <p className="text-xs text-muted mt-1">{t('dp.estimateNote')}</p>
                </div>
              )}
              <p className="text-xs text-muted mt-4">{t('dp.marriedNote')}</p>
            </div>
          )}

          {tab === 'retire' && (
            <>
              <div className="ui-card p-6">
                <p className="text-sm text-muted">{t('rt.headline')}</p>
                <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1" aria-live="polite">{won(rtBest.value)}</p>
                <p className="text-sm text-sub mt-1">{rtBest.label}</p>
                <div className="mt-6 space-y-4">
                  {rtOptions.map(o => (
                    <div key={o.key}>
                      <div className="flex justify-between text-sm">
                        <span className="text-body">{o.label}</span>
                        <span className="font-semibold text-fg tabular-nums">{won(o.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-track mt-1.5" aria-hidden="true">
                        <div className={`h-2 rounded-full ${o.key === rtBest.key ? 'bg-primary' : 'bg-faint'}`} style={{ width: `${(o.value / rtMax) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-body">{t('rt.optDependent')}</span>
                    <button type="button" onClick={() => set('tab')('dependent')} className="text-primary font-semibold">{t('rt.checkDependent')}</button>
                  </div>
                </div>
                {rtSaving > 0 && (
                  <p className="text-sm text-fg font-medium mt-6">{t('rt.saving', { month: won(rtSaving), total: won(rtSaving * 36) })}</p>
                )}
                <p className="text-xs text-muted mt-3">{t('rt.timingNote')}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
                <p className="font-semibold text-fg mb-2">{t('rt.rulesTitle')}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(t.raw('rt.rules') as string[]).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </>
          )}

          <ShareResult card={{ tool: t('title'), ...share }} fileName="health-insurance" />
          <p className="text-xs text-muted">{t('disclaimer')}</p>
        </div>
      </div>

      <GuideSection namespace="healthInsurance" defaultOpen />

      <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
        <p>{t('sources')}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <a href="https://www.nhis.or.kr" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">{t('linkNhis')}</a>
          <a href="https://www.nhis.or.kr/nhis/policy/wbhada07500m01.do" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">{t('linkDependent')}</a>
          <a href="https://www.law.go.kr/법령/국민건강보험법시행령" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">{t('linkLaw')}</a>
        </div>
      </div>
    </div>
  )
}

// ── 작은 부품 (컴포넌트 밖에 둬서 입력 중 포커스가 풀리지 않게) ──

function Money({ label, hint, value, onChange, unit }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; unit: string
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <span className="relative block">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value ? fmt(Number(value)) : ''}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13))}
          placeholder="0"
          aria-describedby={hint ? `${id}-u ${id}-h` : `${id}-u`}
          className="ui-field w-full px-4 py-3 pr-10 text-right tabular-nums"
        />
        <span id={`${id}-u`} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">{unit}</span>
      </span>
      {hint && <span id={`${id}-h`} className="block text-xs text-muted mt-1">{hint}</span>}
    </div>
  )
}

function Segment({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-xl" role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={`min-h-10 py-2 rounded-lg text-sm font-semibold transition-colors ${value === o.v ? 'bg-primary text-white' : 'text-body'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />
      {label}
    </label>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${strong ? 'font-semibold text-fg' : 'text-body'}`}>
      <span>{label}</span>
      <span className="tabular-nums text-right">{value}</span>
    </div>
  )
}

function Cond({ pass, label, status }: { pass: boolean; label: string; status: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-body">
      {pass ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" aria-hidden="true" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />}
      <span className="sr-only">{status}: </span>
      {label}
    </li>
  )
}
