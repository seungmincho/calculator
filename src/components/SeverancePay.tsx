'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Briefcase, Calendar, DollarSign, BookOpen } from 'lucide-react'

export default function SeverancePay() {
  const t = useTranslations('severancePay')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthlyPay, setMonthlyPay] = useState('')
  const [annualBonus, setAnnualBonus] = useState('')
  const [annualLeaveAllowance, setAnnualLeaveAllowance] = useState('')

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
    const threeMonthWages = (monthly * 3) + (bonus * 3 / 12) + (leaveAllowance * 3 / 12)

    // 1일 평균임금 (3개월 = 90일 기준)
    const avgDailyWage = threeMonthWages / 90

    // 퇴직금 계산: 1일 평균임금 × 30일 × (재직일수 ÷ 365)
    const severancePay = avgDailyWage * 30 * (totalDays / 365)

    return {
      years,
      months,
      days,
      totalDays,
      avgDailyWage: Math.round(avgDailyWage),
      severancePay: Math.round(severancePay)
    }
  }, [startDate, endDate, monthlyPay, annualBonus, annualLeaveAllowance])

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setMonthlyPay('')
    setAnnualBonus('')
    setAnnualLeaveAllowance('')
  }

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
              입력 정보
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('monthlyPay')}
              </label>
              <input
                type="number"
                value={monthlyPay}
                onChange={(e) => setMonthlyPay(e.target.value)}
                placeholder={t('monthlyPayPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('annualBonus')}
              </label>
              <input
                type="number"
                value={annualBonus}
                onChange={(e) => setAnnualBonus(e.target.value)}
                placeholder={t('annualBonusPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('annualLeaveAllowance')}
              </label>
              <input
                type="number"
                value={annualLeaveAllowance}
                onChange={(e) => setAnnualLeaveAllowance(e.target.value)}
                placeholder={t('annualLeaveAllowancePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5" />
              {t('result.title')}
            </h2>

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
                    {t('result.totalDays')}: {result.totalDays.toLocaleString('ko-KR')}{t('result.days')}
                  </div>
                </div>

                {/* Daily Wage */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('result.avgDailyWage')}
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {result.avgDailyWage.toLocaleString('ko-KR')} {t('result.won')}
                  </div>
                </div>

                {/* Severance Pay */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
                  <div className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
                    {t('result.severancePay')}
                  </div>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {result.severancePay.toLocaleString('ko-KR')} {t('result.won')}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-400 mt-3">
                    {t('result.taxExempt')}
                  </div>
                </div>

                {/* Formula */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t('result.formula')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                입사일, 퇴사일, 월 기본급을 입력하세요
              </div>
            )}
          </div>
        </div>
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
