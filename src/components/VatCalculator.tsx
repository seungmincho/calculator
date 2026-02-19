'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Receipt, Copy, Check, RotateCcw, BookOpen, Calculator } from 'lucide-react'

type CalculationMode = 'fromSupply' | 'fromTotal' | 'fromVat'

export default function VatCalculator() {
  const t = useTranslations('vatCalculator')
  const [mode, setMode] = useState<CalculationMode>('fromSupply')
  const [inputAmount, setInputAmount] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const calculations = useMemo(() => {
    const amount = parseFloat(inputAmount) || 0

    if (amount <= 0) {
      return { supply: 0, vat: 0, total: 0 }
    }

    switch (mode) {
      case 'fromSupply':
        return {
          supply: amount,
          vat: Math.round(amount * 0.1),
          total: Math.round(amount * 1.1)
        }
      case 'fromTotal':
        return {
          supply: Math.round(amount / 1.1),
          vat: Math.round(amount / 11),
          total: amount
        }
      case 'fromVat':
        return {
          supply: amount * 10,
          vat: amount,
          total: amount * 11
        }
      default:
        return { supply: 0, vat: 0, total: 0 }
    }
  }, [mode, inputAmount])

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  const handleQuickAmount = (amount: number) => {
    setInputAmount(amount.toString())
  }

  const handleReset = () => {
    setInputAmount('')
  }

  const handleCopyAll = () => {
    const allText = `${t('supplyAmount')}: ${formatCurrency(calculations.supply)}원\n${t('vatAmount')}: ${formatCurrency(calculations.vat)}원\n${t('totalAmount')}: ${formatCurrency(calculations.total)}원`
    copyToClipboard(allText, 'all')
  }

  const quickAmounts = [
    { label: '1만', value: 10000 },
    { label: '5만', value: 50000 },
    { label: '10만', value: 100000 },
    { label: '50만', value: 500000 },
    { label: '100만', value: 1000000 },
    { label: '500만', value: 5000000 },
    { label: '1000만', value: 10000000 },
    { label: '5000만', value: 50000000 },
    { label: '1억', value: 100000000 }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-7 h-7" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel: Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Mode Tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                계산 모드
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setMode('fromSupply')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    mode === 'fromSupply'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('mode.fromSupply')}
                </button>
                <button
                  onClick={() => setMode('fromTotal')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    mode === 'fromTotal'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('mode.fromTotal')}
                </button>
                <button
                  onClick={() => setMode('fromVat')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    mode === 'fromVat'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('mode.fromVat')}
                </button>
              </div>
            </div>

            {/* Input Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                금액 입력
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                  ₩
                </span>
                <input
                  type="number"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder={t('enterAmount')}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quickAmounts')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((qa) => (
                  <button
                    key={qa.value}
                    onClick={() => handleQuickAmount(qa.value)}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Result Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Supply Amount Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('supplyAmount')}</h3>
                <button
                  onClick={() => copyToClipboard(formatCurrency(calculations.supply), 'supply')}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {copiedId === 'supply' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(calculations.supply)}원</p>
            </div>

            {/* VAT Card */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('vatAmount')}</h3>
                <button
                  onClick={() => copyToClipboard(formatCurrency(calculations.vat), 'vat')}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {copiedId === 'vat' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(calculations.vat)}원</p>
              <p className="text-xs opacity-75 mt-1">(10%)</p>
            </div>

            {/* Total Card */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('totalAmount')}</h3>
                <button
                  onClick={() => copyToClipboard(formatCurrency(calculations.total), 'total')}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {copiedId === 'total' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(calculations.total)}원</p>
            </div>
          </div>

          {/* Tax Invoice Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                {t('receipt')}
              </h3>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                {copiedId === 'all' ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t('copyAll')}
                  </>
                )}
              </button>
            </div>

            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              {/* Invoice Header */}
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b-2 border-gray-300 dark:border-gray-600">
                <h4 className="text-center font-bold text-gray-900 dark:text-white">
                  세금계산서
                </h4>
              </div>

              {/* Invoice Body */}
              <div className="p-6 space-y-4">
                {/* Supply Amount Row */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {t('supplyAmount')}
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(calculations.supply)}원
                  </span>
                </div>

                {/* VAT Row */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {t('vatAmount')}
                  </span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(calculations.vat)}원
                  </span>
                </div>

                {/* Total Row */}
                <div className="flex items-center justify-between py-3 bg-blue-50 dark:bg-blue-950 rounded-lg px-4">
                  <span className="text-gray-900 dark:text-white font-bold text-lg">
                    {t('totalAmount')}
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(calculations.total)}원
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* Basic */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.basic.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.basic.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Reverse */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.reverse.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.reverse.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
