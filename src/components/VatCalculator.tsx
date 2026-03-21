'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Receipt, Copy, Check, RotateCcw, BookOpen, Calculator, Plus, Trash2, Link, List } from 'lucide-react'

type CalculationMode = 'fromSupply' | 'fromTotal' | 'fromVat'

interface BatchItem {
  id: string
  name: string
  amount: string
}

function calcFromMode(mode: CalculationMode, amount: number) {
  if (amount <= 0) return { supply: 0, vat: 0, total: 0 }
  switch (mode) {
    case 'fromSupply':
      return { supply: amount, vat: Math.round(amount * 0.1), total: Math.round(amount * 1.1) }
    case 'fromTotal':
      return { supply: Math.round(amount / 1.1), vat: Math.round(amount / 11), total: amount }
    case 'fromVat':
      return { supply: amount * 10, vat: amount, total: amount * 11 }
    default:
      return { supply: 0, vat: 0, total: 0 }
  }
}

export default function VatCalculator() {
  const t = useTranslations('vatCalculator')
  const searchParams = useSearchParams()
  const didInit = useRef(false)

  // ── State ──
  const [mode, setMode] = useState<CalculationMode>('fromSupply')
  const [inputAmount, setInputAmount] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single')

  // Batch mode state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([
    { id: '1', name: '', amount: '' }
  ])

  // ── URL Param Init (runs once) ──
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const paramAmount = searchParams.get('amount')
    const paramType = searchParams.get('type') as CalculationMode | null

    if (paramAmount) setInputAmount(paramAmount)
    if (paramType && ['fromSupply', 'fromTotal', 'fromVat'].includes(paramType)) {
      setMode(paramType)
    }
  }, [searchParams])

  // ── URL Sync ──
  const updateURL = useCallback((amount: string, type: CalculationMode) => {
    const url = new URL(window.location.href)
    if (amount) {
      url.searchParams.set('amount', amount)
    } else {
      url.searchParams.delete('amount')
    }
    url.searchParams.set('type', type)
    window.history.replaceState({}, '', url.toString())
  }, [])

  const handleModeChange = (m: CalculationMode) => {
    setMode(m)
    updateURL(inputAmount, m)
  }

  const handleAmountChange = (val: string) => {
    setInputAmount(val)
    updateURL(val, mode)
  }

  // ── Single-mode Calculation ──
  const calculations = useMemo(() => {
    return calcFromMode(mode, parseFloat(inputAmount) || 0)
  }, [mode, inputAmount])

  // ── Batch Calculation ──
  const batchResults = useMemo(() => {
    return batchItems.map(item => {
      const amt = parseFloat(item.amount) || 0
      const result = calcFromMode('fromSupply', amt)
      return { ...item, ...result }
    })
  }, [batchItems])

  const batchTotals = useMemo(() => {
    return batchResults.reduce(
      (acc, r) => ({ supply: acc.supply + r.supply, vat: acc.vat + r.vat, total: acc.total + r.total }),
      { supply: 0, vat: 0, total: 0 }
    )
  }, [batchResults])

  // ── Clipboard ──
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

  const handleCopyLink = () => {
    copyToClipboard(window.location.href, 'link')
  }

  const handleCopyAll = () => {
    const allText = `${t('supplyAmount')}: ${formatCurrency(calculations.supply)}원\n${t('vatAmount')}: ${formatCurrency(calculations.vat)}원\n${t('totalAmount')}: ${formatCurrency(calculations.total)}원`
    copyToClipboard(allText, 'all')
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR').format(value)

  const handleQuickAmount = (amount: number) => {
    handleAmountChange(amount.toString())
  }

  const handleReset = () => {
    handleAmountChange('')
  }

  // ── Batch Actions ──
  const addBatchItem = () => {
    setBatchItems(prev => [...prev, { id: Date.now().toString(), name: '', amount: '' }])
  }

  const removeBatchItem = (id: string) => {
    setBatchItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)
  }

  const updateBatchItem = (id: string, field: 'name' | 'amount', value: string) => {
    setBatchItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  // ── Pie chart via conic-gradient ──
  const supplyPct = calculations.total > 0 ? (calculations.supply / calculations.total) * 100 : 90.9
  const vatPct = 100 - supplyPct

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-7 h-7" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm"
          title="링크 복사"
        >
          {copiedId === 'link' ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">{t('linkCopied')}</span>
            </>
          ) : (
            <>
              <Link className="w-4 h-4" />
              {t('copyLink')}
            </>
          )}
        </button>
      </div>

      {/* Tab: Single / Batch */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'single'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4" />
          {t('singleMode')}
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'batch'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <List className="w-4 h-4" />
          {t('batchMode')}
        </button>
      </div>

      {/* ── SINGLE MODE ── */}
      {activeTab === 'single' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel: Settings */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
              {/* Mode Tabs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('calcMode')}
                </label>
                <div className="space-y-2">
                  {(['fromSupply', 'fromTotal', 'fromVat'] as CalculationMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                        mode === m
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t(`mode.${m}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('amountLabel')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                    ₩
                  </span>
                  <input
                    type="number"
                    value={inputAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
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
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">{t('supplyAmount')}</h3>
                  <button
                    onClick={() => copyToClipboard(formatCurrency(calculations.supply), 'supply')}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {copiedId === 'supply' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(calculations.supply)}원</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">{t('vatAmount')}</h3>
                  <button
                    onClick={() => copyToClipboard(formatCurrency(calculations.vat), 'vat')}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {copiedId === 'vat' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(calculations.vat)}원</p>
                <p className="text-xs opacity-75 mt-1">(10%)</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">{t('totalAmount')}</h3>
                  <button
                    onClick={() => copyToClipboard(formatCurrency(calculations.total), 'total')}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {copiedId === 'total' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(calculations.total)}원</p>
              </div>
            </div>

            {/* Pie Chart + Invoice */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* CSS Pie Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  {t('pieChartTitle')}
                </h3>
                <div className="flex items-center gap-6">
                  {/* Donut via conic-gradient */}
                  <div className="relative flex-shrink-0 w-28 h-28">
                    <div
                      className="w-28 h-28 rounded-full"
                      style={{
                        background: `conic-gradient(#3b82f6 0% ${supplyPct}%, #f97316 ${supplyPct}% 100%)`
                      }}
                    />
                    {/* Donut hole */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center leading-tight">
                          10%<br/>VAT
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('supplyAmount')}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white pl-5">
                        {supplyPct.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('vatAmount')}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white pl-5">
                        {vatPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Invoice Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    {t('receipt')}
                  </h3>
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors text-sm"
                  >
                    {copiedId === 'all' ? (
                      <><Check className="w-3.5 h-3.5" />{t('copied')}</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" />{t('copyAll')}</>
                    )}
                  </button>
                </div>

                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b-2 border-gray-300 dark:border-gray-600">
                    <h4 className="text-center font-bold text-gray-900 dark:text-white text-sm">세금계산서</h4>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">{t('supplyAmount')}</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{formatCurrency(calculations.supply)}원</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">{t('vatAmount')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 text-sm">{formatCurrency(calculations.vat)}원</span>
                    </div>
                    <div className="flex items-center justify-between py-2 bg-blue-50 dark:bg-blue-950 rounded-lg px-3">
                      <span className="text-gray-900 dark:text-white font-bold text-sm">{t('totalAmount')}</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(calculations.total)}원</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BATCH MODE ── */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('batchMode')}
              </h2>
              <button
                onClick={addBatchItem}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('batchAdd')}
              </button>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 mb-2 px-1">
              <div className="col-span-4 text-xs font-medium text-gray-500 dark:text-gray-400">{t('batchItemName')}</div>
              <div className="col-span-3 text-xs font-medium text-gray-500 dark:text-gray-400">{t('batchSupply')}</div>
              <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t('batchVat')}</div>
              <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t('batchTotal')}</div>
              <div className="col-span-1" />
            </div>

            {/* Items */}
            <div className="space-y-2">
              {batchResults.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateBatchItem(item.id, 'name', e.target.value)}
                      placeholder={`${t('batchItemName')} ${idx + 1}`}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₩</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateBatchItem(item.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="w-full pl-6 pr-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-orange-600 dark:text-orange-400 font-medium text-right pr-1">
                    {item.vat > 0 ? formatCurrency(item.vat) : '-'}
                  </div>
                  <div className="col-span-2 text-sm text-blue-600 dark:text-blue-400 font-bold text-right pr-1">
                    {item.total > 0 ? formatCurrency(item.total) : '-'}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeBatchItem(item.id)}
                      disabled={batchItems.length === 1}
                      className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Row */}
            <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4 text-sm font-bold text-gray-900 dark:text-white">{t('batchTotal')} ({batchItems.length}개)</div>
              <div className="col-span-3 text-sm font-bold text-gray-900 dark:text-white text-right pr-1">
                {formatCurrency(batchTotals.supply)}
              </div>
              <div className="col-span-2 text-sm font-bold text-orange-600 dark:text-orange-400 text-right pr-1">
                {formatCurrency(batchTotals.vat)}
              </div>
              <div className="col-span-2 text-sm font-bold text-blue-600 dark:text-blue-400 text-right pr-1">
                {formatCurrency(batchTotals.total)}
              </div>
              <div className="col-span-1" />
            </div>
          </div>

          {/* Batch Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white">
              <p className="text-sm opacity-90 mb-1">{t('supplyAmount')} {t('batchTotalLabel')}</p>
              <p className="text-2xl font-bold">{formatCurrency(batchTotals.supply)}원</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-5 text-white">
              <p className="text-sm opacity-90 mb-1">{t('vatAmount')} {t('batchTotalLabel')}</p>
              <p className="text-2xl font-bold">{formatCurrency(batchTotals.vat)}원</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white">
              <p className="text-sm opacity-90 mb-1">{t('totalAmount')} {t('batchTotalLabel')}</p>
              <p className="text-2xl font-bold">{formatCurrency(batchTotals.total)}원</p>
            </div>
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
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
