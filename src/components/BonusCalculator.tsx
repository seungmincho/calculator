'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/bonusCalculator'
import { RotateCcw } from 'lucide-react'
import dynamic from 'next/dynamic'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { calculateBonusTax, type BonusDeductions } from '@/utils/bonusTax'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

type Method = 'monthly' | 'percent' | 'amount' // 월급 대비 % | 연봉 대비 % | 금액
const METHODS: Method[] = ['monthly', 'percent', 'amount']
const PRESETS: Record<Exclude<Method, 'amount'>, number[]> = { monthly: [50, 100, 200, 300, 500], percent: [5, 10, 20, 30, 50] }
const COMPARE_RATIOS = [50, 100, 200, 300, 500] // 월급 대비 %
const DEFAULTS = { salary: '50,000,000', method: 'monthly' as Method, percent: 100, period: 1 }

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const parseNum = (s: string) => parseInt(s.replace(/,/g, ''), 10) || 0
const formatInput = (v: string) => {
  const num = v.replace(/[^\d]/g, '')
  return num ? parseInt(num, 10).toLocaleString('en-US') : ''
}

const ROWS: [keyof BonusDeductions, string][] = [
  ['nationalPension', 'result.nationalPension'],
  ['healthInsurance', 'result.healthInsurance'],
  ['longTermCare', 'result.longTermCare'],
  ['employmentInsurance', 'result.employmentInsurance'],
  ['incomeTax', 'result.incomeTax'],
  ['localIncomeTax', 'result.localTax'],
]

export default function BonusCalculator() {
  const searchParams = useSearchParams()
  const t = useTranslations('bonusCalculator')

  const [salary, setSalary] = useState(DEFAULTS.salary)
  const [bonusType, setBonusType] = useState('ps')
  const [method, setMethod] = useState<Method>(DEFAULTS.method)
  const [percent, setPercent] = useState(DEFAULTS.percent)
  const [bonusAmount, setBonusAmount] = useState('')
  const [period, setPeriod] = useState(DEFAULTS.period)
  const [dependents, setDependents] = useState(1)
  const [children, setChildren] = useState(0)
  const [nonTaxable, setNonTaxable] = useState('200,000')
  const [activeTab, setActiveTab] = useState(0)

  // URL → state (구 링크 호환: bonusPercent만 있으면 연봉 대비 %)
  useEffect(() => {
    const g = (k: string) => searchParams.get(k)
    if (g('salary')) setSalary(formatInput(g('salary')!))
    const bm = g('bonusMethod')
    if (g('bonusPercent')) { setPercent(parseFloat(g('bonusPercent')!) || 0); setMethod('percent') }
    if (g('bonusAmount')) { setBonusAmount(formatInput(g('bonusAmount')!)); setMethod('amount') }
    if (bm && (METHODS as string[]).includes(bm)) setMethod(bm as Method)
    if (g('bonusType')) setBonusType(g('bonusType')!)
    if (g('period')) setPeriod(Math.min(12, Math.max(1, parseInt(g('period')!) || 1)))
    if (g('dependents')) setDependents(parseInt(g('dependents')!) || 1)
    if (g('children')) setChildren(parseInt(g('children')!) || 0)
    if (g('nonTaxable')) setNonTaxable(formatInput(g('nonTaxable')!))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // state → URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href)
      url.search = ''
      const p = url.searchParams
      if (salary) p.set('salary', salary.replace(/,/g, ''))
      p.set('bonusMethod', method)
      if (method === 'amount') { if (bonusAmount) p.set('bonusAmount', bonusAmount.replace(/,/g, '')) }
      else p.set('bonusPercent', String(percent))
      if (bonusType !== 'ps') p.set('bonusType', bonusType)
      if (period !== 1) p.set('period', String(period))
      if (dependents !== 1) p.set('dependents', String(dependents))
      if (children !== 0) p.set('children', String(children))
      if (nonTaxable.replace(/,/g, '') !== '200000') p.set('nonTaxable', nonTaxable.replace(/,/g, ''))
      window.history.replaceState({}, '', url.toString())
    }, 300)
    return () => clearTimeout(timer)
  }, [salary, method, percent, bonusAmount, bonusType, period, dependents, children, nonTaxable])

  const annualSalary = parseNum(salary)
  const monthlySalary = Math.floor(annualSalary / 12)
  // 8~20세 자녀는 공제대상가족(본인 포함)에 포함된 인원 → 가족 수 − 1 이하
  const safeChildren = Math.min(children, dependents - 1)
  const taxOpt = { nonTaxableMonthly: parseNum(nonTaxable), dependents, children: safeChildren, period }

  const bonusGross =
    method === 'amount' ? parseNum(bonusAmount)
    : Math.floor((method === 'monthly' ? monthlySalary : annualSalary) * (percent / 100))

  const r = useMemo(
    () => calculateBonusTax({ salary: annualSalary, bonus: bonusGross, ...taxOpt }),
    [annualSalary, bonusGross, taxOpt.nonTaxableMonthly, dependents, safeChildren, period], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // 여러 성과급 비교 (월급 대비 %) + 현재 입력값
  const compareRows = useMemo(() => {
    if (monthlySalary <= 0) return []
    const rows = COMPARE_RATIOS.map(ratio => ({ ratio, gross: Math.floor(monthlySalary * ratio / 100) }))
    if (bonusGross > 0 && !rows.some(x => x.gross === bonusGross)) rows.push({ ratio: (bonusGross / monthlySalary) * 100, gross: bonusGross })
    return rows
      .sort((a, b) => a.gross - b.gross)
      .map(row => ({ ...row, res: calculateBonusTax({ salary: annualSalary, bonus: row.gross, ...taxOpt }), isCurrent: row.gross === bonusGross }))
      .filter(row => row.res)
  }, [annualSalary, monthlySalary, bonusGross, taxOpt.nonTaxableMonthly, dependents, safeChildren, period]) // eslint-disable-line react-hooks/exhaustive-deps

  const chartOption = useMemo(() => ({
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${fmt(v)}${t('chart.won')}` },
    legend: { bottom: 0, textStyle: { color: '#8B95A1' } },
    grid: { top: 20, right: 16, bottom: 40, left: 64 },
    xAxis: { type: 'category', data: compareRows.map(x => `${Math.round(x.ratio)}%`), axisLabel: { color: '#8B95A1' } },
    yAxis: { type: 'value', axisLabel: { color: '#8B95A1', formatter: (v: number) => `${Math.floor(v / 10000)}${t('chart.manwon')}` } },
    series: [
      { name: t('simulation.grossBonus'), type: 'bar', data: compareRows.map(x => x.gross), itemStyle: { color: '#B0B8C1' } },
      { name: t('simulation.netBonus'), type: 'bar', data: compareRows.map(x => x.res!.final.net), itemStyle: { color: '#3182F6' } },
    ],
  }), [compareRows, t])

  const reset = () => {
    setSalary(DEFAULTS.salary); setBonusType('ps'); setMethod(DEFAULTS.method); setPercent(DEFAULTS.percent)
    setBonusAmount(''); setPeriod(DEFAULTS.period); setDependents(1); setChildren(0); setNonTaxable('200,000')
  }

  const label = 'block text-sm font-medium text-body mb-1.5'
  const seg = (on: boolean) => `flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${on ? 'bg-primary text-white' : 'text-sub hover:bg-subtle'}`
  const chip = (on: boolean) => `px-3 py-1.5 text-sm rounded-full transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const bracketChanged = r && r.salaryOnly.bracket !== r.withBonusTax.bracket

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5 lg:sticky lg:top-24">
            {r && <MobileResultLink href="#bonus-calculator-result" label={t('result.finalNet')} value={`${fmt(r.final.net)}${t('chart.won')}`} />}
            <div>
              <label className={label}>{t('annualSalary')}</label>
              <input type="text" inputMode="numeric" value={salary} onChange={e => setSalary(formatInput(e.target.value))}
                placeholder={t('annualSalaryPlaceholder')} className="ui-field w-full px-4 py-3 text-right tabular-nums" />
              {monthlySalary > 0 && <p className="text-xs text-muted mt-1">{t('monthlySalaryHint', { amount: fmt(monthlySalary) })}</p>}
            </div>

            <div>
              <label className={label}>{t('bonusType')}</label>
              <select value={bonusType} onChange={e => setBonusType(e.target.value)} className="ui-field w-full px-4 py-3">
                {['ps', 'pi', 'management', 'individual', 'custom'].map(k => <option key={k} value={k}>{t(`bonusTypes.${k}`)}</option>)}
              </select>
            </div>

            <div>
              <label className={label}>{t('bonusInput')}</label>
              <div className="flex gap-1 p-1 bg-soft rounded-xl">
                {METHODS.map(m => (
                  <button key={m} type="button" onClick={() => { setMethod(m); if (m !== 'amount') setPercent(m === 'monthly' ? 100 : 10) }} className={seg(method === m)}>
                    {t(m === 'monthly' ? 'byMonthlyPercent' : m === 'percent' ? 'byPercent' : 'byAmount')}
                  </button>
                ))}
              </div>
            </div>

            {method === 'amount' ? (
              <div>
                <label className={label}>{t('bonusAmount')}</label>
                <input type="text" inputMode="numeric" value={bonusAmount} onChange={e => setBonusAmount(formatInput(e.target.value))}
                  placeholder={t('bonusAmountPlaceholder')} className="ui-field w-full px-4 py-3 text-right tabular-nums" />
              </div>
            ) : (
              <div>
                <label className={label}>{t(method === 'monthly' ? 'bonusMonthlyPercent' : 'bonusPercent')}</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" min={0} value={percent} onChange={e => setPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="ui-field w-full px-4 py-3 pr-10 text-right tabular-nums" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESETS[method].map(p => <button key={p} type="button" onClick={() => setPercent(p)} className={chip(percent === p)}>{p}%</button>)}
                </div>
                {bonusGross > 0 && <p className="text-xs text-muted mt-2 tabular-nums">= {fmt(bonusGross)}{t('chart.won')}</p>}
              </div>
            )}

            <div>
              <label className={label}>{t('period')}</label>
              <select value={period} onChange={e => setPeriod(parseInt(e.target.value))} className="ui-field w-full px-4 py-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{t(n === 1 ? 'periodOne' : 'periodN', { n })}</option>)}
              </select>
              <p className="text-xs text-muted mt-1">{t('periodHint')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{t('dependents')}</label>
                <select value={dependents} onChange={e => setDependents(parseInt(e.target.value))} className="ui-field w-full px-4 py-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>{t('childrenUnder20')}</label>
                <select value={safeChildren} onChange={e => setChildren(parseInt(e.target.value))} className="ui-field w-full px-4 py-3">
                  {Array.from({ length: dependents }, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={label}>{t('nonTaxable')}</label>
              <input type="text" inputMode="numeric" value={nonTaxable} onChange={e => setNonTaxable(formatInput(e.target.value))}
                placeholder={t('nonTaxablePlaceholder')} className="ui-field w-full px-4 py-3 text-right tabular-nums" />
            </div>

            <button type="button" onClick={reset} className="ui-btn-soft w-full px-4 py-3 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" />{t('reset')}
            </button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {!r ? (
            <div className="ui-card p-12 text-center text-muted">{t('emptyHint')}</div>
          ) : (
            <>
              {/* 핵심 결과: 이번 달 vs 최종 */}
              <div id="bonus-calculator-result" className="ui-hero p-6 scroll-mt-20">
                <p className="text-sm text-white/70">{t('result.bonusGross')} {fmt(r.bonus)}{t('chart.won')}</p>
                <div className="grid sm:grid-cols-2 gap-6 mt-4">
                  <div>
                    <p className="text-sm text-white/70">{t('result.nowNet')}</p>
                    <p className="text-3xl font-bold tabular-nums mt-1">{fmt(r.now.net)}{t('chart.won')}</p>
                    <p className="text-sm text-white/70 mt-1 tabular-nums">{t('result.deducted', { amount: fmt(r.now.total), rate: ((r.now.net / r.bonus) * 100).toFixed(1) })}</p>
                  </div>
                  <div className="sm:border-l sm:border-white/20 sm:pl-6">
                    <p className="text-sm text-white/70">{t('result.finalNet')}</p>
                    <p className="text-3xl font-bold tabular-nums mt-1" aria-live="polite">{fmt(r.final.net)}{t('chart.won')}</p>
                    <p className="text-sm text-white/70 mt-1 tabular-nums">{t('result.deducted', { amount: fmt(r.final.total), rate: ((r.final.net / r.bonus) * 100).toFixed(1) })}</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 mt-5 pt-4 border-t border-white/20 tabular-nums">
                  {t('result.monthTotal', { amount: fmt(r.baseMonthlyNet + r.now.net) })}
                </p>
              </div>

              <ShareResult
                fileName="bonus-net"
                card={{
                  tool: t('title'),
                  label: t('share.label', { gross: fmt(r.bonus) }),
                  headline: `${fmt(r.final.net)}${t('chart.won')}`,
                  sub: t('share.sub', { amount: fmt(r.now.net) }),
                  rows: [
                    { label: t('result.bonusGross'), value: `${fmt(r.bonus)}${t('chart.won')}` },
                    { label: t('result.totalDeduction'), value: `${fmt(r.final.total)}${t('chart.won')}` },
                    { label: t('share.netRate'), value: `${((r.final.net / r.bonus) * 100).toFixed(1)}%` },
                    { label: t('annualSalary'), value: `${fmt(annualSalary)}${t('chart.won')}` },
                  ],
                }}
                text={t('share.text', { gross: fmt(r.bonus), net: fmt(r.final.net) })}
              />

              {/* 정산 설명 */}
              <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1.5 tabular-nums">
                <p>{t(r.settlement <= 0 ? 'result.settlementRefund' : 'result.settlementPay', { amount: fmt(Math.abs(r.settlement)) })}</p>
                <p>{t('result.healthLater', { amount: fmt(r.healthLater) })}</p>
                <p>{t('result.pensionNote')}</p>
              </div>

              <div className="flex gap-1 p-1 bg-soft rounded-xl">
                {['result', 'simulation', 'taxAnalysis'].map((tab, i) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(i)} className={seg(activeTab === i)}>
                    {t(tab === 'result' ? 'result.breakdownTitle' : `${tab}.title`)}
                  </button>
                ))}
              </div>

              {activeTab === 0 && (
                <div className="ui-card p-6 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th className="text-left py-2 pr-4 font-medium"></th>
                          <th className="text-right py-2 px-2 font-medium">{t('result.nowColumn')}</th>
                          <th className="text-right py-2 pl-2 font-medium">{t('result.finalColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ROWS.map(([key, lbl]) => (
                          <tr key={key} className="border-b border-line">
                            <td className="py-2.5 pr-4 text-body">{t(lbl)}</td>
                            <td className="py-2.5 px-2 text-right text-sub">{fmt(r.now[key])}</td>
                            <td className="py-2.5 pl-2 text-right text-sub">{fmt(r.final[key])}</td>
                          </tr>
                        ))}
                        <tr className="border-b border-line font-semibold">
                          <td className="py-2.5 pr-4 text-fg">{t('result.totalDeduction')}</td>
                          <td className="py-2.5 px-2 text-right text-fg">{fmt(r.now.total)}</td>
                          <td className="py-2.5 pl-2 text-right text-fg">{fmt(r.final.total)}</td>
                        </tr>
                        <tr className="font-bold">
                          <td className="py-2.5 pr-4 text-fg">{t('result.bonusNet')}</td>
                          <td className="py-2.5 px-2 text-right text-primary">{fmt(r.now.net)}</td>
                          <td className="py-2.5 pl-2 text-right text-primary">{fmt(r.final.net)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <ul className="text-xs text-muted space-y-1 list-disc pl-4">
                    {(t.raw('result.notes') as string[]).map((n, i) => <li key={i}>{n}</li>)}
                  </ul>

                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-sm text-muted">{t('result.salaryOnly')}</p>
                      <p className="text-xl font-bold text-fg mt-1 tabular-nums">{fmt(r.baseNetAnnual)}{t('chart.won')}</p>
                      <p className="text-xs text-muted mt-1">{t('result.totalAnnualNet')}</p>
                    </div>
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-sm text-muted">{t('result.withBonus')}</p>
                      <p className="text-xl font-bold text-fg mt-1 tabular-nums">{fmt(r.withNetAnnual)}{t('chart.won')}</p>
                      <p className="text-xs text-primary mt-1 tabular-nums">+{fmt(r.final.net)}{t('chart.won')}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="ui-card p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-fg">{t('simulation.title')}</h3>
                    <p className="text-sm text-muted mt-1">{t('simulation.description')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th className="text-left py-2 font-medium">{t('simulation.ratio')}</th>
                          <th className="text-right py-2 px-2 font-medium">{t('simulation.grossBonus')}</th>
                          <th className="text-right py-2 px-2 font-medium">{t('result.nowColumn')}</th>
                          <th className="text-right py-2 px-2 font-medium">{t('result.finalColumn')}</th>
                          <th className="text-right py-2 font-medium">{t('simulation.netRate')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareRows.map(row => (
                          <tr key={row.gross} className={`border-b border-line ${row.isCurrent ? 'bg-primary-soft text-primary font-semibold' : 'text-sub'}`}>
                            <td className="py-2.5 whitespace-nowrap">
                              {Math.round(row.ratio)}%
                              {row.isCurrent && <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">{t('simulation.current')}</span>}
                            </td>
                            <td className="py-2.5 px-2 text-right">{fmt(row.gross)}</td>
                            <td className="py-2.5 px-2 text-right">{fmt(row.res!.now.net)}</td>
                            <td className="py-2.5 px-2 text-right">{fmt(row.res!.final.net)}</td>
                            <td className="py-2.5 text-right">{((row.res!.final.net / row.gross) * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ReactECharts option={chartOption} style={{ height: 300 }} />
                </div>
              )}

              {activeTab === 2 && (
                <div className="ui-card p-6 space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold text-fg">{t('taxAnalysis.title')}</h3>
                    <p className="text-sm text-muted mt-1">{t('taxAnalysis.description')}</p>
                  </div>
                  {bracketChanged && (
                    <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">{t('taxAnalysis.bracketWarning')}</div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {([['withoutBonus', r.salaryOnly], ['withBonus', r.withBonusTax]] as const).map(([k, s]) => (
                      <div key={k} className="border border-line rounded-xl p-5 space-y-2 text-sm">
                        <h4 className="font-semibold text-fg mb-1">{t(`taxAnalysis.${k}`)}</h4>
                        <div className="flex justify-between"><span className="text-muted">{t('taxAnalysis.taxBase')}</span><span className="text-fg tabular-nums">{fmt(s.taxBase)}</span></div>
                        <div className="flex justify-between"><span className="text-muted">{t('taxAnalysis.taxBracket')}</span><span className="text-fg">{t(`taxAnalysis.brackets.b${s.bracket + 1}`)}</span></div>
                        <div className="flex justify-between"><span className="text-muted">{t('taxAnalysis.marginalRate')}</span><span className="text-fg">{(s.marginalRate * 100).toFixed(0)}%</span></div>
                        <div className="flex justify-between"><span className="text-muted">{t('taxAnalysis.totalIncomeTax')}</span><span className="text-fg tabular-nums">{fmt(s.totalTax)}{t('chart.won')}</span></div>
                        <div className="flex justify-between"><span className="text-muted">{t('result.effectiveRate')}</span><span className="text-fg">{s.effectiveRate.toFixed(1)}%</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-subtle rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center tabular-nums">
                    {[
                      ['result.incomeTax', r.final.incomeTax],
                      ['result.localTax', r.final.localIncomeTax],
                      ['result.totalDeduction', r.final.total],
                      ['result.bonusNet', r.final.net],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <p className="text-xs text-muted">{t(k as string)}</p>
                        <p className="text-lg font-bold text-fg">{fmt(v as number)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <GuideSection namespace="bonusCalculator" />
    </div>
  )
}
