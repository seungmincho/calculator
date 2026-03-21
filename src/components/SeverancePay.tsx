'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Briefcase, Calendar, DollarSign, BookOpen, Copy, Check, Share2, TrendingUp, ChevronDown } from 'lucide-react'

const SIMULATION_YEARS = [1, 3, 5, 10, 15, 20]

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

export default function SeverancePay() {
  const t = useTranslations('severancePay')
  const searchParams = useSearchParams()

  // URL param initialization
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthlyPay, setMonthlyPay] = useState('')
  const [annualBonus, setAnnualBonus] = useState('')
  const [annualLeaveAllowance, setAnnualLeaveAllowance] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [showIrpGuide, setShowIrpGuide] = useState(false)
  const [simYears, setSimYears] = useState(20)

  // Read URL params on mount
  useEffect(() => {
    try {
      const sp = searchParams
      if (sp.get('start')) setStartDate(sp.get('start')!)
      if (sp.get('end')) setEndDate(sp.get('end')!)
      if (sp.get('pay')) setMonthlyPay(sp.get('pay')!)
      if (sp.get('bonus')) setAnnualBonus(sp.get('bonus')!)
      if (sp.get('leave')) setAnnualLeaveAllowance(sp.get('leave')!)
    } catch {
      // SSR safety
    }
  }, [searchParams])

  // Sync state to URL
  const updateURL = useCallback((params: Record<string, string>) => {
    try {
      const url = new URL(window.location.href)
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value)
        else url.searchParams.delete(key)
      })
      window.history.replaceState({}, '', url)
    } catch {
      // SSR safety
    }
  }, [])

  const handleStartDate = (v: string) => { setStartDate(v); updateURL({ start: v, end: endDate, pay: monthlyPay, bonus: annualBonus, leave: annualLeaveAllowance }) }
  const handleEndDate = (v: string) => { setEndDate(v); updateURL({ start: startDate, end: v, pay: monthlyPay, bonus: annualBonus, leave: annualLeaveAllowance }) }
  const handleMonthlyPay = (v: string) => { setMonthlyPay(v); updateURL({ start: startDate, end: endDate, pay: v, bonus: annualBonus, leave: annualLeaveAllowance }) }
  const handleBonus = (v: string) => { setAnnualBonus(v); updateURL({ start: startDate, end: endDate, pay: monthlyPay, bonus: v, leave: annualLeaveAllowance }) }
  const handleLeave = (v: string) => { setAnnualLeaveAllowance(v); updateURL({ start: startDate, end: endDate, pay: monthlyPay, bonus: annualBonus, leave: v }) }

  // Core calculation
  const result = useMemo(() => {
    if (!startDate || !endDate || !monthlyPay) return null

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) return null

    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const years = Math.floor(totalDays / 365)
    const remainingDays = totalDays % 365
    const months = Math.floor(remainingDays / 30)
    const days = remainingDays % 30

    const monthly = parseFloat(monthlyPay) || 0
    const bonus = parseFloat(annualBonus) || 0
    const leaveAllowance = parseFloat(annualLeaveAllowance) || 0

    // 3개월 임금총액 계산
    const threeMonthBase = monthly * 3
    const threeMonthBonus = bonus * 3 / 12
    const threeMonthLeave = leaveAllowance * 3 / 12
    const threeMonthWages = threeMonthBase + threeMonthBonus + threeMonthLeave

    // 1일 평균임금 (3개월 = 90일 기준)
    const avgDailyWage = threeMonthWages / 90

    // 퇴직금 계산: 1일 평균임금 × 30일 × (재직일수 ÷ 365)
    const severancePay = avgDailyWage * 30 * (totalDays / 365)

    // Breakdown contributions
    const baseContribution = (monthly * 3 / 90) * 30 * (totalDays / 365)
    const bonusContribution = (threeMonthBonus / 90) * 30 * (totalDays / 365)
    const leaveContribution = (threeMonthLeave / 90) * 30 * (totalDays / 365)

    return {
      years,
      months,
      days,
      totalDays,
      avgDailyWage: Math.round(avgDailyWage),
      severancePay: Math.round(severancePay),
      baseContribution: Math.round(baseContribution),
      bonusContribution: Math.round(bonusContribution),
      leaveContribution: Math.round(leaveContribution),
    }
  }, [startDate, endDate, monthlyPay, annualBonus, annualLeaveAllowance])

  // Simulation: severance at different year marks
  const simulation = useMemo(() => {
    const monthly = parseFloat(monthlyPay) || 0
    if (!monthly) return null
    const bonus = parseFloat(annualBonus) || 0
    const leave = parseFloat(annualLeaveAllowance) || 0
    const threeMonthWages = (monthly * 3) + (bonus * 3 / 12) + (leave * 3 / 12)
    const avgDailyWage = threeMonthWages / 90

    return SIMULATION_YEARS.filter(y => y <= simYears).map(y => {
      const totalDays = y * 365
      const pay = avgDailyWage * 30 * (totalDays / 365)
      return { years: y, pay: Math.round(pay) }
    })
  }, [monthlyPay, annualBonus, annualLeaveAllowance, simYears])

  const maxSimPay = simulation ? Math.max(...simulation.map(s => s.pay)) : 0

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setMonthlyPay('')
    setAnnualBonus('')
    setAnnualLeaveAllowance('')
    updateURL({ start: '', end: '', pay: '', bonus: '', leave: '' })
  }

  const copyLink = useCallback(async () => {
    try {
      const url = new URL(window.location.href)
      if (startDate) url.searchParams.set('start', startDate)
      if (endDate) url.searchParams.set('end', endDate)
      if (monthlyPay) url.searchParams.set('pay', monthlyPay)
      if (annualBonus) url.searchParams.set('bonus', annualBonus)
      if (annualLeaveAllowance) url.searchParams.set('leave', annualLeaveAllowance)
      const link = url.toString()
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = link
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // ignore
    }
  }, [startDate, endDate, monthlyPay, annualBonus, annualLeaveAllowance])

  const shareResult = useCallback(async () => {
    if (navigator.share && result) {
      try {
        await navigator.share({
          title: t('title'),
          text: `${t('result.severancePay')}: ${formatNumber(result.severancePay)} ${t('result.won')}`,
          url: window.location.href,
        })
      } catch {
        copyLink()
      }
    } else {
      copyLink()
    }
  }, [result, t, copyLink])

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-7 h-7" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('inputInfo')}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('startDate')}
              </label>
              <input type="date" value={startDate} onChange={(e) => handleStartDate(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('endDate')}
              </label>
              <input type="date" value={endDate} onChange={(e) => handleEndDate(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('monthlyPay')}
              </label>
              <input type="number" value={monthlyPay} onChange={(e) => handleMonthlyPay(e.target.value)} placeholder={t('monthlyPayPlaceholder')} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('annualBonus')}
              </label>
              <input type="number" value={annualBonus} onChange={(e) => handleBonus(e.target.value)} placeholder={t('annualBonusPlaceholder')} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('annualLeaveAllowance')}
              </label>
              <input type="number" value={annualLeaveAllowance} onChange={(e) => handleLeave(e.target.value)} placeholder={t('annualLeaveAllowancePlaceholder')} className={inputClass} />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {t('reset')}
              </button>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? t('linkCopied') : t('copyLink')}
              </button>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {t('result.title')}
              </h2>
              {result && (
                <button
                  onClick={shareResult}
                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  {t('share')}
                </button>
              )}
            </div>

            {result ? (
              <div className="space-y-6">
                {/* Work Period */}
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                    {t('result.workPeriod')}
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {result.years}{t('result.years')} {result.months}{t('result.months')} {result.days}{t('result.days')}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-400 mt-2">
                    {t('result.totalDays')}: {formatNumber(result.totalDays)}{t('result.days')}
                  </div>
                </div>

                {/* Daily Wage */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('result.avgDailyWage')}
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(result.avgDailyWage)} {t('result.won')}
                  </div>
                </div>

                {/* Severance Pay */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
                  <div className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
                    {t('result.severancePay')}
                  </div>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {formatNumber(result.severancePay)} {t('result.won')}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-400 mt-3">
                    {t('result.taxExempt')}
                  </div>
                </div>

                {/* Breakdown Bar */}
                {(result.bonusContribution > 0 || result.leaveContribution > 0) && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('breakdown.title')}
                    </div>
                    <div className="flex rounded-lg overflow-hidden h-8">
                      <div
                        className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                        style={{ width: `${(result.baseContribution / result.severancePay) * 100}%`, minWidth: result.baseContribution > 0 ? '2rem' : 0 }}
                        title={`${t('breakdown.base')}: ${formatNumber(result.baseContribution)} ${t('result.won')}`}
                      />
                      {result.bonusContribution > 0 && (
                        <div
                          className="bg-indigo-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${(result.bonusContribution / result.severancePay) * 100}%`, minWidth: '2rem' }}
                          title={`${t('breakdown.bonus')}: ${formatNumber(result.bonusContribution)} ${t('result.won')}`}
                        />
                      )}
                      {result.leaveContribution > 0 && (
                        <div
                          className="bg-teal-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${(result.leaveContribution / result.severancePay) * 100}%`, minWidth: '2rem' }}
                          title={`${t('breakdown.leave')}: ${formatNumber(result.leaveContribution)} ${t('result.won')}`}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                        {t('breakdown.base')}: {formatNumber(result.baseContribution)} {t('result.won')}
                      </span>
                      {result.bonusContribution > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-indigo-500 inline-block" />
                          {t('breakdown.bonus')}: {formatNumber(result.bonusContribution)} {t('result.won')}
                        </span>
                      )}
                      {result.leaveContribution > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-teal-500 inline-block" />
                          {t('breakdown.leave')}: {formatNumber(result.leaveContribution)} {t('result.won')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Formula */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('result.formula')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {t('emptyState')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Section */}
      {(parseFloat(monthlyPay) || 0) > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('simulation.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('simulation.description')}
          </p>

          {/* Year slider */}
          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {t('simulation.maxYears')}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={simYears}
              onChange={(e) => setSimYears(parseInt(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm font-bold text-gray-900 dark:text-white w-12 text-right">
              {simYears}{t('result.years')}
            </span>
          </div>

          {/* Horizontal bar chart */}
          {simulation && simulation.length > 0 && (
            <div className="space-y-3">
              {simulation.map((item) => (
                <div key={item.years} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right shrink-0">
                    {item.years}{t('result.years')}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                      style={{ width: `${Math.max((item.pay / maxSimPay) * 100, 8)}%` }}
                    >
                      <span className="text-xs text-white font-medium whitespace-nowrap">
                        {formatNumber(item.pay)}{t('result.won')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IRP / DC / DB Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowIrpGuide(!showIrpGuide)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {t('irpGuide.title')}
          </h2>
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showIrpGuide ? 'rotate-180' : ''}`} />
        </button>

        {showIrpGuide && (
          <div className="mt-6 space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('irpGuide.description')}
            </p>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <th className="text-left px-4 py-3 border border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
                      {t('irpGuide.table.category')}
                    </th>
                    <th className="text-left px-4 py-3 border border-gray-200 dark:border-gray-700 font-semibold text-blue-700 dark:text-blue-400">
                      {t('irpGuide.table.db')}
                    </th>
                    <th className="text-left px-4 py-3 border border-gray-200 dark:border-gray-700 font-semibold text-indigo-700 dark:text-indigo-400">
                      {t('irpGuide.table.dc')}
                    </th>
                    <th className="text-left px-4 py-3 border border-gray-200 dark:border-gray-700 font-semibold text-teal-700 dark:text-teal-400">
                      {t('irpGuide.table.irp')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(['manager', 'contribution', 'returns', 'risk', 'taxBenefit', 'recommended'] as const).map((row) => (
                    <tr key={row} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <td className="px-4 py-3 border border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white">
                        {t(`irpGuide.table.rows.${row}.label`)}
                      </td>
                      <td className="px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        {t(`irpGuide.table.rows.${row}.db`)}
                      </td>
                      <td className="px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        {t(`irpGuide.table.rows.${row}.dc`)}
                      </td>
                      <td className="px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        {t(`irpGuide.table.rows.${row}.irp`)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* IRP Tax Benefit Highlight */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                {t('irpGuide.taxBenefitTitle')}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw('irpGuide.taxBenefitItems') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Calculation Method */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.calculation.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.calculation.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
