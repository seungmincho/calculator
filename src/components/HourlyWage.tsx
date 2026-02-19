'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { DollarSign, Clock, TrendingUp, BookOpen, ArrowRightLeft } from 'lucide-react'

type InputType = 'hourly' | 'daily' | 'monthly' | 'yearly'

export default function HourlyWage() {
  const t = useTranslations('hourlyWage')

  const [inputType, setInputType] = useState<InputType>('hourly')
  const [amount, setAmount] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState(8)
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [daysPerMonth, setDaysPerMonth] = useState(21.74)

  const MINIMUM_WAGE_2024 = 10320 // 2026년 최저임금 (시급)
  const MONTHLY_MIN_209_HOURS = 2156880 // 209 hours × 10,320

  const results = useMemo(() => {
    const inputAmount = parseFloat(amount.replace(/,/g, ''))
    if (!inputAmount || inputAmount <= 0) {
      return { hourly: 0, daily: 0, monthly: 0, yearly: 0 }
    }

    let hourlyWage = 0

    switch (inputType) {
      case 'hourly':
        hourlyWage = inputAmount
        break
      case 'daily':
        hourlyWage = inputAmount / hoursPerDay
        break
      case 'monthly':
        // Monthly → hourly: monthly ÷ (hours per day × days per month)
        hourlyWage = inputAmount / (hoursPerDay * daysPerMonth)
        break
      case 'yearly':
        // Yearly → monthly → hourly
        hourlyWage = inputAmount / 12 / (hoursPerDay * daysPerMonth)
        break
    }

    const dailyWage = hourlyWage * hoursPerDay
    const monthlyWage = hourlyWage * hoursPerDay * daysPerMonth
    const yearlyWage = monthlyWage * 12

    return {
      hourly: hourlyWage,
      daily: dailyWage,
      monthly: monthlyWage,
      yearly: yearlyWage,
    }
  }, [amount, inputType, hoursPerDay, daysPerMonth])

  const minimumWageComparison = useMemo(() => {
    if (results.hourly === 0) {
      return { percent: 0, isAbove: false }
    }
    const percent = Math.round((results.hourly / MINIMUM_WAGE_2024) * 100)
    return {
      percent,
      isAbove: results.hourly >= MINIMUM_WAGE_2024,
    }
  }, [results.hourly])

  const handleReset = () => {
    setInputType('hourly')
    setAmount('')
    setHoursPerDay(8)
    setDaysPerWeek(5)
    setDaysPerMonth(21.74)
  }

  const formatCurrency = (value: number) => {
    return Math.round(value).toLocaleString('ko-KR')
  }

  const showResults = results.hourly > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel (Left 1/3) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('inputType')}
              </h2>
            </div>

            {/* Input Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('inputType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['hourly', 'daily', 'monthly', 'yearly'] as InputType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setInputType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputType === type
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('amount')}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '')
                    if (value === '' || /^\d+$/.test(value)) {
                      setAmount(value ? parseInt(value).toLocaleString('ko-KR') : '')
                    }
                  }}
                  placeholder={t('amountPlaceholder')}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Work Settings */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Work Settings
                </h3>
              </div>

              {/* Hours per Day */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workHoursPerDay')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Math.max(1, parseFloat(e.target.value) || 1))}
                    min="1"
                    max="24"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t('hours')}
                  </span>
                </div>
              </div>

              {/* Days per Week */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workDaysPerWeek')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(Math.max(1, Math.min(7, parseFloat(e.target.value) || 1)))}
                    min="1"
                    max="7"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t('days')}
                  </span>
                </div>
              </div>

              {/* Days per Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workDaysPerMonth')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={daysPerMonth}
                    onChange={(e) => setDaysPerMonth(Math.max(1, parseFloat(e.target.value) || 1))}
                    min="1"
                    max="31"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t('days')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel (Right 2/3) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t('result.title')}
            </h2>

            {showResults ? (
              <div className="space-y-4">
                {/* Hourly Wage */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-4 border-t-4 border-blue-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('result.hourlyWage')}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(results.hourly)} <span className="text-lg">{t('result.won')}</span>
                      </div>
                    </div>
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                {/* Daily Wage */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-4 border-t-4 border-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('result.dailyWage')}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(results.daily)} <span className="text-lg">{t('result.won')}</span>
                      </div>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                {/* Monthly Wage */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl p-4 border-t-4 border-purple-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('result.monthlyWage')}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(results.monthly)} <span className="text-lg">{t('result.won')}</span>
                      </div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                {/* Yearly Wage */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-xl p-4 border-t-4 border-orange-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('result.yearlyWage')}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(results.yearly)} <span className="text-lg">{t('result.won')}</span>
                      </div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                </div>

                {/* Minimum Wage Comparison */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('minimumWage.title')}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('minimumWage.current')}
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {t('minimumWage.currentValue')}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('minimumWage.monthlyMin')}
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {t('minimumWage.monthlyMinValue')}
                      </div>
                    </div>
                  </div>
                  <div className={`mt-4 p-4 rounded-lg ${
                    minimumWageComparison.isAbove
                      ? 'bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-700'
                      : 'bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium mb-1">
                          {t('minimumWage.comparison')}
                        </div>
                        <div className={`text-lg font-bold ${
                          minimumWageComparison.isAbove
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {minimumWageComparison.isAbove ? t('minimumWage.above') : t('minimumWage.below')}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {t('minimumWage.percent', { percent: minimumWageComparison.percent })}
                        </div>
                      </div>
                      <div className={`text-3xl font-bold ${
                        minimumWageComparison.isAbove
                          ? 'text-green-600 dark:text-green-500'
                          : 'text-red-600 dark:text-red-500'
                      }`}>
                        {minimumWageComparison.percent}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{t('amountPlaceholder')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('guide.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Conversion Basis */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.conversion.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.conversion.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 mt-1">•</span>
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
