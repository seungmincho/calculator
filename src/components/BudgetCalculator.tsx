'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Check,
  Save,
  Trash2,
  Share2,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  RotateCcw,
} from 'lucide-react'

// ── Types ──

interface IncomeData {
  salary: number
  sideIncome: number
  otherIncome: number
}

interface ExpenseCategory {
  id: string
  labelKey: string
  icon: string
  amount: number
  budgetType: 'need' | 'want' | 'saving'
}

interface BudgetPreset {
  id: string
  name: string
  date: string
  income: IncomeData
  expenses: ExpenseCategory[]
}

// ── Constants ──

const CATEGORY_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#78716C', // stone
]

const DEFAULT_EXPENSES: ExpenseCategory[] = [
  { id: 'housing', labelKey: 'housing', icon: '🏠', amount: 0, budgetType: 'need' },
  { id: 'food', labelKey: 'food', icon: '🍚', amount: 0, budgetType: 'need' },
  { id: 'transport', labelKey: 'transport', icon: '🚌', amount: 0, budgetType: 'need' },
  { id: 'communication', labelKey: 'communication', icon: '📱', amount: 0, budgetType: 'need' },
  { id: 'insurance', labelKey: 'insurance', icon: '🛡️', amount: 0, budgetType: 'need' },
  { id: 'education', labelKey: 'education', icon: '📚', amount: 0, budgetType: 'want' },
  { id: 'medical', labelKey: 'medical', icon: '🏥', amount: 0, budgetType: 'need' },
  { id: 'leisure', labelKey: 'leisure', icon: '🎬', amount: 0, budgetType: 'want' },
  { id: 'clothing', labelKey: 'clothing', icon: '👔', amount: 0, budgetType: 'want' },
  { id: 'social', labelKey: 'social', icon: '💐', amount: 0, budgetType: 'want' },
  { id: 'savings', labelKey: 'savings', icon: '💰', amount: 0, budgetType: 'saving' },
  { id: 'other', labelKey: 'other', icon: '📦', amount: 0, budgetType: 'want' },
]

// Korean average expense ratios (approximate % of income)
const KOREAN_AVERAGE: Record<string, number> = {
  housing: 25,
  food: 15,
  transport: 8,
  communication: 4,
  insurance: 7,
  education: 8,
  medical: 4,
  leisure: 7,
  clothing: 5,
  social: 4,
  savings: 10,
  other: 3,
}

const STORAGE_KEY = 'budgetCalculator_presets'

// ── Helpers ──

function formatWon(value: number): string {
  return value.toLocaleString('ko-KR')
}

function parseWonInput(value: string): number {
  const num = parseInt(value.replace(/[^0-9]/g, ''), 10)
  return isNaN(num) ? 0 : num
}

// ── Component ──

export default function BudgetCalculator() {
  const t = useTranslations('budgetCalculator')

  // ── State ──
  const [income, setIncome] = useState<IncomeData>({
    salary: 3000000,
    sideIncome: 0,
    otherIncome: 0,
  })

  const [expenses, setExpenses] = useState<ExpenseCategory[]>(
    DEFAULT_EXPENSES.map((e) => ({ ...e }))
  )

  const [presets, setPresets] = useState<BudgetPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setPresets(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  // ── Derived values ──
  const totalIncome = useMemo(
    () => income.salary + income.sideIncome + income.otherIncome,
    [income]
  )

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const remaining = totalIncome - totalExpenses

  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0
    const savingsAmount = expenses.find((e) => e.id === 'savings')?.amount ?? 0
    return Math.round((savingsAmount / totalIncome) * 100)
  }, [totalIncome, expenses])

  const categoryBreakdown = useMemo(() => {
    return expenses
      .filter((e) => e.amount > 0)
      .map((e, i) => ({
        ...e,
        percent: totalExpenses > 0 ? (e.amount / totalExpenses) * 100 : 0,
        incomePercent: totalIncome > 0 ? (e.amount / totalIncome) * 100 : 0,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }))
  }, [expenses, totalExpenses, totalIncome])

  // 50/30/20 Rule
  const rule503020 = useMemo(() => {
    const needs = expenses
      .filter((e) => e.budgetType === 'need')
      .reduce((sum, e) => sum + e.amount, 0)
    const wants = expenses
      .filter((e) => e.budgetType === 'want')
      .reduce((sum, e) => sum + e.amount, 0)
    const saving = expenses
      .filter((e) => e.budgetType === 'saving')
      .reduce((sum, e) => sum + e.amount, 0)

    const needsTarget = totalIncome * 0.5
    const wantsTarget = totalIncome * 0.3
    const savingTarget = totalIncome * 0.2

    return {
      needs: { actual: needs, target: needsTarget, percent: totalIncome > 0 ? (needs / totalIncome) * 100 : 0 },
      wants: { actual: wants, target: wantsTarget, percent: totalIncome > 0 ? (wants / totalIncome) * 100 : 0 },
      saving: { actual: saving, target: savingTarget, percent: totalIncome > 0 ? (saving / totalIncome) * 100 : 0 },
    }
  }, [expenses, totalIncome])

  // Donut chart CSS
  const donutGradient = useMemo(() => {
    if (categoryBreakdown.length === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)'
    let acc = 0
    const segments = categoryBreakdown.map((item) => {
      const start = acc
      acc += (item.percent / 100) * 360
      return `${item.color} ${start}deg ${acc}deg`
    })
    if (acc < 360) {
      segments.push(`#e5e7eb ${acc}deg 360deg`)
    }
    return `conic-gradient(${segments.join(', ')})`
  }, [categoryBreakdown])

  // ── Handlers ──

  const handleIncomeChange = useCallback((field: keyof IncomeData, value: string) => {
    setIncome((prev) => ({ ...prev, [field]: parseWonInput(value) }))
  }, [])

  const handleExpenseChange = useCallback((id: string, value: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, amount: parseWonInput(value) } : e))
    )
  }, [])

  const handleExpenseSlider = useCallback((id: string, value: number) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, amount: value } : e))
    )
  }, [])

  const handleReset = useCallback(() => {
    setIncome({ salary: 3000000, sideIncome: 0, otherIncome: 0 })
    setExpenses(DEFAULT_EXPENSES.map((e) => ({ ...e })))
  }, [])

  const handleSavePreset = useCallback(() => {
    const name = presetName.trim() || t('preset.defaultName')
    const newPreset: BudgetPreset = {
      id: Date.now().toString(),
      name,
      date: new Date().toLocaleDateString('ko-KR'),
      income: { ...income },
      expenses: expenses.map((e) => ({ ...e })),
    }
    const updated = [newPreset, ...presets].slice(0, 10)
    setPresets(updated)
    setPresetName('')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }, [income, expenses, presets, presetName, t])

  const handleLoadPreset = useCallback((preset: BudgetPreset) => {
    setIncome({ ...preset.income })
    setExpenses(preset.expenses.map((e) => ({ ...e })))
  }, [])

  const handleDeletePreset = useCallback((id: string) => {
    const updated = presets.filter((p) => p.id !== id)
    setPresets(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }, [presets])

  const copyToClipboard = useCallback(
    async (text: string, id: string) => {
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
    },
    []
  )

  const handleShareSummary = useCallback(() => {
    const lines: string[] = [
      `=== ${t('share.title')} ===`,
      '',
      `[${t('income.title')}]`,
      `${t('income.salary')}: ${formatWon(income.salary)}${t('currency')}`,
    ]
    if (income.sideIncome > 0) {
      lines.push(`${t('income.sideIncome')}: ${formatWon(income.sideIncome)}${t('currency')}`)
    }
    if (income.otherIncome > 0) {
      lines.push(`${t('income.otherIncome')}: ${formatWon(income.otherIncome)}${t('currency')}`)
    }
    lines.push(`${t('summary.totalIncome')}: ${formatWon(totalIncome)}${t('currency')}`)
    lines.push('')
    lines.push(`[${t('expenses.title')}]`)
    expenses.forEach((e) => {
      if (e.amount > 0) {
        lines.push(`${e.icon} ${t(`categories.${e.labelKey}`)}: ${formatWon(e.amount)}${t('currency')}`)
      }
    })
    lines.push(`${t('summary.totalExpenses')}: ${formatWon(totalExpenses)}${t('currency')}`)
    lines.push('')
    lines.push(`[${t('summary.title')}]`)
    lines.push(
      `${t('summary.remaining')}: ${formatWon(remaining)}${t('currency')} (${remaining >= 0 ? t('summary.surplus') : t('summary.deficit')})`
    )
    lines.push(`${t('summary.savingsRate')}: ${savingsRate}%`)

    copyToClipboard(lines.join('\n'), 'share')
  }, [income, expenses, totalIncome, totalExpenses, remaining, savingsRate, t, copyToClipboard])

  // ── Quick-fill buttons ──
  const quickAmounts = [100000, 300000, 500000, 1000000]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Income + Expenses */}
        <div className="lg:col-span-1 space-y-6">
          {/* Income Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-500" />
              {t('income.title')}
            </h2>
            <div className="space-y-4">
              {(['salary', 'sideIncome', 'otherIncome'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t(`income.${field}`)}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={income[field] === 0 ? '' : formatWon(income[field])}
                      onChange={(e) => handleIncomeChange(field, e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-8 text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm pointer-events-none">
                      {t('currency')}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('summary.totalIncome')}
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatWon(totalIncome)}{t('currency')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('actions.reset')}
              </button>
              <button
                onClick={handleShareSummary}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                {copiedId === 'share' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                {copiedId === 'share' ? t('actions.copied') : t('actions.share')}
              </button>
            </div>

            {/* Save Preset */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('preset.placeholder')}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSavePreset}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {t('actions.save')}
              </button>
            </div>

            {/* Preset List */}
            {presets.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t('preset.saved')}
                </p>
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg"
                  >
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{preset.date}</span>
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Expense Grid + Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('expenses.title')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {expenses.map((expense, index) => {
                const avgPercent = KOREAN_AVERAGE[expense.id] ?? 0
                const avgAmount = Math.round(totalIncome * avgPercent / 100)
                const isOverAvg = expense.amount > avgAmount * 1.3 && avgAmount > 0

                return (
                  <div
                    key={expense.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      isOverAvg
                        ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{expense.icon}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {t(`categories.${expense.labelKey}`)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            expense.budgetType === 'need'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : expense.budgetType === 'saving'
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          {t(`budgetType.${expense.budgetType}`)}
                        </span>
                      </div>
                      {isOverAvg && (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                    </div>

                    <div className="relative mb-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={expense.amount === 0 ? '' : formatWon(expense.amount)}
                        onChange={(e) => handleExpenseChange(expense.id, e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-8 text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none">
                        {t('currency')}
                      </span>
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min="0"
                      max={Math.max(totalIncome * 0.5, 2000000)}
                      step="10000"
                      value={expense.amount}
                      onChange={(e) => handleExpenseSlider(expense.id, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />

                    {/* Quick amounts */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {quickAmounts.map((amt) => (
                        <button
                          key={amt}
                          onClick={() =>
                            handleExpenseSlider(expense.id, expense.amount + amt)
                          }
                          className="px-2 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded transition-colors"
                        >
                          +{amt >= 1000000 ? `${amt / 10000}${t('manWon')}` : `${formatWon(amt)}`}
                        </button>
                      ))}
                    </div>

                    {/* Korean average comparison */}
                    {totalIncome > 0 && (
                      <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                        {t('expenses.average')}: {formatWon(avgAmount)}{t('currency')} ({avgPercent}%)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary Section */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                {t('chart.title')}
              </h3>
              <div className="flex justify-center mb-4">
                <div className="relative w-48 h-48">
                  <div
                    className="w-full h-full rounded-full"
                    style={{ background: donutGradient }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-white dark:bg-gray-800 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('chart.total')}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatWon(totalExpenses)}
                      </span>
                      <span className="text-[10px] text-gray-400">{t('currency')}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-1.5">
                {categoryBreakdown.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.icon} {t(`categories.${item.labelKey}`)}
                      </span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {item.percent.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Income vs Expense + Stats */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  {t('summary.title')}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      {t('summary.totalIncome')}
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatWon(totalIncome)}{t('currency')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      {t('summary.totalExpenses')}
                    </span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {formatWon(totalExpenses)}{t('currency')}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('summary.remaining')}
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          remaining >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {remaining >= 0 ? '+' : ''}
                        {formatWon(remaining)}{t('currency')}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        remaining >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {remaining >= 0 ? t('summary.surplus') : t('summary.deficit')}
                    </p>
                  </div>

                  {/* Progress bar: expense / income */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>{t('summary.usageRate')}</span>
                      <span>
                        {totalIncome > 0
                          ? Math.min(Math.round((totalExpenses / totalIncome) * 100), 999)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          totalExpenses > totalIncome
                            ? 'bg-red-500'
                            : totalExpenses > totalIncome * 0.8
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Savings Rate */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                      <PiggyBank className="w-4 h-4 text-green-500" />
                      {t('summary.savingsRate')}
                    </span>
                    <span
                      className={`font-semibold ${
                        savingsRate >= 20
                          ? 'text-green-600 dark:text-green-400'
                          : savingsRate >= 10
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {savingsRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Bars */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  {t('chart.categoryBars')}
                </h3>
                <div className="space-y-2">
                  {categoryBreakdown.map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item.icon} {t(`categories.${item.labelKey}`)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatWon(item.amount)}{t('currency')} ({item.incomePercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(item.incomePercent, 100)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {categoryBreakdown.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      {t('chart.noData')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 50/30/20 Rule */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {t('rule.title')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t('rule.description')}
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Needs 50% */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {t('rule.needs')} (50%)
                  </span>
                  {rule503020.needs.percent > 55 && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                  {formatWon(rule503020.needs.actual)}{t('currency')}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t('rule.target')}: {formatWon(Math.round(rule503020.needs.target))}{t('currency')}
                </p>
                <div className="mt-2 w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rule503020.needs.percent > 55 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(rule503020.needs.percent * 2, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t('rule.actual')}: {rule503020.needs.percent.toFixed(1)}%
                </p>
              </div>

              {/* Wants 30% */}
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {t('rule.wants')} (30%)
                  </span>
                  {rule503020.wants.percent > 35 && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                  {formatWon(rule503020.wants.actual)}{t('currency')}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {t('rule.target')}: {formatWon(Math.round(rule503020.wants.target))}{t('currency')}
                </p>
                <div className="mt-2 w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rule503020.wants.percent > 35 ? 'bg-amber-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min((rule503020.wants.percent / 30) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {t('rule.actual')}: {rule503020.wants.percent.toFixed(1)}%
                </p>
              </div>

              {/* Savings 20% */}
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {t('rule.saving')} (20%)
                  </span>
                  {rule503020.saving.percent < 15 && totalIncome > 0 && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">
                  {formatWon(rule503020.saving.actual)}{t('currency')}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {t('rule.target')}: {formatWon(Math.round(rule503020.saving.target))}{t('currency')}
                </p>
                <div className="mt-2 w-full h-2 bg-green-200 dark:bg-green-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rule503020.saving.percent < 15 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((rule503020.saving.percent / 20) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {t('rule.actual')}: {rule503020.saving.percent.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Recommendations */}
            {totalIncome > 0 && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('rule.recommendations')}
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  {rule503020.needs.percent > 55 && (
                    <li className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      {t('rule.rec.needsHigh')}
                    </li>
                  )}
                  {rule503020.wants.percent > 35 && (
                    <li className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      {t('rule.rec.wantsHigh')}
                    </li>
                  )}
                  {rule503020.saving.percent < 15 && (
                    <li className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      {t('rule.rec.savingLow')}
                    </li>
                  )}
                  {rule503020.needs.percent <= 55 &&
                    rule503020.wants.percent <= 35 &&
                    rule503020.saving.percent >= 15 && (
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {t('rule.rec.good')}
                      </li>
                    )}
                  {totalExpenses > totalIncome && (
                    <li className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      {t('rule.rec.overBudget')}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 w-full text-left"
        >
          <BookOpen className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex-1">
            {t('guide.title')}
          </h2>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showGuide ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showGuide && (
          <div className="mt-6 space-y-6">
            {/* How to use */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {t('guide.usage.title')}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guide.usage.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* 50/30/20 Guide */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {t('guide.rule.title')}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guide.rule.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {t('guide.tips.title')}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
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
