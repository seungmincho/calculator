'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  History,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  X,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import { historyStorage, CalculationHistory } from '@/utils/localStorage'

// ── Tool metadata map ──────────────────────────────────────────────────────────
const TOOL_META: Record<
  CalculationHistory['type'],
  { icon: string; nameKo: string; nameEn: string; href: string; color: string }
> = {
  salary: { icon: '💰', nameKo: '급여 계산기', nameEn: 'Salary Calculator', href: '/', color: 'blue' },
  loan: { icon: '🏦', nameKo: '대출 계산기', nameEn: 'Loan Calculator', href: '/loan-calculator', color: 'green' },
  savings: { icon: '💳', nameKo: '적금 계산기', nameEn: 'Savings Calculator', href: '/savings-calculator', color: 'emerald' },
  retirement: { icon: '🏖️', nameKo: '퇴직금 계산기', nameEn: 'Retirement Calculator', href: '/retirement-calculator', color: 'orange' },
  tax: { icon: '📋', nameKo: '세금 계산기', nameEn: 'Tax Calculator', href: '/tax-calculator', color: 'red' },
  exchange: { icon: '💱', nameKo: '환율 계산기', nameEn: 'Exchange Calculator', href: '/exchange-calculator', color: 'yellow' },
  'real-estate': { icon: '🏠', nameKo: '부동산 계산기', nameEn: 'Real Estate Calculator', href: '/real-estate-calculator', color: 'purple' },
  stock: { icon: '📈', nameKo: '주식 계산기', nameEn: 'Stock Calculator', href: '/stock-calculator', color: 'indigo' },
  'car-loan': { icon: '🚗', nameKo: '자동차 할부', nameEn: 'Car Loan Calculator', href: '/car-loan-calculator', color: 'sky' },
  'car-tax': { icon: '🚙', nameKo: '자동차 세금', nameEn: 'Car Tax Calculator', href: '/car-tax-calculator', color: 'teal' },
  fuel: { icon: '⛽', nameKo: '연료비 계산기', nameEn: 'Fuel Calculator', href: '/fuel-calculator', color: 'amber' },
  regex: { icon: '🔍', nameKo: '정규식 추출기', nameEn: 'Regex Extractor', href: '/regex-extractor', color: 'slate' },
  bmi: { icon: '⚖️', nameKo: 'BMI 계산기', nameEn: 'BMI Calculator', href: '/bmi-calculator', color: 'pink' },
  calorie: { icon: '🥗', nameKo: '칼로리 계산기', nameEn: 'Calorie Calculator', href: '/calorie-calculator', color: 'lime' },
  bodyFat: { icon: '💪', nameKo: '체지방 계산기', nameEn: 'Body Fat Calculator', href: '/body-fat-calculator', color: 'rose' },
  workHours: { icon: '⏱️', nameKo: '근로시간 계산기', nameEn: 'Work Hours Calculator', href: '/work-hours-calculator', color: 'violet' },
  lotto: { icon: '🎱', nameKo: '로또 번호 생성', nameEn: 'Lotto Generator', href: '/lotto-generator', color: 'yellow' },
  ladder: { icon: '🪜', nameKo: '사다리 타기', nameEn: 'Ladder Game', href: '/ladder-game', color: 'orange' },
  rentSubsidy: { icon: '🏘️', nameKo: '월세보조금 계산기', nameEn: 'Rent Subsidy Calculator', href: '/rent-subsidy-calculator', color: 'cyan' },
  bogeumjariLoan: { icon: '🏡', nameKo: '보금자리론 계산기', nameEn: 'Bogeumjari Loan', href: '/bogeumjari-loan-calculator', color: 'green' },
  shipping: { icon: '📦', nameKo: '배송비 계산기', nameEn: 'Shipping Calculator', href: '/shipping-calculator', color: 'gray' },
}

const COLOR_CLASS: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'bg-blue-100 dark:bg-blue-900/40',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-800' },
  green:   { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-700 dark:text-green-300',  border: 'border-green-200 dark:border-green-800' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  orange:  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  red:     { bg: 'bg-red-100 dark:bg-red-900/40',      text: 'text-red-700 dark:text-red-300',      border: 'border-red-200 dark:border-red-800' },
  yellow:  { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  purple:  { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  indigo:  { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  sky:     { bg: 'bg-sky-100 dark:bg-sky-900/40',      text: 'text-sky-700 dark:text-sky-300',      border: 'border-sky-200 dark:border-sky-800' },
  teal:    { bg: 'bg-teal-100 dark:bg-teal-900/40',    text: 'text-teal-700 dark:text-teal-300',    border: 'border-teal-200 dark:border-teal-800' },
  amber:   { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-800' },
  slate:   { bg: 'bg-slate-100 dark:bg-slate-900/40',  text: 'text-slate-700 dark:text-slate-300',  border: 'border-slate-200 dark:border-slate-800' },
  pink:    { bg: 'bg-pink-100 dark:bg-pink-900/40',    text: 'text-pink-700 dark:text-pink-300',    border: 'border-pink-200 dark:border-pink-800' },
  lime:    { bg: 'bg-lime-100 dark:bg-lime-900/40',    text: 'text-lime-700 dark:text-lime-300',    border: 'border-lime-200 dark:border-lime-800' },
  rose:    { bg: 'bg-rose-100 dark:bg-rose-900/40',    text: 'text-rose-700 dark:text-rose-300',    border: 'border-rose-200 dark:border-rose-800' },
  violet:  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  cyan:    { bg: 'bg-cyan-100 dark:bg-cyan-900/40',    text: 'text-cyan-700 dark:text-cyan-300',    border: 'border-cyan-200 dark:border-cyan-800' },
  gray:    { bg: 'bg-gray-100 dark:bg-gray-700',       text: 'text-gray-700 dark:text-gray-300',    border: 'border-gray-200 dark:border-gray-600' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatResultSummary(result: Record<string, unknown>): string {
  const pairs: string[] = []
  const formatValue = (v: unknown): string => {
    if (v == null) return ''
    if (typeof v === 'number') {
      if (v >= 10000) return `${Math.round(v).toLocaleString('ko-KR')}원`
      return String(v)
    }
    return String(v)
  }

  const priorityKeys = [
    'netSalary', 'monthlyPayment', 'totalInterest', 'totalAmount', 'taxAmount',
    'finalAmount', 'convertedAmount', 'totalFees', 'profit', 'profitRate',
    'calories', 'bmi', 'bodyFatPercentage', 'totalWage', 'result',
  ]

  for (const key of priorityKeys) {
    if (key in result && result[key] != null) {
      const val = formatValue(result[key])
      if (val) {
        pairs.push(val)
        if (pairs.length >= 2) break
      }
    }
  }

  if (pairs.length === 0) {
    for (const [, v] of Object.entries(result).slice(0, 2)) {
      const val = formatValue(v)
      if (val) pairs.push(val)
    }
  }

  return pairs.join(' · ')
}

type SortKey = 'date-desc' | 'date-asc' | 'tool'

// ── Main component ─────────────────────────────────────────────────────────────
export default function AllCalculationHistory() {
  const t = useTranslations('calculationHistory')

  const [histories, setHistories] = useState<CalculationHistory[]>([])
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTool, setFilterTool] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    setHistories(historyStorage.getAll())
    setMounted(true)
  }, [])

  // Delete single entry
  const handleDelete = useCallback((id: string) => {
    historyStorage.remove(id)
    setHistories(historyStorage.getAll())
    setDeletingId(null)
  }, [])

  // Delete all
  const handleClearAll = useCallback(() => {
    historyStorage.clear()
    setHistories([])
    setConfirmClearAll(false)
  }, [])

  // Unique tool types present in history
  const toolTypes = useMemo(() => {
    const types = new Set(histories.map((h) => h.type))
    return Array.from(types)
  }, [histories])

  // Filtered + sorted list
  const displayed = useMemo(() => {
    let list = [...histories]

    if (filterTool !== 'all') {
      list = list.filter((h) => h.type === filterTool)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          (TOOL_META[h.type]?.nameKo ?? '').toLowerCase().includes(q) ||
          (TOOL_META[h.type]?.nameEn ?? '').toLowerCase().includes(q)
      )
    }

    if (sort === 'date-desc') list.sort((a, b) => b.timestamp - a.timestamp)
    else if (sort === 'date-asc') list.sort((a, b) => a.timestamp - b.timestamp)
    else if (sort === 'tool') list.sort((a, b) => a.type.localeCompare(b.type))

    return list
  }, [histories, filterTool, search, sort])

  // ── SSR placeholder ──
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-7 h-7 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        {histories.length > 0 && (
          <button
            onClick={() => setConfirmClearAll(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('clearAll')}
          </button>
        )}
      </div>

      {/* Controls */}
      {histories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter by tool */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={filterTool}
                onChange={(e) => setFilterTool(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="all">{t('filterAll')}</option>
                {toolTypes.map((type) => (
                  <option key={type} value={type}>
                    {TOOL_META[type]?.icon} {TOOL_META[type]?.nameKo ?? type}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="date-desc">{t('sortNewest')}</option>
                <option value="date-asc">{t('sortOldest')}</option>
                <option value="tool">{t('sortByTool')}</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Result count */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {t('resultCount', { count: displayed.length, total: histories.length })}
          </p>
        </div>
      )}

      {/* Empty state */}
      {histories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <Clock className="w-16 h-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('emptyTitle')}
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-sm mx-auto">
            {t('emptyDescription')}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            {t('goToCalculators')}
          </Link>
        </div>
      ) : displayed.length === 0 ? (
        /* No results after filter/search */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 text-center">
          <Search className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('noResults')}</p>
          <button
            onClick={() => { setSearch(''); setFilterTool('all') }}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('resetFilters')}
          </button>
        </div>
      ) : (
        /* History list */
        <div className="space-y-3">
          {displayed.map((entry) => {
            const meta = TOOL_META[entry.type]
            const colors = COLOR_CLASS[meta?.color ?? 'gray']
            const summary = formatResultSummary(entry.result)
            const isDeletingThis = deletingId === entry.id

            return (
              <div
                key={entry.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${colors.border} overflow-hidden transition-all`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: icon + tool badge + title */}
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl leading-none mt-0.5 shrink-0">{meta?.icon ?? '📊'}</span>
                      <div className="min-w-0">
                        {/* Tool badge */}
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${colors.bg} ${colors.text}`}
                        >
                          {meta?.nameKo ?? entry.type}
                        </span>
                        {/* Title */}
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base leading-snug truncate">
                          {entry.title}
                        </h3>
                        {/* Result summary */}
                        {summary && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {summary}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: date + actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatDate(entry.timestamp)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* Go to tool */}
                        {meta?.href && (
                          <Link
                            href={meta.href}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${colors.bg} ${colors.text} hover:opacity-80`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            {t('recalculate')}
                          </Link>
                        )}
                        {/* Delete */}
                        {isDeletingThis ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-xs px-2 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors"
                            >
                              {t('confirmDelete')}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(entry.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title={t('deleteEntry')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Clear all confirmation modal */}
      {confirmClearAll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('clearAllTitle')}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {t('clearAllDescription', { count: histories.length })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClearAll(false)}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                {t('deleteAll')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
