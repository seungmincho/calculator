'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Home,
  FileText,
  User,
  Building,
  Phone,
  ChevronDown,
  ChevronUp,
  Share2,
  Printer,
  RotateCcw,
  MinusCircle,
} from 'lucide-react'
import GuideSection from '@/components/GuideSection'

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckState = 'checked' | 'unchecked' | 'na'
type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger'

interface CheckItem {
  key: string
  weight: number
}

interface Category {
  key: string
  icon: React.ReactNode
  items: CheckItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    key: 'registry',
    icon: <FileText className="w-5 h-5" />,
    items: [
      { key: 'ownerMatch', weight: 10 },
      { key: 'noMortgage', weight: 10 },
      { key: 'noAuction', weight: 9 },
    ],
  },
  {
    key: 'landlord',
    icon: <User className="w-5 h-5" />,
    items: [
      { key: 'taxPaid', weight: 8 },
      { key: 'landlordCredit', weight: 7 },
      { key: 'multiProperty', weight: 7 },
    ],
  },
  {
    key: 'property',
    icon: <Home className="w-5 h-5" />,
    items: [
      { key: 'actualVisit', weight: 8 },
      { key: 'buildingCondition', weight: 6 },
      { key: 'neighborhoodCheck', weight: 7 },
    ],
  },
  {
    key: 'contract',
    icon: <Building className="w-5 h-5" />,
    items: [
      { key: 'gapRatio', weight: 10 },
      { key: 'specialConditions', weight: 7 },
      { key: 'moveInDate', weight: 8 },
      { key: 'realEstateAgent', weight: 7 },
    ],
  },
  {
    key: 'insurance',
    icon: <Shield className="w-5 h-5" />,
    items: [
      { key: 'depositInsurance', weight: 10 },
      { key: 'moveInReport', weight: 9 },
      { key: 'priorityDeposit', weight: 8 },
    ],
  },
]

const TOTAL_WEIGHT = CATEGORIES.flatMap((c) => c.items).reduce((s, i) => s + i.weight, 0) // 131

const CONTACTS = [
  { key: 'hug', phone: '1566-9009' },
  { key: 'lh', phone: '1600-1004' },
  { key: 'police', phone: '112' },
  { key: 'legalAid', phone: '132' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'safe'
  if (score >= 70) return 'caution'
  if (score >= 50) return 'warning'
  return 'danger'
}

function encodeStates(states: Record<string, CheckState>): string {
  return Object.entries(states)
    .map(([k, v]) => `${k}:${v[0]}`)
    .join(',')
}

function decodeStates(str: string): Record<string, CheckState> {
  const map: Record<string, CheckState> = {}
  str.split(',').forEach((pair) => {
    const [k, v] = pair.split(':')
    if (k && v) {
      if (v === 'c') map[k] = 'checked'
      else if (v === 'n') map[k] = 'na'
      else map[k] = 'unchecked'
    }
  })
  return map
}

function formatNumber(value: string): string {
  const digits = value.replace(/[^0-9]/g, '')
  return digits ? Number(digits).toLocaleString() : ''
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ScoreGaugeProps {
  score: number
  level: RiskLevel
  checkedCount: number
  totalCount: number
  t: ReturnType<typeof useTranslations>
}

function ScoreGauge({ score, level, checkedCount, totalCount, t }: ScoreGaugeProps) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const colorMap: Record<RiskLevel, string> = {
    safe: '#22c55e',
    caution: '#eab308',
    warning: '#f97316',
    danger: '#ef4444',
  }

  const bgMap: Record<RiskLevel, string> = {
    safe: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    caution: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={colorMap[level]}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round(score)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">/ 100</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${bgMap[level]}`}>
          {t(`riskLevels.${level}`)}
        </span>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          {t(`risk${level.charAt(0).toUpperCase() + level.slice(1)}Desc`)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('checkedCount', { checked: checkedCount, total: totalCount })}
        </p>
      </div>
    </div>
  )
}

interface CheckItemRowProps {
  itemKey: string
  weight: number
  state: CheckState
  onChange: (key: string, state: CheckState) => void
  t: ReturnType<typeof useTranslations>
}

function CheckItemRow({ itemKey, weight, state, onChange, t }: CheckItemRowProps) {
  const [expanded, setExpanded] = useState(false)

  const dots = Array.from({ length: 10 }, (_, i) => i < weight)

  const stateStyle: Record<CheckState, string> = {
    checked: 'border-green-500 bg-green-50 dark:bg-green-950',
    unchecked: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
    na: 'border-gray-400 bg-gray-50 dark:bg-gray-700',
  }

  const cycle = useCallback(() => {
    const next: Record<CheckState, CheckState> = {
      unchecked: 'checked',
      checked: 'na',
      na: 'unchecked',
    }
    onChange(itemKey, next[state])
  }, [state, itemKey, onChange])

  return (
    <div className={`border rounded-lg p-3 transition-colors ${stateStyle[state]}`}>
      <div className="flex items-start gap-3">
        {/* State toggle button */}
        <button
          onClick={cycle}
          className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label={t('toggleAriaLabel')}
        >
          {state === 'checked' && <CheckCircle className="w-6 h-6 text-green-500" />}
          {state === 'unchecked' && <XCircle className="w-6 h-6 text-gray-400" />}
          {state === 'na' && <MinusCircle className="w-6 h-6 text-gray-400" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-sm font-medium text-gray-900 dark:text-white text-left hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
            >
              {t(`items.${itemKey}`)}
              {expanded ? (
                <ChevronUp className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              )}
            </button>
            {/* Weight dots */}
            <div className="flex gap-0.5 flex-shrink-0" aria-label={`${t('weightLabel')} ${weight}`}>
              {dots.map((filled, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${filled ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                />
              ))}
            </div>
          </div>

          {expanded && (
            <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {t(`items.${itemKey}Desc`)}
            </p>
          )}
        </div>

        {/* 3-state label */}
        <div className="flex-shrink-0 flex gap-1">
          {(['checked', 'na', 'unchecked'] as CheckState[]).map((s) => (
            <button
              key={s}
              onClick={() => onChange(itemKey, s)}
              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                state === s
                  ? s === 'checked'
                    ? 'bg-green-500 text-white'
                    : s === 'na'
                    ? 'bg-gray-400 text-white'
                    : 'bg-red-400 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s === 'checked' ? t('stateChecked') : s === 'na' ? t('stateNa') : t('stateUnchecked')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface CategorySectionProps {
  category: Category
  states: Record<string, CheckState>
  onChange: (key: string, state: CheckState) => void
  t: ReturnType<typeof useTranslations>
}

function CategorySection({ category, states, onChange, t }: CategorySectionProps) {
  const [open, setOpen] = useState(true)

  const checkedInCat = category.items.filter(
    (i) => states[i.key] === 'checked' || states[i.key] === 'na'
  ).length

  const catBg: Record<string, string> = {
    registry: 'border-l-blue-500',
    landlord: 'border-l-purple-500',
    property: 'border-l-green-500',
    contract: 'border-l-orange-500',
    insurance: 'border-l-teal-500',
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 ${catBg[category.key] ?? 'border-l-blue-500'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-300">{category.icon}</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {t(`categories.${category.key}`)}
          </span>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {checkedInCat} / {category.items.length}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {category.items.map((item) => (
            <CheckItemRow
              key={item.key}
              itemKey={item.key}
              weight={item.weight}
              state={states[item.key] ?? 'unchecked'}
              onChange={onChange}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JeonseChecklist() {
  const t = useTranslations('jeonseChecklist')

  const allItemKeys = CATEGORIES.flatMap((c) => c.items.map((i) => i.key))

  const initialStates: Record<string, CheckState> = Object.fromEntries(
    allItemKeys.map((k) => [k, 'unchecked'])
  )

  const [address, setAddress] = useState('')
  const [deposit, setDeposit] = useState('')
  const [contractDate, setContractDate] = useState('')
  const [checkStates, setCheckStates] = useState<Record<string, CheckState>>(initialStates)
  const [copied, setCopied] = useState(false)

  // ── URL sync ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const statesParam = params.get('s')
    if (statesParam) {
      const decoded = decodeStates(statesParam)
      setCheckStates((prev) => ({ ...prev, ...decoded }))
    }
    if (params.get('addr')) setAddress(decodeURIComponent(params.get('addr')!))
    if (params.get('dep')) setDeposit(params.get('dep')!)
    if (params.get('date')) setContractDate(params.get('date')!)
  }, [])

  const updateURL = useCallback(
    (states: Record<string, CheckState>, addr: string, dep: string, date: string) => {
      const url = new URL(window.location.href)
      url.searchParams.set('s', encodeStates(states))
      if (addr) url.searchParams.set('addr', encodeURIComponent(addr))
      else url.searchParams.delete('addr')
      if (dep) url.searchParams.set('dep', dep)
      else url.searchParams.delete('dep')
      if (date) url.searchParams.set('date', date)
      else url.searchParams.delete('date')
      window.history.replaceState({}, '', url)
    },
    []
  )

  const handleStateChange = useCallback(
    (key: string, state: CheckState) => {
      setCheckStates((prev) => {
        const next = { ...prev, [key]: state }
        updateURL(next, address, deposit, contractDate)
        return next
      })
    },
    [address, deposit, contractDate, updateURL]
  )

  const handleAddressChange = useCallback(
    (val: string) => {
      setAddress(val)
      updateURL(checkStates, val, deposit, contractDate)
    },
    [checkStates, deposit, contractDate, updateURL]
  )

  const handleDepositChange = useCallback(
    (val: string) => {
      const raw = val.replace(/[^0-9]/g, '')
      setDeposit(raw)
      updateURL(checkStates, address, raw, contractDate)
    },
    [checkStates, address, contractDate, updateURL]
  )

  const handleDateChange = useCallback(
    (val: string) => {
      setContractDate(val)
      updateURL(checkStates, address, deposit, val)
    },
    [checkStates, address, deposit, updateURL]
  )

  const handleReset = useCallback(() => {
    setCheckStates(initialStates)
    setAddress('')
    setDeposit('')
    setContractDate('')
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, '', url)
  }, [initialStates])

  // ── Score ──
  const { score, earnedWeight, checkedCount } = (() => {
    let earned = 0
    let count = 0
    CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        const s = checkStates[item.key] ?? 'unchecked'
        if (s === 'checked' || s === 'na') {
          earned += item.weight
          count++
        }
      })
    })
    return {
      score: (earned / TOTAL_WEIGHT) * 100,
      earnedWeight: earned,
      checkedCount: count,
    }
  })()

  const riskLevel = getRiskLevel(score)

  // ── Share ──
  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
      </div>

      {/* Property Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('propertyInfo')}</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('addressLabel')}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder={t('addressPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('depositLabel')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formatNumber(deposit)}
                onChange={(e) => handleDepositChange(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{t('depositUnit')}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('contractDateLabel')}
            </label>
            <input
              type="date"
              value={contractDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Risk Score Dashboard */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('riskScoreTitle')}</h2>
        <ScoreGauge
          score={score}
          level={riskLevel}
          checkedCount={checkedCount}
          totalCount={allItemKeys.length}
          t={t}
        />
        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          {t('scoreDetail', { earned: earnedWeight, total: TOTAL_WEIGHT })}
        </div>
      </div>

      {/* Checklist Categories */}
      <div className="space-y-3">
        {CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.key}
            category={cat}
            states={checkStates}
            onChange={handleStateChange}
            t={t}
          />
        ))}
      </div>

      {/* Emergency Contacts */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          {t('contactsTitle')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {CONTACTS.map(({ key, phone }) => (
            <a
              key={key}
              href={`tel:${phone}`}
              className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {t(`contacts.${key}`)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t(`contacts.${key}Desc`)}</p>
              </div>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{phone}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {copied ? t('copiedLabel') : t('shareLabel')}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          {t('printLabel')}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t('resetLabel')}
        </button>
      </div>

      {/* Warning banner for danger level */}
      {riskLevel === 'danger' && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">{t('dangerBannerTitle')}</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{t('dangerBannerDesc')}</p>
          </div>
        </div>
      )}

      {/* Guide Section */}
      <GuideSection namespace="jeonseChecklist" />
    </div>
  )
}
