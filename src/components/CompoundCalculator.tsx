'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { TrendingUp, Calculator, Copy, Check, BookOpen, RotateCcw } from 'lucide-react'

interface YearlyData {
  year: number
  deposit: number
  interest: number
  balance: number
}

type CompoundFrequency = 'yearly' | 'semiannually' | 'quarterly' | 'monthly' | 'daily'
type PeriodType = 'years' | 'months'

const frequencyValues: Record<CompoundFrequency, number> = {
  yearly: 1,
  semiannually: 2,
  quarterly: 4,
  monthly: 12,
  daily: 365,
}

export default function CompoundCalculator() {
  const t = useTranslations('compoundCalculator')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [principal, setPrincipal] = useState<number>(10000000)
  const [annualRate, setAnnualRate] = useState<number>(5)
  const [period, setPeriod] = useState<number>(10)
  const [periodType, setPeriodType] = useState<PeriodType>('years')
  const [compoundFrequency, setCompoundFrequency] = useState<CompoundFrequency>('yearly')
  const [monthlyDeposit, setMonthlyDeposit] = useState<number>(0)

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, id: string) => {
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

  // Reset form
  const handleReset = useCallback(() => {
    setPrincipal(10000000)
    setAnnualRate(5)
    setPeriod(10)
    setPeriodType('years')
    setCompoundFrequency('yearly')
    setMonthlyDeposit(0)
  }, [])

  // Calculate compound interest
  const results = useMemo(() => {
    const years = periodType === 'years' ? period : period / 12
    const r = annualRate / 100
    const n = frequencyValues[compoundFrequency]
    const t = years

    if (years <= 0 || annualRate < 0 || principal < 0 || monthlyDeposit < 0) {
      return {
        totalAmount: 0,
        totalInterest: 0,
        totalDeposited: 0,
        effectiveRate: 0,
        yearlyBreakdown: [],
        simpleInterest: 0,
        compoundAdvantage: 0,
      }
    }

    // Compound interest formula with regular deposits
    // A = P(1 + r/n)^(nt) + PMT * [((1 + r/n)^(nt) - 1) / (r/n)]
    const compoundMultiplier = Math.pow(1 + r / n, n * t)
    const principalGrowth = principal * compoundMultiplier

    let depositGrowth = 0
    if (monthlyDeposit > 0 && r > 0) {
      // Convert monthly deposits to match compound frequency
      const depositsPerYear = 12
      const totalDeposits = monthlyDeposit * depositsPerYear * t
      // Future value of annuity formula adjusted for compound frequency
      const ratePerPeriod = r / n
      const totalPeriods = n * t
      depositGrowth = (monthlyDeposit * depositsPerYear / n) * ((compoundMultiplier - 1) / ratePerPeriod)
    } else if (monthlyDeposit > 0) {
      depositGrowth = monthlyDeposit * 12 * t
    }

    const totalAmount = principalGrowth + depositGrowth
    const totalDeposited = principal + monthlyDeposit * 12 * t
    const totalInterest = totalAmount - totalDeposited
    const effectiveRate = totalDeposited > 0 ? (totalInterest / totalDeposited) * 100 : 0

    // Simple interest comparison
    const simpleInterest = principal * r * t + (monthlyDeposit * 12 * t * r * t / 2)
    const compoundAdvantage = totalInterest - simpleInterest

    // Yearly breakdown
    const yearlyBreakdown: YearlyData[] = []
    for (let year = 1; year <= Math.ceil(years); year++) {
      const yearT = year
      const yearCompoundMultiplier = Math.pow(1 + r / n, n * yearT)
      const yearPrincipalGrowth = principal * yearCompoundMultiplier

      let yearDepositGrowth = 0
      if (monthlyDeposit > 0 && r > 0) {
        const ratePerPeriod = r / n
        const totalPeriodsYear = n * yearT
        yearDepositGrowth = (monthlyDeposit * 12 / n) * ((Math.pow(1 + ratePerPeriod, totalPeriodsYear) - 1) / ratePerPeriod)
      } else if (monthlyDeposit > 0) {
        yearDepositGrowth = monthlyDeposit * 12 * yearT
      }

      const yearTotalAmount = yearPrincipalGrowth + yearDepositGrowth
      const yearTotalDeposited = principal + monthlyDeposit * 12 * yearT
      const yearInterest = yearTotalAmount - yearTotalDeposited

      yearlyBreakdown.push({
        year,
        deposit: yearTotalDeposited,
        interest: yearInterest,
        balance: yearTotalAmount,
      })
    }

    return {
      totalAmount,
      totalInterest,
      totalDeposited,
      effectiveRate,
      yearlyBreakdown,
      simpleInterest,
      compoundAdvantage,
    }
  }, [principal, annualRate, period, periodType, compoundFrequency, monthlyDeposit])

  const maxBalance = useMemo(() => {
    return Math.max(...results.yearlyBreakdown.map(d => d.balance), 1)
  }, [results.yearlyBreakdown])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel: Inputs */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                설정
              </h2>
              <button
                onClick={handleReset}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title={t('common.reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Principal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('principal')}
              </label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            {/* Annual Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('rate')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                />
                <span className="text-gray-700 dark:text-gray-300">%</span>
              </div>
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('period')}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="years">{t('periodUnit.years')}</option>
                  <option value="months">{t('periodUnit.months')}</option>
                </select>
              </div>
            </div>

            {/* Compound Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('compoundFrequency')}
              </label>
              <select
                value={compoundFrequency}
                onChange={(e) => setCompoundFrequency(e.target.value as CompoundFrequency)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="yearly">{t('frequency.yearly')}</option>
                <option value="semiannually">{t('frequency.semiannually')}</option>
                <option value="quarterly">{t('frequency.quarterly')}</option>
                <option value="monthly">{t('frequency.monthly')}</option>
                <option value="daily">{t('frequency.daily')}</option>
              </select>
            </div>

            {/* Monthly Deposit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('monthlyDeposit')}
              </label>
              <input
                type="number"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('monthlyDepositDesc')}
              </p>
            </div>
          </div>

          {/* Guide Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {t('guide.title')}
            </h2>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('guide.howToUse.title')}
                </h3>
                <ul className="space-y-1 list-disc list-inside">
                  {(t.raw('guide.howToUse.items') as string[]).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('guide.tips.title')}
                </h3>
                <ul className="space-y-1 list-disc list-inside">
                  {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Results Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Total Amount */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('result.totalAmount')}</h3>
                <button
                  onClick={() => copyToClipboard(results.totalAmount.toFixed(0), 'totalAmount')}
                  className="text-white/80 hover:text-white"
                  title={t('common.copy')}
                >
                  {copiedId === 'totalAmount' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">₩{results.totalAmount.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Total Interest */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('result.totalInterest')}</h3>
                <button
                  onClick={() => copyToClipboard(results.totalInterest.toFixed(0), 'totalInterest')}
                  className="text-white/80 hover:text-white"
                  title={t('common.copy')}
                >
                  {copiedId === 'totalInterest' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">₩{results.totalInterest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Total Deposited */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('result.totalDeposit')}</h3>
                <button
                  onClick={() => copyToClipboard(results.totalDeposited.toFixed(0), 'totalDeposited')}
                  className="text-white/80 hover:text-white"
                  title={t('common.copy')}
                >
                  {copiedId === 'totalDeposited' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">₩{results.totalDeposited.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Effective Rate */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('result.effectiveRate')}</h3>
                <button
                  onClick={() => copyToClipboard(results.effectiveRate.toFixed(2) + '%', 'effectiveRate')}
                  className="text-white/80 hover:text-white"
                  title={t('common.copy')}
                >
                  {copiedId === 'effectiveRate' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">{results.effectiveRate.toFixed(2)}%</p>
            </div>
          </div>

          {/* Simple vs Compound Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('comparison.title')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">{t('comparison.simple')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₩{results.simpleInterest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">{t('comparison.compound')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₩{results.totalInterest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300 font-medium">{t('comparison.difference')}</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                  +₩{results.compoundAdvantage.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Growth Visualization */}
          {results.yearlyBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('result.growthChart')}
              </h2>
              <div className="space-y-2">
                {results.yearlyBreakdown.map((data) => {
                  const percentage = (data.balance / maxBalance) * 100
                  return (
                    <div key={data.year} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">
                          {data.year}{t('result.year')}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ₩{data.balance.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Yearly Breakdown Table */}
          {results.yearlyBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 overflow-x-auto">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('result.yearlyBreakdown')}
              </h2>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-gray-600 dark:text-gray-300">
                    <th className="text-left py-3 px-2">{t('result.year')}</th>
                    <th className="text-right py-3 px-2">{t('result.deposit')}</th>
                    <th className="text-right py-3 px-2">{t('result.interest')}</th>
                    <th className="text-right py-3 px-2">{t('result.balance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.yearlyBreakdown.map((data) => (
                    <tr key={data.year} className="text-gray-900 dark:text-white">
                      <td className="py-3 px-2">{data.year}</td>
                      <td className="text-right py-3 px-2">
                        ₩{data.deposit.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-3 px-2 text-green-600 dark:text-green-400">
                        ₩{data.interest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-3 px-2 font-semibold">
                        ₩{data.balance.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
