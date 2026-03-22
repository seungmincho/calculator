'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search, Plus, Trash2, Copy, Check, BookOpen, Link,
  ChevronLeft, ChevronRight, Calendar, Download, Upload,
  UtensilsCrossed, X
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts'

// ── Food Database ────────────────────────────────────────────────────────────
interface FoodItem {
  id: string
  category: string
  cal: number
  protein: number
  fat: number
  carbs: number
}

const FOODS: FoodItem[] = [
  // 밥류
  { id: 'rice', category: 'rice', cal: 300, protein: 5, fat: 0.5, carbs: 65 },
  { id: 'bibimbap', category: 'rice', cal: 550, protein: 18, fat: 15, carbs: 78 },
  { id: 'kimchiFriedRice', category: 'rice', cal: 450, protein: 10, fat: 12, carbs: 72 },
  { id: 'kimbap', category: 'rice', cal: 380, protein: 12, fat: 8, carbs: 62 },
  { id: 'curryRice', category: 'rice', cal: 520, protein: 12, fat: 15, carbs: 80 },
  // 면류
  { id: 'ramyeon', category: 'noodle', cal: 500, protein: 10, fat: 16, carbs: 78 },
  { id: 'jajangmyeon', category: 'noodle', cal: 650, protein: 15, fat: 18, carbs: 95 },
  { id: 'naengmyeon', category: 'noodle', cal: 430, protein: 12, fat: 5, carbs: 82 },
  { id: 'udong', category: 'noodle', cal: 380, protein: 12, fat: 4, carbs: 72 },
  { id: 'japchae', category: 'noodle', cal: 350, protein: 6, fat: 10, carbs: 58 },
  // 국/찌개
  { id: 'kimchiJjigae', category: 'soup', cal: 200, protein: 12, fat: 10, carbs: 12 },
  { id: 'doenjangJjigae', category: 'soup', cal: 150, protein: 10, fat: 5, carbs: 15 },
  { id: 'sundubuJjigae', category: 'soup', cal: 180, protein: 14, fat: 8, carbs: 10 },
  { id: 'miyeokguk', category: 'soup', cal: 70, protein: 5, fat: 3, carbs: 6 },
  { id: 'samgyetang', category: 'soup', cal: 800, protein: 55, fat: 35, carbs: 60 },
  // 반찬
  { id: 'kimchi', category: 'side', cal: 15, protein: 1, fat: 0.3, carbs: 2 },
  { id: 'gyeranjjim', category: 'side', cal: 120, protein: 10, fat: 8, carbs: 2 },
  { id: 'dubuJorim', category: 'side', cal: 100, protein: 8, fat: 5, carbs: 5 },
  // 고기/구이
  { id: 'samgyeopsal', category: 'meat', cal: 520, protein: 22, fat: 45, carbs: 0 },
  { id: 'bulgogi', category: 'meat', cal: 350, protein: 28, fat: 15, carbs: 20 },
  { id: 'dakgalbi', category: 'meat', cal: 400, protein: 30, fat: 12, carbs: 35 },
  { id: 'tonkatsu', category: 'meat', cal: 450, protein: 25, fat: 22, carbs: 35 },
  // 간식
  { id: 'tteokbokki', category: 'snackFood', cal: 350, protein: 6, fat: 5, carbs: 70 },
  { id: 'friedChicken', category: 'snackFood', cal: 600, protein: 35, fat: 35, carbs: 30 },
  { id: 'hotdog', category: 'snackFood', cal: 300, protein: 8, fat: 18, carbs: 28 },
  { id: 'bungeoppang', category: 'snackFood', cal: 180, protein: 4, fat: 3, carbs: 35 },
  // 음료
  { id: 'americano', category: 'drink', cal: 5, protein: 0, fat: 0, carbs: 1 },
  { id: 'cafeLatte', category: 'drink', cal: 180, protein: 8, fat: 7, carbs: 20 },
  { id: 'cola', category: 'drink', cal: 140, protein: 0, fat: 0, carbs: 39 },
  // 패스트푸드
  { id: 'hamburger', category: 'fast', cal: 550, protein: 25, fat: 30, carbs: 45 },
  { id: 'pizza', category: 'fast', cal: 270, protein: 12, fat: 10, carbs: 33 },
  { id: 'frenchFries', category: 'fast', cal: 340, protein: 4, fat: 17, carbs: 44 },
]

const DRI = { cal: 2000, protein: 55, fat: 54, carbs: 324 }
const PORTIONS = [0.5, 1, 1.5, 2] as const
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
type MealType = typeof MEAL_TYPES[number]
const STORAGE_KEY = 'meal_diary_entries'
const MAX_DAYS = 90

// ── Data Models ──────────────────────────────────────────────────────────────
interface MealRecord {
  id: string
  foodId: string
  customName?: string
  portion: number
  cal: number
  protein: number
  fat: number
  carbs: number
  mealType: MealType
}

interface DailyEntry {
  date: string
  meals: MealRecord[]
  note?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const toDateStr = (d: Date) => d.toISOString().slice(0, 10)
const today = () => toDateStr(new Date())
let _uid = Date.now()
const uid = () => `m_${++_uid}`

function loadEntries(): DailyEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const entries: DailyEntry[] = JSON.parse(raw)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - MAX_DAYS)
    const cutoffStr = toDateStr(cutoff)
    return entries.filter(e => e.date >= cutoffStr)
  } catch {
    return []
  }
}

function saveEntries(entries: DailyEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // storage full or unavailable
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MealDiary() {
  const t = useTranslations('mealDiary')
  const fileRef = useRef<HTMLInputElement>(null)

  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [activeMeal, setActiveMeal] = useState<MealType>('breakfast')
  const [searchQuery, setSearchQuery] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualCal, setManualCal] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualFat, setManualFat] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [trendRange, setTrendRange] = useState<7 | 30>(7)
  const [showGuide, setShowGuide] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  // Load on mount
  useEffect(() => {
    setEntries(loadEntries())
  }, [])

  // Save on change
  useEffect(() => {
    if (entries.length > 0) saveEntries(entries)
  }, [entries])

  // ── Current day entry ────────────────────────────────────────────────────
  const dayEntry = useMemo(
    () => entries.find(e => e.date === selectedDate),
    [entries, selectedDate]
  )

  const mealsForTab = useMemo(
    () => (dayEntry?.meals ?? []).filter(m => m.mealType === activeMeal),
    [dayEntry, activeMeal]
  )

  const dayTotals = useMemo(() => {
    const meals = dayEntry?.meals ?? []
    return {
      cal: meals.reduce((s, m) => s + m.cal * m.portion, 0),
      protein: meals.reduce((s, m) => s + m.protein * m.portion, 0),
      fat: meals.reduce((s, m) => s + m.fat * m.portion, 0),
      carbs: meals.reduce((s, m) => s + m.carbs * m.portion, 0),
    }
  }, [dayEntry])

  // ── Filtered food search ─────────────────────────────────────────────────
  const filteredFoods = useMemo(() => {
    if (!searchQuery.trim()) return FOODS
    const q = searchQuery.toLowerCase()
    return FOODS.filter(f => t(`foods.${f.id}`).toLowerCase().includes(q))
  }, [searchQuery, t])

  // ── Date navigation ──────────────────────────────────────────────────────
  const navigateDate = useCallback((offset: number) => {
    setSelectedDate(prev => {
      const d = new Date(prev + 'T00:00:00')
      d.setDate(d.getDate() + offset)
      return toDateStr(d)
    })
  }, [])

  const goToday = useCallback(() => setSelectedDate(today()), [])

  // ── Entry helpers ────────────────────────────────────────────────────────
  const updateDay = useCallback((date: string, updater: (day: DailyEntry) => DailyEntry) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.date === date)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = updater(copy[idx])
        return copy
      }
      const newDay: DailyEntry = { date, meals: [] }
      return [...prev, updater(newDay)]
    })
  }, [])

  const addFoodToMeal = useCallback((food: FoodItem) => {
    const record: MealRecord = {
      id: uid(),
      foodId: food.id,
      portion: 1,
      cal: food.cal,
      protein: food.protein,
      fat: food.fat,
      carbs: food.carbs,
      mealType: activeMeal,
    }
    updateDay(selectedDate, day => ({ ...day, meals: [...day.meals, record] }))
  }, [activeMeal, selectedDate, updateDay])

  const addManualEntry = useCallback(() => {
    if (!manualName.trim()) return
    const record: MealRecord = {
      id: uid(),
      foodId: '',
      customName: manualName.trim(),
      portion: 1,
      cal: parseFloat(manualCal) || 0,
      protein: parseFloat(manualProtein) || 0,
      fat: parseFloat(manualFat) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      mealType: activeMeal,
    }
    updateDay(selectedDate, day => ({ ...day, meals: [...day.meals, record] }))
    setManualName('')
    setManualCal('')
    setManualProtein('')
    setManualFat('')
    setManualCarbs('')
    setShowManual(false)
  }, [manualName, manualCal, manualProtein, manualFat, manualCarbs, activeMeal, selectedDate, updateDay])

  const removeMeal = useCallback((mealId: string) => {
    updateDay(selectedDate, day => ({
      ...day,
      meals: day.meals.filter(m => m.id !== mealId),
    }))
  }, [selectedDate, updateDay])

  const updatePortion = useCallback((mealId: string, portion: number) => {
    updateDay(selectedDate, day => ({
      ...day,
      meals: day.meals.map(m => m.id === mealId ? { ...m, portion } : m),
    }))
  }, [selectedDate, updateDay])

  const updateNote = useCallback((note: string) => {
    updateDay(selectedDate, day => ({ ...day, note }))
  }, [selectedDate, updateDay])

  // ── Copy link ────────────────────────────────────────────────────────────
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch { /* ignore */ }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [])

  // ── Trend data ───────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const end = new Date()
    const data: { date: string; cal: number; protein: number; fat: number; carbs: number }[] = []
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(d.getDate() - i)
      const dateStr = toDateStr(d)
      const entry = entries.find(e => e.date === dateStr)
      const meals = entry?.meals ?? []
      data.push({
        date: dateStr.slice(5), // MM-DD
        cal: Math.round(meals.reduce((s, m) => s + m.cal * m.portion, 0)),
        protein: Math.round(meals.reduce((s, m) => s + m.protein * m.portion, 0)),
        fat: Math.round(meals.reduce((s, m) => s + m.fat * m.portion, 0)),
        carbs: Math.round(meals.reduce((s, m) => s + m.carbs * m.portion, 0)),
      })
    }
    return data
  }, [entries, trendRange])

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCsv = useCallback(() => {
    const rows = ['date,mealType,foodName,portion,cal,protein,fat,carbs']
    for (const entry of entries) {
      for (const m of entry.meals) {
        const name = m.customName || m.foodId
        rows.push(`${entry.date},${m.mealType},${name},${m.portion},${m.cal},${m.protein},${m.fat},${m.carbs}`)
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meal_diary_${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [entries])

  // ── CSV Import ────────────────────────────────────────────────────────────
  const importCsv = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const lines = text.trim().split('\n').slice(1) // skip header
        const newEntries: Map<string, MealRecord[]> = new Map()
        for (const line of lines) {
          const [date, mealType, foodName, portion, cal, protein, fat, carbs] = line.split(',')
          if (!date || !mealType) continue
          const record: MealRecord = {
            id: uid(),
            foodId: foodName,
            portion: parseFloat(portion) || 1,
            cal: parseFloat(cal) || 0,
            protein: parseFloat(protein) || 0,
            fat: parseFloat(fat) || 0,
            carbs: parseFloat(carbs) || 0,
            mealType: mealType as MealType,
          }
          const existing = newEntries.get(date) ?? []
          existing.push(record)
          newEntries.set(date, existing)
        }
        setEntries(prev => {
          const merged = [...prev]
          for (const [date, meals] of newEntries) {
            const idx = merged.findIndex(e => e.date === date)
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], meals: [...merged[idx].meals, ...meals] }
            } else {
              merged.push({ date, meals })
            }
          }
          return merged
        })
        setImportMsg(t('importSuccess'))
      } catch {
        setImportMsg(t('importError'))
      }
      setTimeout(() => setImportMsg(null), 3000)
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }, [t])

  // ── Progress bar helper ──────────────────────────────────────────────────
  const ProgressBar = useCallback(({ value, max, color, label }: { value: number; max: number; color: string; label: string }) => {
    const pct = Math.min((value / max) * 100, 100)
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{label}</span>
          <span>{Math.round(value)} / {max}{label.includes('kcal') ? '' : 'g'}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }, [])

  // ── Food name helper ─────────────────────────────────────────────────────
  const foodName = useCallback((m: MealRecord) => {
    if (m.customName) return m.customName
    return m.foodId ? t(`foods.${m.foodId}`) : '—'
  }, [t])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-green-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button onClick={copyLink} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
          {linkCopied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
          {linkCopied ? t('linkCopied') : t('copyLink')}
        </button>
      </div>

      {/* Date navigator + daily summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-lg font-semibold bg-transparent text-gray-900 dark:text-white border-none focus:ring-0 cursor-pointer"
            />
            {selectedDate !== today() && (
              <button onClick={goToday} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                {t('today')}
              </button>
            )}
          </div>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Daily totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{Math.round(dayTotals.cal)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">kcal / {DRI.cal}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('totalCalories')}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.round(dayTotals.protein)}g</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('protein')} / {DRI.protein}g</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{Math.round(dayTotals.fat)}g</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('fat')} / {DRI.fat}g</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round(dayTotals.carbs)}g</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('carbs')} / {DRI.carbs}g</div>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3">
          <ProgressBar value={dayTotals.cal} max={DRI.cal} color="bg-orange-500" label={`${t('totalCalories')} (kcal)`} />
          <ProgressBar value={dayTotals.protein} max={DRI.protein} color="bg-green-500" label={t('protein')} />
          <ProgressBar value={dayTotals.fat} max={DRI.fat} color="bg-yellow-500" label={t('fat')} />
          <ProgressBar value={dayTotals.carbs} max={DRI.carbs} color="bg-blue-500" label={t('carbs')} />
        </div>
      </div>

      {/* Meal tabs + entries */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {MEAL_TYPES.map(mt => (
            <button
              key={mt}
              onClick={() => setActiveMeal(mt)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeMeal === mt
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(mt)}
              {(() => {
                const count = (dayEntry?.meals ?? []).filter(m => m.mealType === mt).length
                return count > 0 ? ` (${count})` : ''
              })()}
            </button>
          ))}
        </div>

        {/* Food search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('searchFood')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
        </div>

        {/* Food grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto">
          {filteredFoods.map(food => (
            <button
              key={food.id}
              onClick={() => addFoodToMeal(food)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-950 border border-gray-200 dark:border-gray-700 text-sm transition-colors"
            >
              <span className="text-gray-900 dark:text-white truncate">{t(`foods.${food.id}`)}</span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                {food.cal}{t('cal')}
                <Plus className="w-3 h-3 text-green-600" />
              </span>
            </button>
          ))}
        </div>

        {/* Manual entry toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {t('addManual')}
          </button>
          {showManual && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
              <input
                type="text"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder={t('customFood')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input type="number" value={manualCal} onChange={e => setManualCal(e.target.value)} placeholder={`${t('cal')} (kcal)`} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                <input type="number" value={manualProtein} onChange={e => setManualProtein(e.target.value)} placeholder={`${t('protein')} (g)`} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                <input type="number" value={manualFat} onChange={e => setManualFat(e.target.value)} placeholder={`${t('fat')} (g)`} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                <input type="number" value={manualCarbs} onChange={e => setManualCarbs(e.target.value)} placeholder={`${t('carbs')} (g)`} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={addManualEntry} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700">
                  {t('addFood')}
                </button>
                <button onClick={() => setShowManual(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Meal entries list */}
        <div className="space-y-2">
          {mealsForTab.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('noMeals')}</p>
              <p className="text-xs mt-1">{t('addFirst')}</p>
            </div>
          ) : (
            mealsForTab.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{foodName(m)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(m.cal * m.portion)}{t('cal')} · P{Math.round(m.protein * m.portion)}g · F{Math.round(m.fat * m.portion)}g · C{Math.round(m.carbs * m.portion)}g
                  </div>
                </div>
                <select
                  value={m.portion}
                  onChange={e => updatePortion(m.id, parseFloat(e.target.value))}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
                >
                  {PORTIONS.map(p => (
                    <option key={p} value={p}>{p}x</option>
                  ))}
                </select>
                <button onClick={() => removeMeal(m.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Note */}
        <div className="mt-4">
          <textarea
            value={dayEntry?.note ?? ''}
            onChange={e => updateNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Trend charts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('trendTitle')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTrendRange(7)}
              className={`px-3 py-1 rounded-lg text-sm ${trendRange === 7 ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              {t('trend7d')}
            </button>
            <button
              onClick={() => setTrendRange(30)}
              className={`px-3 py-1 rounded-lg text-sm ${trendRange === 30 ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              {t('trend30d')}
            </button>
          </div>
        </div>

        {/* Calorie line chart */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('dailyCalories')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <ReferenceLine y={DRI.cal} stroke="#ef4444" strokeDasharray="4 4" label={{ value: t('targetLine'), fill: '#ef4444', fontSize: 11 }} />
                <Line type="monotone" dataKey="cal" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="kcal" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Macro stacked area chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('macroTrend')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} unit="g" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend />
                <Area type="monotone" dataKey="carbs" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.6} name={t('carbs')} />
                <Area type="monotone" dataKey="protein" stackId="1" fill="#10b981" stroke="#10b981" fillOpacity={0.6} name={t('protein')} />
                <Area type="monotone" dataKey="fat" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.6} name={t('fat')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CSV Import/Export + Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <button onClick={exportCsv} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm">
            <Download className="w-4 h-4" />
            {t('exportCsv')}
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm">
            <Upload className="w-4 h-4" />
            {t('importCsv')}
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={importCsv} className="hidden" />
          {importMsg && (
            <span className="text-sm text-green-600 dark:text-green-400 self-center">{importMsg}</span>
          )}
        </div>

        {/* Guide */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
        >
          <BookOpen className="w-4 h-4" />
          {t('guide.title')}
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('guide.howToUse.title')}</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guide.howToUse.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
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
