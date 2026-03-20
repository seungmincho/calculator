'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy, Check, BookOpen, ChevronDown, ChevronUp, Plus, Trash2,
  RotateCcw, FileDown, Heart, Users, PieChart as PieChartIcon,
  LayoutDashboard
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import jsPDF from 'jspdf'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface WeddingItem {
  id: string
  categoryId: string
  budget: number
  actual: number
  note: string
  included: boolean
}

interface GuestGroup {
  id: string
  name: string
  count: number
  perPerson: number
}

type SplitMode = 'item' | 'ratio' | 'amount'
type SplitSide = 'groom' | 'shared' | 'bride'
type Region = 'seoul' | 'regional'
type TabId = 'costs' | 'congratulatory' | 'split' | 'dashboard'

interface SplitConfig {
  mode: SplitMode
  ratio: number // 0-100, groom percentage
  groomAmount: number
  brideAmount: number
  itemSplits: Record<string, SplitSide>
}

interface WeddingData {
  region: Region
  items: WeddingItem[]
  guests: GuestGroup[]
  splitConfig: SplitConfig
  lastUpdated: string
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const STORAGE_KEY = 'wedding-calculator-data'

const CATEGORY_IDS = ['venue', 'sdm', 'gifts', 'yedan', 'ham', 'honeymoon', 'housing', 'others'] as const
type CategoryId = typeof CATEGORY_IDS[number]

const CATEGORY_ICONS: Record<CategoryId, string> = {
  venue: '💒', sdm: '📸', gifts: '💍', yedan: '🎁',
  ham: '📦', honeymoon: '✈️', housing: '🏠', others: '📋'
}

interface ItemDef {
  id: string
  categoryId: CategoryId
  seoulDefault: number
  regionalDefault: number
  isPerPerson?: boolean
  isGuestCount?: boolean
}

const ITEM_DEFS: ItemDef[] = [
  // venue
  { id: 'venueRental', categoryId: 'venue', seoulDefault: 300, regionalDefault: 150 },
  { id: 'mealPerPerson', categoryId: 'venue', seoulDefault: 7, regionalDefault: 5, isPerPerson: true },
  { id: 'guestCount', categoryId: 'venue', seoulDefault: 300, regionalDefault: 200, isGuestCount: true },
  { id: 'officiant', categoryId: 'venue', seoulDefault: 30, regionalDefault: 20 },
  { id: 'pyebaek', categoryId: 'venue', seoulDefault: 30, regionalDefault: 20 },
  // sdm
  { id: 'studioPhoto', categoryId: 'sdm', seoulDefault: 200, regionalDefault: 120 },
  { id: 'dressRental', categoryId: 'sdm', seoulDefault: 150, regionalDefault: 80 },
  { id: 'makeup', categoryId: 'sdm', seoulDefault: 80, regionalDefault: 50 },
  { id: 'weddingVideo', categoryId: 'sdm', seoulDefault: 100, regionalDefault: 60 },
  // gifts
  { id: 'brideGifts', categoryId: 'gifts', seoulDefault: 300, regionalDefault: 200 },
  { id: 'groomGifts', categoryId: 'gifts', seoulDefault: 200, regionalDefault: 100 },
  // yedan
  { id: 'yedanToGroom', categoryId: 'yedan', seoulDefault: 200, regionalDefault: 100 },
  { id: 'yedanToBride', categoryId: 'yedan', seoulDefault: 200, regionalDefault: 100 },
  // ham
  { id: 'hamCost', categoryId: 'ham', seoulDefault: 50, regionalDefault: 30 },
  { id: 'hamMoney', categoryId: 'ham', seoulDefault: 100, regionalDefault: 50 },
  // honeymoon
  { id: 'flights', categoryId: 'honeymoon', seoulDefault: 300, regionalDefault: 200 },
  { id: 'accommodation', categoryId: 'honeymoon', seoulDefault: 200, regionalDefault: 100 },
  { id: 'localExpenses', categoryId: 'honeymoon', seoulDefault: 150, regionalDefault: 80 },
  // housing
  { id: 'deposit', categoryId: 'housing', seoulDefault: 20000, regionalDefault: 10000 },
  { id: 'appliances', categoryId: 'housing', seoulDefault: 500, regionalDefault: 300 },
  { id: 'furniture', categoryId: 'housing', seoulDefault: 300, regionalDefault: 200 },
  { id: 'interior', categoryId: 'housing', seoulDefault: 200, regionalDefault: 100 },
  // others
  { id: 'invitations', categoryId: 'others', seoulDefault: 30, regionalDefault: 20 },
  { id: 'returnGifts', categoryId: 'others', seoulDefault: 100, regionalDefault: 50 },
  { id: 'ibaji', categoryId: 'others', seoulDefault: 50, regionalDefault: 30 },
  { id: 'contingency', categoryId: 'others', seoulDefault: 200, regionalDefault: 100 },
]

const DEFAULT_GUEST_GROUPS: GuestGroup[] = [
  { id: 'g1', name: 'colleague', count: 50, perPerson: 5 },
  { id: 'g2', name: 'friend', count: 30, perPerson: 5 },
  { id: 'g3', name: 'family', count: 20, perPerson: 10 },
  { id: 'g4', name: 'relative', count: 40, perPerson: 10 },
  { id: 'g5', name: 'parentFriend', count: 80, perPerson: 7 },
]

const DEFAULT_ITEM_SPLITS: Record<string, SplitSide> = {
  venue: 'shared', sdm: 'shared', gifts: 'shared',
  yedan: 'shared', ham: 'groom', honeymoon: 'shared',
  housing: 'shared', others: 'shared',
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#06b6d4'
]

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

function parseCommaNumber(s: string): number {
  const n = parseInt(s.replace(/,/g, ''), 10)
  return isNaN(n) ? 0 : n
}

function toCommaString(n: number): string {
  if (n === 0) return ''
  return n.toLocaleString('ko-KR')
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

function buildDefaultItems(region: Region): WeddingItem[] {
  return ITEM_DEFS.map(def => ({
    id: def.id,
    categoryId: def.categoryId,
    budget: region === 'seoul' ? def.seoulDefault : def.regionalDefault,
    actual: 0,
    note: '',
    included: true,
  }))
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function WeddingCalculator() {
  const t = useTranslations('weddingCalculator')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('costs')
  const [region, setRegion] = useState<Region>('seoul')
  const [items, setItems] = useState<WeddingItem[]>(() => buildDefaultItems('seoul'))
  const [guests, setGuests] = useState<GuestGroup[]>(DEFAULT_GUEST_GROUPS)
  const [splitConfig, setSplitConfig] = useState<SplitConfig>({
    mode: 'item',
    ratio: 50,
    groomAmount: 0,
    brideAmount: 0,
    itemSplits: { ...DEFAULT_ITEM_SPLITS },
  })
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['venue']))
  const [loaded, setLoaded] = useState(false)
  const dashboardRef = useRef<HTMLDivElement>(null)

  // ── Load from localStorage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data: WeddingData = JSON.parse(saved)
        setRegion(data.region)
        if (data.items?.length) setItems(data.items)
        if (data.guests?.length) setGuests(data.guests)
        if (data.splitConfig) setSplitConfig(data.splitConfig)
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  // ── Save to localStorage ──
  useEffect(() => {
    if (!loaded) return
    const data: WeddingData = {
      region,
      items,
      guests,
      splitConfig,
      lastUpdated: new Date().toISOString(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
  }, [region, items, guests, splitConfig, loaded])

  // ── Region change ──
  const handleRegionChange = useCallback((newRegion: Region) => {
    setRegion(newRegion)
    setItems(prev => prev.map(item => {
      const def = ITEM_DEFS.find(d => d.id === item.id)
      if (!def) return item
      return {
        ...item,
        budget: newRegion === 'seoul' ? def.seoulDefault : def.regionalDefault,
      }
    }))
  }, [])

  // ── Item updates ──
  const updateItem = useCallback((id: string, field: keyof WeddingItem, value: string | number | boolean) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }, [])

  // ── Computed values ──
  const guestCount = useMemo(() => {
    const gc = items.find(i => i.id === 'guestCount')
    return gc?.included ? gc.budget : 0
  }, [items])

  const getItemCost = useCallback((item: WeddingItem): { budget: number; actual: number } => {
    if (!item.included) return { budget: 0, actual: 0 }
    const def = ITEM_DEFS.find(d => d.id === item.id)
    if (def?.isGuestCount) return { budget: 0, actual: 0 } // guest count is not a cost
    if (def?.isPerPerson) {
      return {
        budget: item.budget * guestCount,
        actual: item.actual > 0 ? item.actual * guestCount : 0,
      }
    }
    return { budget: item.budget, actual: item.actual }
  }, [guestCount])

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { budget: number; actual: number }> = {}
    for (const catId of CATEGORY_IDS) {
      const catItems = items.filter(i => i.categoryId === catId)
      let budget = 0, actual = 0
      for (const item of catItems) {
        const cost = getItemCost(item)
        budget += cost.budget
        actual += cost.actual
      }
      totals[catId] = { budget, actual }
    }
    return totals
  }, [items, getItemCost])

  const grandTotal = useMemo(() => {
    let budget = 0, actual = 0
    for (const cat of Object.values(categoryTotals)) {
      budget += cat.budget
      actual += cat.actual
    }
    return { budget, actual }
  }, [categoryTotals])

  const totalCongratulatoryMoney = useMemo(() => {
    return guests.reduce((sum, g) => sum + g.count * g.perPerson, 0)
  }, [guests])

  const housingTotal = useMemo(() => {
    return categoryTotals['housing']?.budget || 0
  }, [categoryTotals])

  const effectiveTotalCost = useMemo(() => {
    const cost = grandTotal.actual > 0 ? grandTotal.actual : grandTotal.budget
    return cost
  }, [grandTotal])

  const netBurden = useMemo(() => effectiveTotalCost - totalCongratulatoryMoney, [effectiveTotalCost, totalCongratulatoryMoney])

  const coverageRate = useMemo(() => {
    if (effectiveTotalCost === 0) return 0
    return (totalCongratulatoryMoney / effectiveTotalCost) * 100
  }, [totalCongratulatoryMoney, effectiveTotalCost])

  const coverageRateExHousing = useMemo(() => {
    const costExHousing = effectiveTotalCost - housingTotal
    if (costExHousing <= 0) return 0
    return (totalCongratulatoryMoney / costExHousing) * 100
  }, [totalCongratulatoryMoney, effectiveTotalCost, housingTotal])

  // ── Split calculations ──
  const splitTotals = useMemo(() => {
    const { mode, ratio, groomAmount, brideAmount, itemSplits } = splitConfig
    let groom = 0, bride = 0

    if (mode === 'ratio') {
      groom = Math.round(effectiveTotalCost * ratio / 100)
      bride = effectiveTotalCost - groom
    } else if (mode === 'amount') {
      groom = groomAmount
      bride = brideAmount
    } else {
      // item mode
      for (const catId of CATEGORY_IDS) {
        const catCost = categoryTotals[catId]
        const cost = catCost.actual > 0 ? catCost.actual : catCost.budget
        const side = itemSplits[catId] || 'shared'
        if (side === 'groom') groom += cost
        else if (side === 'bride') bride += cost
        else { groom += Math.round(cost / 2); bride += cost - Math.round(cost / 2) }
      }
    }
    return { groom, bride, total: groom + bride }
  }, [splitConfig, effectiveTotalCost, categoryTotals])

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

  // ── Reset ──
  const handleReset = useCallback(() => {
    if (!window.confirm(t('actions.resetConfirm'))) return
    setItems(buildDefaultItems(region))
    setGuests([...DEFAULT_GUEST_GROUPS])
    setSplitConfig({
      mode: 'item', ratio: 50, groomAmount: 0, brideAmount: 0,
      itemSplits: { ...DEFAULT_ITEM_SPLITS },
    })
    setActiveTab('costs')
    setOpenCategories(new Set(['venue']))
    localStorage.removeItem(STORAGE_KEY)
  }, [region, t])

  // ── Build summary text ──
  const buildSummaryText = useCallback(() => {
    const lines: string[] = []
    lines.push(`=== ${t('title')} ===`)
    lines.push('')
    lines.push(`${t('region.label')}: ${region === 'seoul' ? t('region.seoul') : t('region.regional')}`)
    lines.push('')
    for (const catId of CATEGORY_IDS) {
      const cat = categoryTotals[catId]
      lines.push(`[${t(`categories.${catId}`)}]`)
      lines.push(`  ${t('fields.budget')}: ${formatNumber(cat.budget)}${t('fields.unit')}`)
      if (cat.actual > 0) lines.push(`  ${t('fields.actual')}: ${formatNumber(cat.actual)}${t('fields.unit')}`)
      lines.push('')
    }
    lines.push(`--- ${t('dashboard.totalCost')} ---`)
    lines.push(`${t('fields.budget')}: ${formatNumber(grandTotal.budget)}${t('fields.unit')}`)
    if (grandTotal.actual > 0) lines.push(`${t('fields.actual')}: ${formatNumber(grandTotal.actual)}${t('fields.unit')}`)
    lines.push(`${t('dashboard.congratulatoryMoney')}: ${formatNumber(totalCongratulatoryMoney)}${t('fields.unit')}`)
    lines.push(`${t('dashboard.netBurden')}: ${formatNumber(netBurden)}${t('fields.unit')}`)
    return lines.join('\n')
  }, [t, region, categoryTotals, grandTotal, totalCongratulatoryMoney, netBurden])

  // ── PDF export ──
  const handlePdfExport = useCallback(async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    // Use a simple text-based PDF since we don't have Korean font embedding
    doc.setFontSize(16)
    doc.text('Wedding Cost Summary', 20, 20)
    doc.setFontSize(10)

    let y = 35
    const addLine = (text: string) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(text, 20, y)
      y += 6
    }

    addLine(`Region: ${region === 'seoul' ? 'Seoul/Metro' : 'Regional'}`)
    addLine('')

    for (const catId of CATEGORY_IDS) {
      const cat = categoryTotals[catId]
      addLine(`[${catId}] Budget: ${formatNumber(cat.budget)} / Actual: ${formatNumber(cat.actual)}`)
    }
    addLine('')
    addLine(`Total Budget: ${formatNumber(grandTotal.budget)}`)
    if (grandTotal.actual > 0) addLine(`Total Actual: ${formatNumber(grandTotal.actual)}`)
    addLine(`Congratulatory Money: ${formatNumber(totalCongratulatoryMoney)}`)
    addLine(`Net Burden: ${formatNumber(netBurden)}`)
    addLine('')
    addLine(`Groom Side: ${formatNumber(splitTotals.groom)}`)
    addLine(`Bride Side: ${formatNumber(splitTotals.bride)}`)

    doc.save('wedding-cost-plan.pdf')
  }, [region, categoryTotals, grandTotal, totalCongratulatoryMoney, netBurden, splitTotals])

  // ── Toggle accordion ──
  const toggleCategory = useCallback((catId: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  // ── Guest group management ──
  const addGuestGroup = useCallback(() => {
    setGuests(prev => [...prev, { id: generateId(), name: 'friend', count: 10, perPerson: 5 }])
  }, [])

  const removeGuestGroup = useCallback((id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id))
  }, [])

  const updateGuest = useCallback((id: string, field: keyof GuestGroup, value: string | number) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
  }, [])

  // ── Tabs ──
  const TABS: { id: TabId; icon: React.ReactNode }[] = [
    { id: 'costs', icon: <Heart size={16} /> },
    { id: 'congratulatory', icon: <Users size={16} /> },
    { id: 'split', icon: <PieChartIcon size={16} /> },
    { id: 'dashboard', icon: <LayoutDashboard size={16} /> },
  ]

  // ── Comma input handler ──
  const CommaInput = useCallback(({ value, onChange, placeholder, className, disabled }: {
    value: number
    onChange: (v: number) => void
    placeholder?: string
    className?: string
    disabled?: boolean
  }) => {
    const [raw, setRaw] = useState(value > 0 ? toCommaString(value) : '')

    useEffect(() => {
      setRaw(value > 0 ? toCommaString(value) : '')
    }, [value])

    return (
      <input
        type="text"
        inputMode="numeric"
        value={raw}
        disabled={disabled}
        placeholder={placeholder || '0'}
        className={className || 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '')
          const num = parseInt(digits, 10) || 0
          setRaw(num > 0 ? formatNumber(num) : '')
          onChange(Math.min(num, 999999))
        }}
      />
    )
  }, [])

  // ── Donut chart data ──
  const donutData = useMemo(() => {
    return CATEGORY_IDS.map(catId => {
      const cat = categoryTotals[catId]
      const cost = cat.actual > 0 ? cat.actual : cat.budget
      return { name: t(`categories.${catId}`), value: cost }
    }).filter(d => d.value > 0)
  }, [categoryTotals, t])

  // ── Bar chart data for budget vs actual ──
  const barChartData = useMemo(() => {
    return CATEGORY_IDS.map(catId => {
      const cat = categoryTotals[catId]
      return {
        name: t(`categories.${catId}`),
        budget: cat.budget,
        actual: cat.actual > 0 ? cat.actual : 0,
      }
    }).filter(d => d.budget > 0 || d.actual > 0)
  }, [categoryTotals, t])

  // ── Guest group name options ──
  const guestGroupNames = ['colleague', 'friend', 'family', 'relative', 'parentFriend'] as const

  if (!loaded) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          <RotateCcw size={14} />
          {t('actions.reset')}
        </button>
      </div>

      {/* Region toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('region.label')}:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => handleRegionChange('seoul')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                region === 'seoul'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {t('region.seoul')}
            </button>
            <button
              onClick={() => handleRegionChange('regional')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                region === 'regional'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {t('region.regional')}
            </button>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {t(`tabs.${tab.id}`)}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* Tab 1: Cost Entry */}
          {activeTab === 'costs' && (
            <div className="space-y-3">
              {CATEGORY_IDS.map(catId => {
                const catItems = items.filter(i => i.categoryId === catId)
                const isOpen = openCategories.has(catId)
                const catTotal = categoryTotals[catId]

                return (
                  <div key={catId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(catId)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-expanded={isOpen}
                      aria-controls={`cat-${catId}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{CATEGORY_ICONS[catId]}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{t(`categories.${catId}`)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatNumber(catTotal.budget)}{t('fields.unit')}
                          {catTotal.actual > 0 && (
                            <span className={catTotal.actual > catTotal.budget ? 'text-red-500 ml-2' : 'text-green-500 ml-2'}>
                              ({catTotal.actual > catTotal.budget ? '+' : ''}{formatNumber(catTotal.actual - catTotal.budget)})
                            </span>
                          )}
                        </span>
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div id={`cat-${catId}`} className="p-4 space-y-2">
                        {/* Header row */}
                        <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                          <div className="col-span-1"></div>
                          <div className="col-span-3">{t('fields.include')}</div>
                          <div className="col-span-2 text-right">{t('fields.budget')}</div>
                          <div className="col-span-2 text-right">{t('fields.actual')}</div>
                          <div className="col-span-2 text-right">{t('fields.difference')}</div>
                          <div className="col-span-2">{t('fields.memo')}</div>
                        </div>

                        {catItems.map(item => {
                          const def = ITEM_DEFS.find(d => d.id === item.id)!
                          const cost = getItemCost(item)
                          const diff = cost.actual > 0 ? cost.actual - cost.budget : 0

                          if (def.isGuestCount) {
                            return (
                              <div key={item.id} className="flex flex-wrap items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                <input
                                  type="checkbox"
                                  checked={item.included}
                                  onChange={(e) => updateItem(item.id, 'included', e.target.checked)}
                                  className="accent-blue-600 w-4 h-4"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[100px]">
                                  {t(`items.${item.id}`)}
                                </span>
                                <div className="flex items-center gap-1">
                                  <CommaInput
                                    value={item.budget}
                                    onChange={(v) => updateItem(item.id, 'budget', v)}
                                    className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <span className="text-xs text-gray-400">{t('guestUnit')}</span>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div key={item.id} className="sm:grid sm:grid-cols-12 gap-2 items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                              <div className="col-span-1 flex items-center">
                                <input
                                  type="checkbox"
                                  checked={item.included}
                                  onChange={(e) => updateItem(item.id, 'included', e.target.checked)}
                                  className="accent-blue-600 w-4 h-4"
                                />
                              </div>
                              <div className="col-span-3 text-sm text-gray-700 dark:text-gray-300">
                                {t(`items.${item.id}`)}
                                {def.isPerPerson && (
                                  <span className="text-xs text-gray-400 ml-1">x{guestCount}</span>
                                )}
                              </div>
                              <div className="col-span-2 flex items-center gap-1 mt-1 sm:mt-0">
                                <CommaInput
                                  value={item.budget}
                                  onChange={(v) => updateItem(item.id, 'budget', v)}
                                  disabled={!item.included}
                                />
                              </div>
                              <div className="col-span-2 flex items-center gap-1 mt-1 sm:mt-0">
                                <CommaInput
                                  value={item.actual}
                                  onChange={(v) => updateItem(item.id, 'actual', v)}
                                  disabled={!item.included}
                                />
                              </div>
                              <div className="col-span-2 text-right mt-1 sm:mt-0">
                                {cost.actual > 0 && (
                                  <span className={`text-sm font-medium ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                                    {diff > 0 ? '+' : ''}{formatNumber(diff)}
                                  </span>
                                )}
                              </div>
                              <div className="col-span-2 hidden sm:block mt-1 sm:mt-0">
                                <input
                                  type="text"
                                  value={item.note}
                                  onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                                  placeholder={t('fields.memo')}
                                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  disabled={!item.included}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Running total sticky bar */}
              <div className="sticky bottom-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg" aria-live="polite">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-xs opacity-80">{t('fields.budget')}</div>
                      <div className="text-lg font-bold">{formatNumber(grandTotal.budget)}<span className="text-sm font-normal ml-0.5">{t('fields.unit')}</span></div>
                    </div>
                    {grandTotal.actual > 0 && (
                      <div>
                        <div className="text-xs opacity-80">{t('fields.actual')}</div>
                        <div className="text-lg font-bold">{formatNumber(grandTotal.actual)}<span className="text-sm font-normal ml-0.5">{t('fields.unit')}</span></div>
                      </div>
                    )}
                  </div>
                  {grandTotal.actual > 0 && (
                    <div className="text-right">
                      <div className="text-xs opacity-80">{t('fields.difference')}</div>
                      <div className={`text-lg font-bold ${grandTotal.actual > grandTotal.budget ? '' : ''}`}>
                        {grandTotal.actual <= grandTotal.budget ? '▼ ' : '▲ '}
                        {formatNumber(Math.abs(grandTotal.actual - grandTotal.budget))}{t('fields.unit')}
                        <span className="text-sm font-normal ml-1">
                          {grandTotal.actual <= grandTotal.budget ? t('dashboard.underBudget') : t('dashboard.overBudget')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Congratulatory Money */}
          {activeTab === 'congratulatory' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('congratulatory.guestGroup')}</h3>
                  <button
                    onClick={addGuestGroup}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    <Plus size={14} />
                    {t('congratulatory.addGroup')}
                  </button>
                </div>

                {/* Header */}
                <div className="hidden sm:grid grid-cols-12 gap-3 text-xs text-gray-500 dark:text-gray-400 px-1">
                  <div className="col-span-3">{t('congratulatory.groupName')}</div>
                  <div className="col-span-2 text-right">{t('congratulatory.personCount')}</div>
                  <div className="col-span-3 text-right">{t('congratulatory.perPerson')}</div>
                  <div className="col-span-3 text-right">{t('congratulatory.subtotal')}</div>
                  <div className="col-span-1"></div>
                </div>

                {guests.map(guest => (
                  <div key={guest.id} className="sm:grid sm:grid-cols-12 gap-3 items-center py-3 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="col-span-3 mb-2 sm:mb-0">
                      <select
                        value={guest.name}
                        onChange={(e) => updateGuest(guest.id, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
                      >
                        {guestGroupNames.map(n => (
                          <option key={n} value={n}>{t(`congratulatory.groups.${n}`)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 mb-2 sm:mb-0">
                      <div className="flex items-center gap-1">
                        <CommaInput
                          value={guest.count}
                          onChange={(v) => updateGuest(guest.id, 'count', v)}
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">{t('guestUnit')}</span>
                      </div>
                    </div>
                    <div className="col-span-3 mb-2 sm:mb-0">
                      <div className="flex items-center gap-1">
                        <CommaInput
                          value={guest.perPerson}
                          onChange={(v) => updateGuest(guest.id, 'perPerson', v)}
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">{t('fields.unit')}</span>
                      </div>
                    </div>
                    <div className="col-span-3 text-right text-sm font-medium text-gray-900 dark:text-white mb-2 sm:mb-0">
                      {formatNumber(guest.count * guest.perPerson)}{t('fields.unit')}
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => removeGuestGroup(guest.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove group"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('congratulatory.total')}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('congratulatory.total')}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatNumber(totalCongratulatoryMoney)}<span className="text-base font-normal ml-0.5">{t('fields.unit')}</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('congratulatory.coverageRate')}</div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {coverageRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('congratulatory.netBurden')}</div>
                    <div className={`text-2xl font-bold ${netBurden > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatNumber(netBurden)}<span className="text-base font-normal ml-0.5">{t('fields.unit')}</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('congratulatory.excludingHousing')}</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {coverageRateExHousing.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 mt-4">
                  {guests.map(guest => (
                    <div key={guest.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {t(`congratulatory.groups.${guest.name}`)} {guest.count}{t('guestUnit')} x {guest.perPerson}{t('fields.unit')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        = {formatNumber(guest.count * guest.perPerson)}{t('fields.unit')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Family Split */}
          {activeTab === 'split' && (
            <div className="space-y-6">
              {/* Mode selection */}
              <div className="flex gap-2">
                {(['item', 'ratio', 'amount'] as SplitMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSplitConfig(prev => ({ ...prev, mode }))}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      splitConfig.mode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`split.by${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                  </button>
                ))}
              </div>

              {/* Item mode */}
              {splitConfig.mode === 'item' && (
                <div className="space-y-3">
                  {CATEGORY_IDS.map(catId => {
                    const cat = categoryTotals[catId]
                    const cost = cat.actual > 0 ? cat.actual : cat.budget
                    if (cost === 0) return null
                    const side = splitConfig.itemSplits[catId] || 'shared'

                    return (
                      <div key={catId} className="flex flex-wrap items-center justify-between gap-2 py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[catId]}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{t(`categories.${catId}`)}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">({formatNumber(cost)}{t('fields.unit')})</span>
                        </div>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                          {(['groom', 'shared', 'bride'] as SplitSide[]).map(s => (
                            <button
                              key={s}
                              onClick={() => setSplitConfig(prev => ({
                                ...prev,
                                itemSplits: { ...prev.itemSplits, [catId]: s }
                              }))}
                              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                side === s
                                  ? s === 'groom' ? 'bg-blue-600 text-white'
                                    : s === 'bride' ? 'bg-pink-600 text-white'
                                    : 'bg-purple-600 text-white'
                                  : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {t(`split.${s === 'groom' ? 'groomSide' : s === 'bride' ? 'brideSide' : 'shared'}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Ratio mode */}
              {splitConfig.mode === 'ratio' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">{t('split.groomSide')} {splitConfig.ratio}%</span>
                    <span className="text-pink-600 dark:text-pink-400 font-medium">{t('split.brideSide')} {100 - splitConfig.ratio}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={splitConfig.ratio}
                    onChange={(e) => setSplitConfig(prev => ({ ...prev, ratio: parseInt(e.target.value) }))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{formatNumber(Math.round(effectiveTotalCost * splitConfig.ratio / 100))}{t('fields.unit')}</span>
                    <span>{formatNumber(effectiveTotalCost - Math.round(effectiveTotalCost * splitConfig.ratio / 100))}{t('fields.unit')}</span>
                  </div>
                </div>
              )}

              {/* Amount mode */}
              {splitConfig.mode === 'amount' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      {t('split.groomSide')}
                    </label>
                    <div className="flex items-center gap-1">
                      <CommaInput
                        value={splitConfig.groomAmount}
                        onChange={(v) => setSplitConfig(prev => ({ ...prev, groomAmount: v }))}
                        className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">{t('fields.unit')}</span>
                    </div>
                  </div>
                  <div className="bg-pink-50 dark:bg-pink-950 rounded-xl p-4">
                    <label className="block text-sm font-medium text-pink-700 dark:text-pink-300 mb-2">
                      {t('split.brideSide')}
                    </label>
                    <div className="flex items-center gap-1">
                      <CommaInput
                        value={splitConfig.brideAmount}
                        onChange={(v) => setSplitConfig(prev => ({ ...prev, brideAmount: v }))}
                        className="w-full px-3 py-2 border border-pink-300 dark:border-pink-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right text-sm focus:ring-2 focus:ring-pink-500"
                      />
                      <span className="text-sm text-gray-500">{t('fields.unit')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Split summary */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('split.summary')}</h3>

                {/* Visual bar */}
                <div className="space-y-2">
                  <div className="flex h-8 rounded-full overflow-hidden">
                    {splitTotals.total > 0 && (
                      <>
                        <div
                          className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium transition-all"
                          style={{ width: `${Math.max((splitTotals.groom / splitTotals.total) * 100, 5)}%` }}
                        >
                          {((splitTotals.groom / splitTotals.total) * 100).toFixed(0)}%
                        </div>
                        <div
                          className="bg-pink-500 flex items-center justify-center text-xs text-white font-medium transition-all"
                          style={{ width: `${Math.max((splitTotals.bride / splitTotals.total) * 100, 5)}%` }}
                        >
                          {((splitTotals.bride / splitTotals.total) * 100).toFixed(0)}%
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {t('split.groomSide')}: {formatNumber(splitTotals.groom)}{t('fields.unit')}
                    </span>
                    <span className="text-pink-600 dark:text-pink-400 font-medium">
                      {t('split.brideSide')}: {formatNumber(splitTotals.bride)}{t('fields.unit')}
                    </span>
                  </div>
                </div>

                {/* Item breakdown for item mode */}
                {splitConfig.mode === 'item' && (
                  <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {CATEGORY_IDS.map(catId => {
                      const cat = categoryTotals[catId]
                      const cost = cat.actual > 0 ? cat.actual : cat.budget
                      if (cost === 0) return null
                      const side = splitConfig.itemSplits[catId] || 'shared'
                      const sideLabel = side === 'groom' ? t('split.groomSide')
                        : side === 'bride' ? t('split.brideSide')
                        : `${t('split.shared')} (${formatNumber(Math.round(cost / 2))}/${formatNumber(cost - Math.round(cost / 2))})`

                      return (
                        <div key={catId} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {t(`categories.${catId}`)} ({formatNumber(cost)}{t('fields.unit')})
                          </span>
                          <span className={`font-medium ${
                            side === 'groom' ? 'text-blue-600 dark:text-blue-400'
                            : side === 'bride' ? 'text-pink-600 dark:text-pink-400'
                            : 'text-purple-600 dark:text-purple-400'
                          }`}>
                            {sideLabel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Dashboard */}
          {activeTab === 'dashboard' && (
            <div ref={dashboardRef} className="space-y-6">
              {/* Summary cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <div className="text-sm opacity-80">{t('dashboard.totalCost')}</div>
                  <div className="text-2xl font-bold mt-1">{formatNumber(effectiveTotalCost)}<span className="text-base font-normal ml-0.5">{t('fields.unit')}</span></div>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white">
                  <div className="text-sm opacity-80">{t('dashboard.congratulatoryMoney')}</div>
                  <div className="text-2xl font-bold mt-1">{formatNumber(totalCongratulatoryMoney)}<span className="text-base font-normal ml-0.5">{t('fields.unit')}</span></div>
                </div>
                <div className={`bg-gradient-to-br ${netBurden > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} rounded-xl p-5 text-white`}>
                  <div className="text-sm opacity-80">{t('dashboard.netBurden')}</div>
                  <div className="text-2xl font-bold mt-1">{formatNumber(netBurden)}<span className="text-base font-normal ml-0.5">{t('fields.unit')}</span></div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Donut chart */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.categoryBreakdown')}</h3>
                  {donutData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {donutData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${formatNumber((value as number) ?? 0)}${t('fields.unit')}`, '']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400">{t('dashboard.noData')}</div>
                  )}
                </div>

                {/* Split bar */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('split.summary')}</h3>
                  <div className="space-y-6 mt-8">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{t('split.groomSide')}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatNumber(splitTotals.groom)}{t('fields.unit')}</span>
                      </div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: splitTotals.total > 0 ? `${(splitTotals.groom / splitTotals.total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-pink-600 dark:text-pink-400 font-medium">{t('split.brideSide')}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatNumber(splitTotals.bride)}{t('fields.unit')}</span>
                      </div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500 rounded-full transition-all"
                          style={{ width: splitTotals.total > 0 ? `${(splitTotals.bride / splitTotals.total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget vs Actual table */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 overflow-x-auto">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.budgetVsActual')}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th scope="col" className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.category')}</th>
                      <th scope="col" className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('fields.budget')}</th>
                      <th scope="col" className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('fields.actual')}</th>
                      <th scope="col" className="text-right py-2 pl-2 text-gray-500 dark:text-gray-400 font-medium">{t('fields.difference')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORY_IDS.map(catId => {
                      const cat = categoryTotals[catId]
                      if (cat.budget === 0 && cat.actual === 0) return null
                      const diff = cat.actual > 0 ? cat.actual - cat.budget : 0
                      return (
                        <tr key={catId} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <td className="py-2 pr-4 text-gray-900 dark:text-white">
                            <span className="mr-1">{CATEGORY_ICONS[catId]}</span>
                            {t(`categories.${catId}`)}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{formatNumber(cat.budget)}</td>
                          <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{cat.actual > 0 ? formatNumber(cat.actual) : '-'}</td>
                          <td className="py-2 pl-2 text-right">
                            {cat.actual > 0 ? (
                              <span className={diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-500'}>
                                {diff > 0 ? '+' : ''}{formatNumber(diff)} {diff <= 0 ? '\u2705' : '\u26A0\uFE0F'}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="font-bold border-t-2 border-gray-300 dark:border-gray-600">
                      <td className="py-2 pr-4 text-gray-900 dark:text-white">{t('dashboard.totalCost')}</td>
                      <td className="py-2 px-2 text-right text-gray-900 dark:text-white">{formatNumber(grandTotal.budget)}</td>
                      <td className="py-2 px-2 text-right text-gray-900 dark:text-white">{grandTotal.actual > 0 ? formatNumber(grandTotal.actual) : '-'}</td>
                      <td className="py-2 pl-2 text-right">
                        {grandTotal.actual > 0 ? (
                          <span className={grandTotal.actual > grandTotal.budget ? 'text-red-500' : 'text-green-500'}>
                            {grandTotal.actual > grandTotal.budget ? '+' : ''}{formatNumber(grandTotal.actual - grandTotal.budget)}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => copyToClipboard(buildSummaryText(), 'summary')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  {copiedId === 'summary' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  {t('actions.copyResults')}
                </button>
                <button
                  onClick={handlePdfExport}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  <FileDown size={16} />
                  {t('actions.savePdf')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen size={20} />
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('guide.averageCosts.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.averageCosts.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('guide.savingTips.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.savingTips.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
