'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeftRight, Plus, Trash2, Copy, Check, TrendingUp, TrendingDown, Minus, RotateCcw, BookOpen } from 'lucide-react'

// ── 2025년 한국 급여 계산 로직 (SalaryCalculator와 동일 기준) ──

interface SalaryResult {
  gross: number
  taxable: number
  workIncome: number
  workIncomeDeduction: number
  netAnnual: number
  netMonthly: number
  deductions: {
    nationalPension: number
    healthInsurance: number
    longTermCare: number
    employmentInsurance: number
    incomeTax: number
    localIncomeTax: number
    total: number
  }
  taxInfo: {
    taxableIncome: number
    personalDeduction: number
    effectiveTaxRate: number
  }
}

interface ScenarioInput {
  id: string
  label: string
  salary: string
  salaryType: 'annual' | 'monthly'
  nonTaxable: string
  dependents: string
  children: string
}

function calculateNetSalary(
  inputSalary: number,
  type: 'annual' | 'monthly',
  nonTaxableMonthly: number,
  dependentCount: number,
  childrenCount: number
): SalaryResult | null {
  if (!inputSalary || inputSalary <= 0) return null

  const grossAnnual = type === 'monthly' ? inputSalary * 12 : inputSalary
  const nonTaxableAnnual = nonTaxableMonthly * 12
  const taxableAnnual = grossAnnual - nonTaxableAnnual

  // 4대보험 (2025)
  const pensionCap = 29160000
  const nationalPension = Math.floor(Math.min(taxableAnnual, pensionCap) * 0.045)
  const healthInsurance = Math.floor(taxableAnnual * 0.03545)
  const longTermCare = Math.floor(healthInsurance * 0.1295)
  const employmentInsurance = Math.floor(taxableAnnual * 0.009)

  // 근로소득공제
  let workIncomeDeduction = 0
  if (grossAnnual <= 5000000) {
    workIncomeDeduction = grossAnnual * 0.7
  } else if (grossAnnual <= 15000000) {
    workIncomeDeduction = 3500000 + (grossAnnual - 5000000) * 0.4
  } else if (grossAnnual <= 45000000) {
    workIncomeDeduction = 7500000 + (grossAnnual - 15000000) * 0.15
  } else if (grossAnnual <= 100000000) {
    workIncomeDeduction = 12000000 + (grossAnnual - 45000000) * 0.05
  } else {
    workIncomeDeduction = 14750000 + (grossAnnual - 100000000) * 0.02
  }
  workIncomeDeduction = Math.min(workIncomeDeduction, 20000000)

  // 인적공제
  const basicDeduction = 1500000
  const dependentDeduction = (dependentCount - 1) * 1500000
  const childDeduction = childrenCount * 1500000
  const totalPersonalDeduction = basicDeduction + dependentDeduction + childDeduction

  const workIncome = grossAnnual - workIncomeDeduction
  const totalDeduction = nationalPension + totalPersonalDeduction
  const taxableIncome = Math.max(0, workIncome - totalDeduction)

  // 소득세 (2025 누진세율)
  let incomeTax = 0
  if (taxableIncome <= 14000000) {
    incomeTax = taxableIncome * 0.06
  } else if (taxableIncome <= 50000000) {
    incomeTax = 840000 + (taxableIncome - 14000000) * 0.15
  } else if (taxableIncome <= 88000000) {
    incomeTax = 6240000 + (taxableIncome - 50000000) * 0.24
  } else if (taxableIncome <= 150000000) {
    incomeTax = 15360000 + (taxableIncome - 88000000) * 0.35
  } else if (taxableIncome <= 300000000) {
    incomeTax = 37060000 + (taxableIncome - 150000000) * 0.38
  } else if (taxableIncome <= 500000000) {
    incomeTax = 94060000 + (taxableIncome - 300000000) * 0.4
  } else if (taxableIncome <= 1000000000) {
    incomeTax = 174060000 + (taxableIncome - 500000000) * 0.42
  } else {
    incomeTax = 384060000 + (taxableIncome - 1000000000) * 0.45
  }
  incomeTax = Math.floor(incomeTax)
  const localIncomeTax = Math.floor(incomeTax * 0.1)

  const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax
  const netAnnual = grossAnnual - totalDeductions
  const netMonthly = Math.floor(netAnnual / 12)

  return {
    gross: grossAnnual,
    taxable: taxableAnnual,
    workIncome,
    workIncomeDeduction,
    netAnnual,
    netMonthly,
    deductions: {
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      incomeTax,
      localIncomeTax,
      total: totalDeductions,
    },
    taxInfo: {
      taxableIncome,
      personalDeduction: totalPersonalDeduction,
      effectiveTaxRate: grossAnnual > 0 ? (incomeTax + localIncomeTax) / grossAnnual * 100 : 0,
    },
  }
}

const formatNumber = (num: number) => num.toLocaleString('ko-KR')
const formatWon = (num: number) => `${formatNumber(num)}원`

const COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', accent: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', label: 'A' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', accent: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', label: 'B' },
  { bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', accent: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', label: 'C' },
  { bg: 'bg-purple-50 dark:bg-purple-950', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', accent: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500', label: 'D' },
]

export default function SalaryComparison() {
  const t = useTranslations('salaryComparison')
  const nextIdRef = useRef(3)

  const [scenarios, setScenarios] = useState<ScenarioInput[]>([
    { id: '1', label: 'A', salary: '', salaryType: 'annual', nonTaxable: '200000', dependents: '1', children: '0' },
    { id: '2', label: 'B', salary: '', salaryType: 'annual', nonTaxable: '200000', dependents: '1', children: '0' },
  ])

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const updateScenario = useCallback((id: string, field: keyof ScenarioInput, value: string) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== id) return s
      if (field === 'salary') {
        const cleaned = value.replace(/[^0-9]/g, '')
        return { ...s, salary: cleaned }
      }
      if (field === 'nonTaxable') {
        const cleaned = value.replace(/[^0-9]/g, '')
        return { ...s, nonTaxable: cleaned }
      }
      return { ...s, [field]: value }
    }))
  }, [])

  const addScenario = useCallback(() => {
    if (scenarios.length >= 4) return
    const label = COLORS[scenarios.length]?.label || String.fromCharCode(65 + scenarios.length)
    const id = String(nextIdRef.current++)
    setScenarios(prev => [...prev, {
      id,
      label,
      salary: '',
      salaryType: 'annual' as const,
      nonTaxable: '200000',
      dependents: '1',
      children: '0',
    }])
  }, [scenarios.length])

  const removeScenario = useCallback((id: string) => {
    if (scenarios.length <= 2) return
    setScenarios(prev => {
      const filtered = prev.filter(s => s.id !== id)
      return filtered.map((s, i) => ({ ...s, label: COLORS[i]?.label || String.fromCharCode(65 + i) }))
    })
  }, [scenarios.length])

  const resetAll = useCallback(() => {
    nextIdRef.current = 3
    setScenarios([
      { id: '1', label: 'A', salary: '', salaryType: 'annual', nonTaxable: '200000', dependents: '1', children: '0' },
      { id: '2', label: 'B', salary: '', salaryType: 'annual', nonTaxable: '200000', dependents: '1', children: '0' },
    ])
  }, [])

  const results = useMemo(() => {
    return scenarios.map(s => {
      const salaryNum = parseInt(s.salary) || 0
      const nonTaxNum = parseInt(s.nonTaxable) || 0
      const depNum = parseInt(s.dependents) || 1
      const childNum = parseInt(s.children) || 0
      return calculateNetSalary(salaryNum, s.salaryType, nonTaxNum, depNum, childNum)
    })
  }, [scenarios])

  const hasResults = results.some(r => r !== null)
  const baseResult = results[0]

  const copyResult = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const buildSummaryText = useCallback(() => {
    const lines: string[] = [t('title'), '']
    scenarios.forEach((s, i) => {
      const r = results[i]
      if (!r) return
      lines.push(`[${s.label}] ${t('grossAnnual')}: ${formatWon(r.gross)}`)
      lines.push(`  ${t('netMonthly')}: ${formatWon(r.netMonthly)}`)
      lines.push(`  ${t('netAnnual')}: ${formatWon(r.netAnnual)}`)
      lines.push(`  ${t('totalDeductions')}: ${formatWon(r.deductions.total)}`)
      lines.push(`  ${t('effectiveRate')}: ${r.taxInfo.effectiveTaxRate.toFixed(1)}%`)
      lines.push('')
    })
    if (baseResult && results[1]) {
      const diff = (results[1]?.netMonthly ?? 0) - baseResult.netMonthly
      lines.push(`${t('monthlyDifference')}: ${diff >= 0 ? '+' : ''}${formatWon(diff)}`)
    }
    return lines.join('\n')
  }, [scenarios, results, baseResult, t])

  // 막대그래프용 최대값
  const maxNet = useMemo(() => {
    return Math.max(...results.map(r => r?.netMonthly ?? 0), 1)
  }, [results])


  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('reset')}
          </button>
          {scenarios.length < 4 && (
            <button
              onClick={addScenario}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('addScenario')}
            </button>
          )}
        </div>
      </div>

      {/* 시나리오 입력 카드들 */}
      <div className={`grid gap-4 ${scenarios.length <= 2 ? 'md:grid-cols-2' : scenarios.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
        {scenarios.map((scenario, idx) => {
          const color = COLORS[idx]
          return (
            <div
              key={scenario.id}
              className={`${color.bg} border ${color.border} rounded-xl p-4 space-y-3 transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${color.accent}`}>
                  {t('scenario')} {scenario.label}
                </span>
                {scenarios.length > 2 && (
                  <button
                    onClick={() => removeScenario(scenario.id)}
                    className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    aria-label={t('removeScenario')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 연봉/월급 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('salary')}
                </label>
                <div className="flex gap-1">
                  <select
                    value={scenario.salaryType}
                    onChange={e => updateScenario(scenario.id, 'salaryType', e.target.value)}
                    className="w-16 px-1.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="annual">{t('annual')}</option>
                    <option value="monthly">{t('monthly')}</option>
                  </select>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={scenario.salary ? parseInt(scenario.salary).toLocaleString('ko-KR') : ''}
                      onChange={e => updateScenario(scenario.id, 'salary', e.target.value)}
                      placeholder={scenario.salaryType === 'annual' ? t('annualPlaceholder') : t('monthlyPlaceholder')}
                      className="w-full px-3 py-2 pr-6 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                  </div>
                </div>
              </div>

              {/* 비과세 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('nonTaxable')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={scenario.nonTaxable ? parseInt(scenario.nonTaxable).toLocaleString('ko-KR') : ''}
                    onChange={e => updateScenario(scenario.id, 'nonTaxable', e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{t('wonPerMonth')}</span>
                </div>
              </div>

              {/* 부양가족 / 자녀 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('dependents')}
                  </label>
                  <select
                    value={scenario.dependents}
                    onChange={e => updateScenario(scenario.id, 'dependents', e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}{t('person')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('children')}
                  </label>
                  <select
                    value={scenario.children}
                    onChange={e => updateScenario(scenario.id, 'children', e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {Array.from({ length: 6 }, (_, i) => i).map(n => (
                      <option key={n} value={n}>{n}{t('person')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 빠른 결과 미리보기 */}
              {results[idx] && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('netMonthly')}</span>
                    <span className={`text-lg font-bold ${color.accent}`}>
                      {formatWon(results[idx]!.netMonthly)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 비교 결과 테이블 */}
      {hasResults && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('comparisonResult')}
            </h2>
            <button
              onClick={() => copyResult(buildSummaryText(), 'summary')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {copiedId === 'summary' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copiedId === 'summary' ? t('copied') : t('copyResult')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label={t('comparisonResult')}>
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                    {t('item')}
                  </th>
                  {scenarios.map((s, idx) => (
                    <th key={s.id} className={`px-4 py-3 text-right text-xs font-medium ${COLORS[idx].accent} uppercase tracking-wider`}>
                      {t('scenario')} {s.label}
                    </th>
                  ))}
                  {results.filter(Boolean).length >= 2 && scenarios.slice(1).map((s, idx) => {
                    const r = results[idx + 1]
                    if (!r) return null
                    return (
                      <th key={`diff-${s.id}`} className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {s.label}-{scenarios[0].label}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <CompRow label={t('grossAnnual')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.gross} />
                <CompRow label={t('socialInsurance')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.nationalPension + r.deductions.healthInsurance + r.deductions.longTermCare + r.deductions.employmentInsurance} invert />
                <CompRow label={t('nationalPension')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.nationalPension} invert sub />
                <CompRow label={t('healthInsurance')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.healthInsurance} invert sub />
                <CompRow label={t('longTermCare')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.longTermCare} invert sub />
                <CompRow label={t('employmentInsurance')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.employmentInsurance} invert sub />
                <CompRow label={t('incomeTaxTotal')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.incomeTax + r.deductions.localIncomeTax} invert />
                <CompRow label={t('incomeTax')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.incomeTax} invert sub />
                <CompRow label={t('localIncomeTax')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.localIncomeTax} invert sub />

                {/* 총 공제액 */}
                <CompRow label={t('totalDeductions')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.deductions.total} invert rowClass="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50" labelClass="font-bold text-red-700 dark:text-red-400" valueClass="font-bold text-red-700 dark:text-red-400" />

                {/* 실효세율 */}
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t('effectiveRate')}</td>
                  {results.map((r, i) => (
                    <td key={scenarios[i].id} className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {r ? `${r.taxInfo.effectiveTaxRate.toFixed(1)}%` : '-'}
                    </td>
                  ))}
                  {baseResult && scenarios.slice(1).map((s, idx) => {
                    const r = results[idx + 1]
                    if (!r) return null
                    const diff = r.taxInfo.effectiveTaxRate - baseResult.taxInfo.effectiveTaxRate
                    return (
                      <td key={`diff-rate-${s.id}`} className="px-4 py-3 text-right">
                        <span className={`font-medium ${diff > 0.05 ? 'text-red-600 dark:text-red-400' : diff < -0.05 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%p
                        </span>
                      </td>
                    )
                  })}
                </tr>

                {/* 연간 실수령액 */}
                <CompRow label={t('netAnnual')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.netAnnual} rowClass="bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50" labelClass="font-bold text-blue-700 dark:text-blue-400" valueClass="font-bold text-blue-700 dark:text-blue-400" />

                {/* 월 실수령액 (하이라이트) */}
                <CompRow label={t('netMonthly')} results={results} scenarios={scenarios} baseResult={baseResult} getValue={r => r.netMonthly} rowClass="bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50" labelClass="font-bold text-green-700 dark:text-green-400 text-base" valueClass="font-bold text-green-700 dark:text-green-400 text-base" py="py-4" />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 시각적 비교 차트 (CSS 기반) */}
      {hasResults && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('visualComparison')}</h2>

          {/* 월 실수령액 비교 바 */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{t('netMonthly')}</h3>
            <div className="space-y-3">
              {scenarios.map((s, idx) => {
                const r = results[idx]
                if (!r) return null
                const pct = (r.netMonthly / maxNet) * 100
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className={`w-8 text-sm font-bold ${COLORS[idx].accent}`}>{s.label}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-8 overflow-hidden">
                      <div
                        className={`${COLORS[idx].bar} h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500`}
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      >
                        <span className="text-white text-xs font-medium whitespace-nowrap">
                          {formatWon(r.netMonthly)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 총 급여 대비 구성 비교 */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{t('compositionComparison')}</h3>
            <div className="space-y-3">
              {scenarios.map((s, idx) => {
                const r = results[idx]
                if (!r) return null
                const netPct = (r.netAnnual / r.gross) * 100
                const socialPct = ((r.deductions.nationalPension + r.deductions.healthInsurance + r.deductions.longTermCare + r.deductions.employmentInsurance) / r.gross) * 100
                const taxPct = ((r.deductions.incomeTax + r.deductions.localIncomeTax) / r.gross) * 100
                return (
                  <div key={s.id}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`w-8 text-sm font-bold ${COLORS[idx].accent}`}>{s.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatWon(r.gross)}</span>
                    </div>
                    <div className="ml-11 flex rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-green-500 flex items-center justify-center transition-all duration-500"
                        style={{ width: `${netPct}%` }}
                        title={`${t('netAnnual')} ${netPct.toFixed(1)}%`}
                      >
                        <span className="text-white text-[10px] font-medium">{netPct.toFixed(0)}%</span>
                      </div>
                      <div
                        className="bg-orange-400 flex items-center justify-center transition-all duration-500"
                        style={{ width: `${socialPct}%` }}
                        title={`${t('socialInsurance')} ${socialPct.toFixed(1)}%`}
                      >
                        {socialPct > 5 && <span className="text-white text-[10px] font-medium">{socialPct.toFixed(0)}%</span>}
                      </div>
                      <div
                        className="bg-red-400 flex items-center justify-center transition-all duration-500"
                        style={{ width: `${taxPct}%` }}
                        title={`${t('incomeTaxTotal')} ${taxPct.toFixed(1)}%`}
                      >
                        {taxPct > 5 && <span className="text-white text-[10px] font-medium">{taxPct.toFixed(0)}%</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="ml-11 flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-500 rounded-sm" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('netAnnual')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-orange-400 rounded-sm" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('socialInsurance')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-400 rounded-sm" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('incomeTaxTotal')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.usage.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.usage.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.standard.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.standard.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 비교 테이블 행 서브컴포넌트 ──

function CompRow({
  label, results, scenarios, baseResult, getValue, invert = false, sub = false,
  rowClass, labelClass, valueClass, py = 'py-3',
}: {
  label: string
  results: (SalaryResult | null)[]
  scenarios: ScenarioInput[]
  baseResult: SalaryResult | null
  getValue: (r: SalaryResult) => number
  invert?: boolean
  sub?: boolean
  rowClass?: string
  labelClass?: string
  valueClass?: string
  py?: string
}) {
  const defaultRowClass = sub
    ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
  const defaultLabelClass = sub ? '' : 'font-medium text-gray-900 dark:text-white'
  const defaultValueClass = sub ? '' : 'text-gray-900 dark:text-white'

  return (
    <tr className={rowClass || defaultRowClass}>
      <td className={`px-4 ${py} ${sub ? 'pl-8 text-xs' : ''} ${labelClass || defaultLabelClass}`}>{label}</td>
      {results.map((r, i) => (
        <td key={scenarios[i].id} className={`px-4 ${py} text-right ${sub ? 'text-xs' : ''} ${valueClass || defaultValueClass}`}>
          {r ? formatWon(getValue(r)) : '-'}
        </td>
      ))}
      {baseResult && scenarios.slice(1).map((s, idx) => {
        const r = results[idx + 1]
        if (!r) return null
        return (
          <td key={`diff-${label}-${s.id}`} className={`px-4 ${py} text-right ${sub ? 'text-xs' : ''}`}>
            <DiffCell value={getValue(r) - getValue(baseResult)} invert={invert} small={sub} />
          </td>
        )
      })}
    </tr>
  )
}

// ── 차이값 표시 서브컴포넌트 ──

function DiffCell({ value, invert = false, small = false }: { value: number; invert?: boolean; small?: boolean }) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  // invert: 공제항목은 증가가 나쁜 것 (빨간색), 감소가 좋은 것 (초록색)
  const goodDirection = invert ? isNegative : isPositive
  const badDirection = invert ? isPositive : isNegative

  const colorClass = goodDirection
    ? 'text-green-600 dark:text-green-400'
    : badDirection
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-500 dark:text-gray-400'

  const Icon = goodDirection ? TrendingUp : badDirection ? TrendingDown : Minus

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${colorClass} ${small ? 'text-xs' : ''}`}>
      <Icon className={small ? 'w-3 h-3' : 'w-4 h-4'} />
      {isPositive ? '+' : ''}{formatWon(value)}
    </span>
  )
}
