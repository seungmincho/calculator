'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Utensils, Search, Plus, Trash2, Copy, Check, BookOpen, X } from 'lucide-react'
import dynamic from 'next/dynamic'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

// ── Food Database ────────────────────────────────────────────────────────────
interface FoodItem {
  id: string
  category: string
  cal: number      // kcal per serving
  protein: number  // g per serving
  fat: number      // g per serving
  carbs: number    // g per serving
  serving: number  // grams per serving
}

const FOODS: FoodItem[] = [
  // 밥류
  { id: 'rice', category: 'rice', cal: 300, protein: 5, fat: 0.5, carbs: 65, serving: 210 },
  { id: 'bibimbap', category: 'rice', cal: 550, protein: 18, fat: 15, carbs: 78, serving: 400 },
  { id: 'kimchiFriedRice', category: 'rice', cal: 450, protein: 10, fat: 12, carbs: 72, serving: 350 },
  { id: 'kimbap', category: 'rice', cal: 380, protein: 12, fat: 8, carbs: 62, serving: 250 },
  { id: 'curryRice', category: 'rice', cal: 520, protein: 12, fat: 15, carbs: 80, serving: 400 },
  // 면류
  { id: 'ramyeon', category: 'noodle', cal: 500, protein: 10, fat: 16, carbs: 78, serving: 550 },
  { id: 'jajangmyeon', category: 'noodle', cal: 650, protein: 15, fat: 18, carbs: 95, serving: 500 },
  { id: 'naengmyeon', category: 'noodle', cal: 430, protein: 12, fat: 5, carbs: 82, serving: 500 },
  { id: 'udong', category: 'noodle', cal: 380, protein: 12, fat: 4, carbs: 72, serving: 450 },
  { id: 'japchae', category: 'noodle', cal: 350, protein: 6, fat: 10, carbs: 58, serving: 250 },
  // 국/찌개
  { id: 'kimchiJjigae', category: 'soup', cal: 200, protein: 12, fat: 10, carbs: 12, serving: 300 },
  { id: 'doenjangJjigae', category: 'soup', cal: 150, protein: 10, fat: 5, carbs: 15, serving: 300 },
  { id: 'sundubuJjigae', category: 'soup', cal: 180, protein: 14, fat: 8, carbs: 10, serving: 350 },
  { id: 'miyeokguk', category: 'soup', cal: 70, protein: 5, fat: 3, carbs: 6, serving: 300 },
  { id: 'samgyetang', category: 'soup', cal: 800, protein: 55, fat: 35, carbs: 60, serving: 800 },
  // 반찬
  { id: 'kimchi', category: 'side', cal: 15, protein: 1, fat: 0.3, carbs: 2, serving: 40 },
  { id: 'gyeranjjim', category: 'side', cal: 120, protein: 10, fat: 8, carbs: 2, serving: 150 },
  { id: 'japchae2', category: 'side', cal: 180, protein: 4, fat: 6, carbs: 28, serving: 120 },
  { id: 'dubuJorim', category: 'side', cal: 100, protein: 8, fat: 5, carbs: 5, serving: 120 },
  // 고기/구이
  { id: 'samgyeopsal', category: 'meat', cal: 520, protein: 22, fat: 45, carbs: 0, serving: 150 },
  { id: 'bulgogi', category: 'meat', cal: 350, protein: 28, fat: 15, carbs: 20, serving: 200 },
  { id: 'dakgalbi', category: 'meat', cal: 400, protein: 30, fat: 12, carbs: 35, serving: 300 },
  { id: 'tonkatsu', category: 'meat', cal: 450, protein: 25, fat: 22, carbs: 35, serving: 200 },
  // 간식
  { id: 'tteokbokki', category: 'snack', cal: 350, protein: 6, fat: 5, carbs: 70, serving: 250 },
  { id: 'friedChicken', category: 'snack', cal: 600, protein: 35, fat: 35, carbs: 30, serving: 250 },
  { id: 'hotdog', category: 'snack', cal: 300, protein: 8, fat: 18, carbs: 28, serving: 120 },
  { id: 'bungeoppang', category: 'snack', cal: 180, protein: 4, fat: 3, carbs: 35, serving: 100 },
  // 음료
  { id: 'americano', category: 'drink', cal: 5, protein: 0, fat: 0, carbs: 1, serving: 355 },
  { id: 'cafeLatte', category: 'drink', cal: 180, protein: 8, fat: 7, carbs: 20, serving: 355 },
  { id: 'cola', category: 'drink', cal: 140, protein: 0, fat: 0, carbs: 39, serving: 355 },
  { id: 'soju', category: 'drink', cal: 340, protein: 0, fat: 0, carbs: 0, serving: 360 },
  { id: 'beer', category: 'drink', cal: 150, protein: 1, fat: 0, carbs: 13, serving: 355 },
  // 패스트푸드
  { id: 'hamburger', category: 'fast', cal: 550, protein: 25, fat: 30, carbs: 45, serving: 200 },
  { id: 'pizza', category: 'fast', cal: 270, protein: 12, fat: 10, carbs: 33, serving: 107 },
  { id: 'frenchFries', category: 'fast', cal: 340, protein: 4, fat: 17, carbs: 44, serving: 117 },
  { id: 'gimbapRoll', category: 'fast', cal: 200, protein: 5, fat: 4, carbs: 35, serving: 150 },
]

const CATEGORIES = ['all', 'rice', 'noodle', 'soup', 'side', 'meat', 'snack', 'drink', 'fast'] as const

// Daily Recommended Intake (성인 기준)
const DRI = { cal: 2000, protein: 55, fat: 54, carbs: 324 }

// Portion options
const PORTIONS = [0.5, 1, 1.5, 2, 3] as const

interface MealEntry {
  uid: number
  food: FoodItem
  portion: number
}

let nextUid = 1

const formatNumber = (n: number) => Math.round(n).toLocaleString('ko-KR')

// ── Component ─────────────────────────────────────────────────────────────────
export default function NutritionCalculator() {
  const t = useTranslations('nutritionCalculator')

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mealEntries, setMealEntries] = useState<MealEntry[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  // ── Filtered food list ───────────────────────────────────────────────────
  const filteredFoods = useMemo(() => {
    return FOODS.filter(food => {
      const matchCategory = selectedCategory === 'all' || food.category === selectedCategory
      const matchSearch = searchQuery === '' ||
        t(`foods.${food.id}`).toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [selectedCategory, searchQuery, t])

  // ── Meal totals ──────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (mealEntries.length === 0) return null
    const cal = mealEntries.reduce((s, e) => s + e.food.cal * e.portion, 0)
    const protein = mealEntries.reduce((s, e) => s + e.food.protein * e.portion, 0)
    const fat = mealEntries.reduce((s, e) => s + e.food.fat * e.portion, 0)
    const carbs = mealEntries.reduce((s, e) => s + e.food.carbs * e.portion, 0)
    return { cal, protein, fat, carbs }
  }, [mealEntries])

  // ── ECharts options ──────────────────────────────────────────────────────
  const donutOption = useMemo(() => {
    if (!totals) return null
    const carbsCal = totals.carbs * 4
    const proteinCal = totals.protein * 4
    const fatCal = totals.fat * 9
    const total = carbsCal + proteinCal + fatCal || 1
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} kcal ({d}%)' },
      legend: { bottom: 0, textStyle: { color: '#6b7280' } },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: [
          { value: Math.round(carbsCal), name: t('macros.carbs'), itemStyle: { color: '#3b82f6' } },
          { value: Math.round(proteinCal), name: t('macros.protein'), itemStyle: { color: '#10b981' } },
          { value: Math.round(fatCal), name: t('macros.fat'), itemStyle: { color: '#f59e0b' } },
        ],
      }],
    }
  }, [totals, t])

  const barOption = useMemo(() => {
    if (!totals) return null
    const pctCal = Math.min((totals.cal / DRI.cal) * 100, 200)
    const pctProtein = Math.min((totals.protein / DRI.protein) * 100, 200)
    const pctFat = Math.min((totals.fat / DRI.fat) * 100, 200)
    const pctCarbs = Math.min((totals.carbs / DRI.carbs) * 100, 200)
    return {
      tooltip: { trigger: 'axis', formatter: (params: { name: string; value: number }[]) => `${params[0].name}: ${params[0].value.toFixed(1)}%` },
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: [t('macros.calories'), t('macros.carbs'), t('macros.protein'), t('macros.fat')],
        axisLabel: { color: '#6b7280', fontSize: 11 },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
      },
      yAxis: {
        type: 'value',
        max: 200,
        axisLabel: { formatter: '{value}%', color: '#6b7280', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [{
        type: 'bar',
        barMaxWidth: 60,
        data: [
          { value: parseFloat(pctCal.toFixed(1)), itemStyle: { color: pctCal > 100 ? '#ef4444' : '#f97316' } },
          { value: parseFloat(pctCarbs.toFixed(1)), itemStyle: { color: pctCarbs > 100 ? '#ef4444' : '#3b82f6' } },
          { value: parseFloat(pctProtein.toFixed(1)), itemStyle: { color: pctProtein > 100 ? '#ef4444' : '#10b981' } },
          { value: parseFloat(pctFat.toFixed(1)), itemStyle: { color: pctFat > 100 ? '#ef4444' : '#f59e0b' } },
        ],
        label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11, color: '#374151' },
        markLine: {
          silent: true,
          lineStyle: { color: '#ef4444', type: 'dashed' },
          data: [{ yAxis: 100, label: { formatter: '100%', color: '#ef4444' } }],
        },
      }],
    }
  }, [totals, t])

  // ── Actions ──────────────────────────────────────────────────────────────
  const addFood = useCallback((food: FoodItem) => {
    setMealEntries(prev => [...prev, { uid: nextUid++, food, portion: 1 }])
  }, [])

  const removeEntry = useCallback((uid: number) => {
    setMealEntries(prev => prev.filter(e => e.uid !== uid))
  }, [])

  const updatePortion = useCallback((uid: number, portion: number) => {
    setMealEntries(prev => prev.map(e => e.uid === uid ? { ...e, portion } : e))
  }, [])

  const clearMeal = useCallback(() => {
    setMealEntries([])
  }, [])

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

  const buildSummary = useCallback(() => {
    if (!totals) return ''
    const lines = [`[${t('title')}]`, '']
    mealEntries.forEach(e => {
      lines.push(`${t(`foods.${e.food.id}`)} x${e.portion} - ${formatNumber(e.food.cal * e.portion)} kcal`)
    })
    lines.push('')
    lines.push(`${t('summary.totalCal')}: ${formatNumber(totals.cal)} kcal`)
    lines.push(`${t('macros.carbs')}: ${formatNumber(totals.carbs)} g`)
    lines.push(`${t('macros.protein')}: ${formatNumber(totals.protein)} g`)
    lines.push(`${t('macros.fat')}: ${formatNumber(totals.fat)} g`)
    return lines.join('\n')
  }, [totals, mealEntries, t])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Utensils className="w-6 h-6 text-green-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 카테고리 필터 + 검색 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={t('clearSearch')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 음식 목록 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 음식 그리드 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('foodDatabase')} <span className="text-sm font-normal text-gray-400">({filteredFoods.length})</span>
            </h2>
            {filteredFoods.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                {t('noResults')}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {filteredFoods.map(food => (
                  <div
                    key={food.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group"
                    onClick={() => addFood(food)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && addFood(food)}
                    aria-label={`${t(`foods.${food.id}`)} ${food.cal}kcal ${t('addToMeal')}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {t(`foods.${food.id}`)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {food.serving}g {t('perServing')}
                        </p>
                      </div>
                      <button
                        className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                        {food.cal}
                      </span>
                      <span className="text-xs text-gray-400">kcal</span>
                      <div className="flex gap-2 ml-auto text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-blue-500">C {food.carbs}g</span>
                        <span className="text-green-500">P {food.protein}g</span>
                        <span className="text-amber-500">F {food.fat}g</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 차트 */}
          {totals && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('chart.macroRatio')}</h3>
                {donutOption && (
                  <ReactECharts option={donutOption} style={{ height: 220 }} />
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('chart.dailyPct')}</h3>
                {barOption && (
                  <ReactECharts option={barOption} style={{ height: 220 }} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 식단 패널 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 식단 목록 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('mealList')} <span className="text-sm font-normal text-gray-400">({mealEntries.length})</span>
              </h2>
              {mealEntries.length > 0 && (
                <button
                  onClick={clearMeal}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  {t('clearAll')}
                </button>
              )}
            </div>

            {mealEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>{t('mealEmpty')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mealEntries.map(entry => (
                  <div
                    key={entry.uid}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {t(`foods.${entry.food.id}`)}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                          {formatNumber(entry.food.cal * entry.portion)} kcal
                        </p>
                      </div>
                      <button
                        onClick={() => removeEntry(entry.uid)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        aria-label={t('removeItem')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('portion')}</label>
                      <div className="flex gap-1 flex-wrap">
                        {PORTIONS.map(p => (
                          <button
                            key={p}
                            onClick={() => updatePortion(entry.uid, p)}
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${
                              entry.portion === p
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {p}x
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="text-blue-500">C {formatNumber(entry.food.carbs * entry.portion)}g</span>
                      <span className="text-green-500">P {formatNumber(entry.food.protein * entry.portion)}g</span>
                      <span className="text-amber-500">F {formatNumber(entry.food.fat * entry.portion)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 합계 요약 */}
          {totals && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('summary.title')}</h2>
                <button
                  onClick={() => copyToClipboard(buildSummary(), 'summary')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  {copiedId === 'summary' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'summary' ? t('copied') : t('copy')}
                </button>
              </div>

              {/* 총 칼로리 */}
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3 text-center mb-3">
                <p className="text-xs text-orange-600 dark:text-orange-400">{t('summary.totalCal')}</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-400">{formatNumber(totals.cal)}</p>
                <p className="text-xs text-orange-500">kcal</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('summary.driPct', { pct: ((totals.cal / DRI.cal) * 100).toFixed(0) })}
                </p>
              </div>

              {/* 3대 영양소 */}
              <div className="space-y-2">
                {[
                  { label: t('macros.carbs'), value: totals.carbs, dri: DRI.carbs, unit: 'g', color: 'blue' },
                  { label: t('macros.protein'), value: totals.protein, dri: DRI.protein, unit: 'g', color: 'green' },
                  { label: t('macros.fat'), value: totals.fat, dri: DRI.fat, unit: 'g', color: 'amber' },
                ].map(({ label, value, dri, unit, color }) => {
                  const pct = Math.min((value / dri) * 100, 100)
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{label}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(value)}{unit} <span className="text-gray-400 font-normal">/ {dri}{unit}</span>
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all bg-${color}-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* DRI 기준 안내 */}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t('summary.driNote')}</p>
            </div>
          )}
        </div>
      </div>

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
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.howToUse.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.howToUse.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.macros.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.macros.items') as string[]).map((item, i) => (
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
          </div>
        )}
      </div>
    </div>
  )
}
