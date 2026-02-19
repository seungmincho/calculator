'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CreditCard, Calculator, BookOpen } from 'lucide-react'

interface ScheduleRow {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export default function InstallmentCalc() {
  const t = useTranslations('installmentCalc')

  const [totalAmount, setTotalAmount] = useState<string>('1000000')
  const [months, setMonths] = useState<number>(12)
  const [interestRate, setInterestRate] = useState<string>('5.9')
  const [isFreeInstallment, setIsFreeInstallment] = useState<boolean>(false)

  const quickMonthOptions = [2, 3, 6, 10, 12, 24]

  const handleFreeInstallmentToggle = (checked: boolean) => {
    setIsFreeInstallment(checked)
    if (checked) {
      setInterestRate('0')
    }
  }

  const result = useMemo(() => {
    const amount = parseFloat(totalAmount) || 0
    const rate = isFreeInstallment ? 0 : parseFloat(interestRate) || 0

    if (amount <= 0 || months <= 0) {
      return null
    }

    let monthlyPayment: number
    let totalPayment: number
    let totalInterest: number
    const schedule: ScheduleRow[] = []

    if (rate === 0) {
      // Interest-free installment
      monthlyPayment = amount / months
      totalPayment = amount
      totalInterest = 0

      let remainingBalance = amount
      for (let i = 1; i <= months; i++) {
        const principal = monthlyPayment
        const interest = 0
        remainingBalance -= principal

        schedule.push({
          month: i,
          payment: monthlyPayment,
          principal,
          interest,
          balance: i === months ? 0 : remainingBalance
        })
      }
    } else {
      // With interest - equal payment formula
      const monthlyRate = rate / 100 / 12
      const powerTerm = Math.pow(1 + monthlyRate, months)
      monthlyPayment = amount * monthlyRate * powerTerm / (powerTerm - 1)
      totalPayment = monthlyPayment * months
      totalInterest = totalPayment - amount

      let remainingBalance = amount
      for (let i = 1; i <= months; i++) {
        const interest = remainingBalance * monthlyRate
        const principal = monthlyPayment - interest
        remainingBalance -= principal

        schedule.push({
          month: i,
          payment: monthlyPayment,
          principal,
          interest,
          balance: i === months ? 0 : remainingBalance
        })
      }
    }

    const effectiveRate = amount > 0 ? (totalInterest / amount * 100) : 0

    return {
      monthlyPayment,
      totalPayment,
      totalInterest,
      effectiveRate,
      schedule
    }
  }, [totalAmount, months, interestRate, isFreeInstallment])

  const handleReset = () => {
    setTotalAmount('1000000')
    setMonths(12)
    setInterestRate('5.9')
    setIsFreeInstallment(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-4">
              <CreditCard className="w-5 h-5" />
              <h2 className="font-semibold">{t('title')}</h2>
            </div>

            {/* Total Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('totalAmount')}
              </label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder={t('totalAmountPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Installment Months */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('installmentMonths')}
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {quickMonthOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setMonths(option)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      months === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option}{t('months')}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Free Installment Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="freeInstallment"
                checked={isFreeInstallment}
                onChange={(e) => handleFreeInstallmentToggle(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="freeInstallment" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('freeInstallment')}
              </label>
            </div>

            {/* Interest Rate */}
            {!isFreeInstallment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('interestRate')}
                </label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder={t('interestRatePlaceholder')}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Results */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-4">
                <Calculator className="w-5 h-5" />
                <h2 className="font-semibold">{t('result.title')}</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('result.monthlyPayment')}
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.monthlyPayment.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}{t('result.won')}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('result.totalPayment')}
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.totalPayment.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}{t('result.won')}
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('result.totalInterest')}
                  </div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {result.totalInterest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}{t('result.won')}
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('result.effectiveRate')}
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {result.effectiveRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Schedule */}
          {result && result.schedule.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('schedule.title')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                        {t('schedule.month')}
                      </th>
                      <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                        {t('schedule.payment')}
                      </th>
                      <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                        {t('schedule.principal')}
                      </th>
                      <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                        {t('schedule.interest')}
                      </th>
                      <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                        {t('schedule.balance')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((row) => (
                      <tr
                        key={row.month}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="py-3 px-2 text-gray-900 dark:text-white">
                          {row.month}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-900 dark:text-white font-medium">
                          {row.payment.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-2 text-right text-blue-600 dark:text-blue-400">
                          {row.principal.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-2 text-right text-orange-600 dark:text-orange-400">
                          {row.interest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-400">
                          {row.balance.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-6">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('guide.title')}
          </h2>
        </div>

        <div className="space-y-6">
          {/* Interest Rates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.rates.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.rates.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
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
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
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
