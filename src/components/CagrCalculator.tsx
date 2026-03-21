'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, RotateCcw, ChevronDown, ChevronUp, BarChart3, TrendingUp, Clock, GitCompareArrows, Link } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Mode = 'cagr' | 'future' | 'period'
type CompoundFreq = 'yearly' | 'monthly' | 'daily'

interface YearlyData {
  year: number
  value: number
  growth: number
  growthRate: number
  valueB?: number
  growthB?: number
  growthRateB?: number
}

const PRESETS = [
  { key: 'kospi', cagr: 3.5, period: 10 },
  { key: 'seoulApt', cagr: 5.2, period: 10 },
  { key: 'sp500', cagr: 10.5, period: 10 },
  { key: 'usBond', cagr: 2.8, period: 10 },
  { key: 'deposit', cagr: 2.0, period: 10 },
]

function parseNumber(str: string): number {
  return Number(str.replace(/,/g, '')) || 0
}

function formatComma(value: string): string {
  const num = value.replace(/[^0-9]/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('ko-KR')
}

function formatKoreanMoney(value: number): string {
  if (value < 0) {
    return '-' + formatKoreanMoney(-value)
  }
  const eok = Math.floor(value / 100000000)
  const man = Math.floor((value % 100000000) / 10000)
  const rest = Math.round(value % 10000)

  if (eok > 0 && man > 0) {
    return `${eok.toLocaleString('ko-KR')}억 ${man.toLocaleString('ko-KR')}만원`
  } else if (eok > 0) {
    return `${eok.toLocaleString('ko-KR')}억원`
  } else if (man > 0) {
    return `${man.toLocaleString('ko-KR')}만${rest > 0 ? ` ${rest.toLocaleString('ko-KR')}` : ''}원`
  }
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

function formatChartAxis(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`
  } else if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`
  }
  return value.toLocaleString('ko-KR')
}

export default function CagrCalculator() {
  const t = useTranslations('cagrCalculator')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Mode
  const [mode, setMode] = useState<Mode>('cagr')

  // Common inputs
  const [startValue, setStartValue] = useState('10,000,000')
  const [endValue, setEndValue] = useState('20,000,000')
  const [period, setPeriod] = useState('10')
  const [periodUnit, setPeriodUnit] = useState<'years' | 'months'>('years')
  const [cagrRate, setCagrRate] = useState('7')
  const [targetValue, setTargetValue] = useState('100,000,000')
  const [compoundFreq, setCompoundFreq] = useState<CompoundFreq>('yearly')

  // Comparison mode
  const [compareMode, setCompareMode] = useState(false)
  const [startValueB, setStartValueB] = useState('10,000,000')
  const [endValueB, setEndValueB] = useState('15,000,000')
  const [periodB, setPeriodB] = useState('10')
  const [cagrRateB, setCagrRateB] = useState('5')
  const [targetValueB, setTargetValueB] = useState('100,000,000')

  // UI state
  const [showTable, setShowTable] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // URL state sync
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode')) setMode(params.get('mode') as Mode)
    if (params.get('start')) setStartValue(formatComma(params.get('start')!))
    if (params.get('end')) setEndValue(formatComma(params.get('end')!))
    if (params.get('period')) setPeriod(params.get('period')!)
    if (params.get('rate')) setCagrRate(params.get('rate')!)
    if (params.get('target')) setTargetValue(formatComma(params.get('target')!))
    if (params.get('freq')) setCompoundFreq(params.get('freq') as CompoundFreq)
    if (params.get('compare') === 'true') setCompareMode(true)
  }, [])

  const updateURL = useCallback((overrides: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(overrides).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    window.history.replaceState({}, '', url)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params: Record<string, string> = {
      mode,
      start: String(parseNumber(startValue)),
      freq: compoundFreq,
      compare: String(compareMode),
    }
    if (mode === 'cagr') {
      params.end = String(parseNumber(endValue))
      params.period = period
    } else if (mode === 'future') {
      params.rate = cagrRate
      params.period = period
    } else {
      params.target = String(parseNumber(targetValue))
      params.rate = cagrRate
    }
    updateURL(params)
  }, [mode, startValue, endValue, period, cagrRate, targetValue, compoundFreq, compareMode, updateURL])

  // Calculations
  const getYearsFromPeriod = useCallback((p: string, unit: 'years' | 'months' = periodUnit): number => {
    const val = parseFloat(p) || 0
    return unit === 'months' ? val / 12 : val
  }, [periodUnit])

  const calculateCAGR = useCallback((start: number, end: number, years: number): number => {
    if (start <= 0 || years <= 0) return 0
    if (compoundFreq === 'yearly') {
      return Math.pow(end / start, 1 / years) - 1
    } else if (compoundFreq === 'monthly') {
      const monthlyRate = Math.pow(end / start, 1 / (years * 12)) - 1
      return Math.pow(1 + monthlyRate, 12) - 1
    } else {
      const dailyRate = Math.pow(end / start, 1 / (years * 365)) - 1
      return Math.pow(1 + dailyRate, 365) - 1
    }
  }, [compoundFreq])

  const calculateFutureValue = useCallback((start: number, rate: number, years: number): number => {
    if (start <= 0) return 0
    const annualRate = rate / 100
    if (compoundFreq === 'yearly') {
      return start * Math.pow(1 + annualRate, years)
    } else if (compoundFreq === 'monthly') {
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1
      return start * Math.pow(1 + monthlyRate, years * 12)
    } else {
      const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1
      return start * Math.pow(1 + dailyRate, years * 365)
    }
  }, [compoundFreq])

  const calculateRequiredPeriod = useCallback((start: number, target: number, rate: number): number => {
    if (start <= 0 || target <= start || rate <= 0) return 0
    const annualRate = rate / 100
    if (compoundFreq === 'yearly') {
      return Math.log(target / start) / Math.log(1 + annualRate)
    } else if (compoundFreq === 'monthly') {
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1
      return Math.log(target / start) / Math.log(1 + monthlyRate) / 12
    } else {
      const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1
      return Math.log(target / start) / Math.log(1 + dailyRate) / 365
    }
  }, [compoundFreq])

  // Results
  const resultA = useMemo(() => {
    const start = parseNumber(startValue)
    const years = getYearsFromPeriod(period)

    if (mode === 'cagr') {
      const end = parseNumber(endValue)
      if (start <= 0 || end <= 0 || years <= 0) return null
      const cagr = calculateCAGR(start, end, years)
      const totalReturn = ((end - start) / start) * 100
      return { cagr: cagr * 100, totalReturn, totalGain: end - start, startValue: start, endValue: end, years }
    } else if (mode === 'future') {
      const rate = parseFloat(cagrRate) || 0
      if (start <= 0 || rate <= 0 || years <= 0) return null
      const fv = calculateFutureValue(start, rate, years)
      const totalReturn = ((fv - start) / start) * 100
      return { futureValue: fv, totalReturn, totalGain: fv - start, startValue: start, rate, years }
    } else {
      const target = parseNumber(targetValue)
      const rate = parseFloat(cagrRate) || 0
      if (start <= 0 || target <= start || rate <= 0) return null
      const reqYears = calculateRequiredPeriod(start, target, rate)
      const fullYears = Math.floor(reqYears)
      const months = Math.round((reqYears - fullYears) * 12)
      return { requiredYears: reqYears, fullYears, months, startValue: start, targetValue: target, rate, totalReturn: ((target - start) / start) * 100 }
    }
  }, [mode, startValue, endValue, period, cagrRate, targetValue, compoundFreq, calculateCAGR, calculateFutureValue, calculateRequiredPeriod, getYearsFromPeriod])

  const resultB = useMemo(() => {
    if (!compareMode) return null
    const start = parseNumber(startValueB)
    const years = getYearsFromPeriod(mode === 'period' ? period : periodB)

    if (mode === 'cagr') {
      const end = parseNumber(endValueB)
      if (start <= 0 || end <= 0 || years <= 0) return null
      const cagr = calculateCAGR(start, end, years)
      const totalReturn = ((end - start) / start) * 100
      return { cagr: cagr * 100, totalReturn, totalGain: end - start, startValue: start, endValue: end, years }
    } else if (mode === 'future') {
      const rate = parseFloat(cagrRateB) || 0
      if (start <= 0 || rate <= 0 || years <= 0) return null
      const fv = calculateFutureValue(start, rate, years)
      const totalReturn = ((fv - start) / start) * 100
      return { futureValue: fv, totalReturn, totalGain: fv - start, startValue: start, rate, years }
    } else {
      const target = parseNumber(targetValueB)
      const rate = parseFloat(cagrRateB) || 0
      if (start <= 0 || target <= start || rate <= 0) return null
      const reqYears = calculateRequiredPeriod(start, target, rate)
      const fullYears = Math.floor(reqYears)
      const months = Math.round((reqYears - fullYears) * 12)
      return { requiredYears: reqYears, fullYears, months, startValue: start, targetValue: target, rate, totalReturn: ((target - start) / start) * 100 }
    }
  }, [compareMode, mode, startValueB, endValueB, periodB, cagrRateB, targetValueB, period, compoundFreq, calculateCAGR, calculateFutureValue, calculateRequiredPeriod, getYearsFromPeriod])

  // Chart data
  const chartData = useMemo((): YearlyData[] => {
    if (!resultA) return []
    const data: YearlyData[] = []

    let annualRateA: number
    let totalYearsA: number
    let startA: number

    if (mode === 'cagr') {
      const r = resultA as { cagr: number; startValue: number; years: number }
      annualRateA = r.cagr / 100
      totalYearsA = r.years
      startA = r.startValue
    } else if (mode === 'future') {
      const r = resultA as { rate: number; startValue: number; years: number }
      annualRateA = r.rate / 100
      totalYearsA = r.years
      startA = r.startValue
    } else {
      const r = resultA as { requiredYears: number; startValue: number; rate: number }
      annualRateA = r.rate / 100
      totalYearsA = Math.ceil(r.requiredYears)
      startA = r.startValue
    }

    // Limit chart points for very long periods
    const step = totalYearsA > 100 ? Math.ceil(totalYearsA / 100) : 1
    const maxYear = Math.ceil(totalYearsA)

    for (let y = 0; y <= maxYear; y += step) {
      const valueA = startA * Math.pow(1 + annualRateA, y)
      const prevValueA = y > 0 ? startA * Math.pow(1 + annualRateA, y - step) : startA
      const entry: YearlyData = {
        year: y,
        value: Math.round(valueA),
        growth: Math.round(valueA - prevValueA),
        growthRate: y > 0 ? ((valueA - prevValueA) / prevValueA) * 100 : 0,
      }

      if (compareMode && resultB) {
        let annualRateB: number
        let startB: number
        if (mode === 'cagr') {
          const rb = resultB as { cagr: number; startValue: number }
          annualRateB = rb.cagr / 100
          startB = rb.startValue
        } else if (mode === 'future') {
          const rb = resultB as { rate: number; startValue: number }
          annualRateB = rb.rate / 100
          startB = rb.startValue
        } else {
          const rb = resultB as { rate: number; startValue: number }
          annualRateB = rb.rate / 100
          startB = rb.startValue
        }
        const valueB = startB * Math.pow(1 + annualRateB, y)
        const prevValueB = y > 0 ? startB * Math.pow(1 + annualRateB, y - step) : startB
        entry.valueB = Math.round(valueB)
        entry.growthB = Math.round(valueB - prevValueB)
        entry.growthRateB = y > 0 ? ((valueB - prevValueB) / prevValueB) * 100 : 0
      }

      data.push(entry)
    }

    // Ensure last year is included
    if (data.length > 0 && data[data.length - 1].year < maxYear) {
      const y = maxYear
      const valueA = startA * Math.pow(1 + annualRateA, y)
      const prevEntry = data[data.length - 1]
      const entry: YearlyData = {
        year: y,
        value: Math.round(valueA),
        growth: Math.round(valueA - prevEntry.value),
        growthRate: ((valueA - prevEntry.value) / prevEntry.value) * 100,
      }
      data.push(entry)
    }

    return data
  }, [resultA, resultB, compareMode, mode])

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

  const copyLink = useCallback(() => {
    copyToClipboard(window.location.href, 'link')
  }, [copyToClipboard])

  const handlePreset = useCallback((presetKey: string) => {
    const preset = PRESETS.find(p => p.key === presetKey)
    if (!preset) return
    if (mode === 'cagr') {
      // In CAGR mode, set rate to future mode and switch
      setCagrRate(String(preset.cagr))
      setPeriod(String(preset.period))
      setMode('future')
    } else if (mode === 'future') {
      setCagrRate(String(preset.cagr))
      setPeriod(String(preset.period))
    } else {
      setCagrRate(String(preset.cagr))
    }
  }, [mode])

  const handleReset = useCallback(() => {
    setStartValue('10,000,000')
    setEndValue('20,000,000')
    setPeriod('10')
    setPeriodUnit('years')
    setCagrRate('7')
    setTargetValue('100,000,000')
    setCompoundFreq('yearly')
    setCompareMode(false)
    setStartValueB('10,000,000')
    setEndValueB('15,000,000')
    setPeriodB('10')
    setCagrRateB('5')
    setTargetValueB('100,000,000')
  }, [])

  const getResultSummaryText = useCallback((): string => {
    if (!resultA) return ''
    if (mode === 'cagr') {
      const r = resultA as { cagr: number; totalReturn: number; totalGain: number }
      return `CAGR: ${r.cagr.toFixed(2)}%, ${t('result.totalReturn')}: ${r.totalReturn.toFixed(1)}%, ${t('result.totalGain')}: ${formatKoreanMoney(r.totalGain)}`
    } else if (mode === 'future') {
      const r = resultA as { futureValue: number; totalReturn: number; totalGain: number }
      return `${t('result.futureValue')}: ${formatKoreanMoney(r.futureValue)}, ${t('result.totalReturn')}: ${r.totalReturn.toFixed(1)}%, ${t('result.totalGain')}: ${formatKoreanMoney(r.totalGain)}`
    } else {
      const r = resultA as { fullYears: number; months: number }
      return `${t('result.requiredPeriod')}: ${r.fullYears}${t('units.year')} ${r.months}${t('units.month')}`
    }
  }, [resultA, mode, t])

  const modeIcons: Record<Mode, typeof TrendingUp> = {
    cagr: BarChart3,
    future: TrendingUp,
    period: Clock,
  }

  const renderCommaInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => onChange(formatComma(e.target.value))}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right"
    />
  )

  const renderNumberInput = (value: string, onChange: (v: string) => void, placeholder: string, suffix?: string) => (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right pr-10"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
          {suffix}
        </span>
      )}
    </div>
  )

  const renderInputPanel = (isB = false) => {
    const sv = isB ? startValueB : startValue
    const setSv = isB ? setStartValueB : setStartValue
    const ev = isB ? endValueB : endValue
    const setEv = isB ? setEndValueB : setEndValue
    const p = isB ? periodB : period
    const setP = isB ? setPeriodB : setPeriod
    const cr = isB ? cagrRateB : cagrRate
    const setCr = isB ? setCagrRateB : setCagrRate
    const tv = isB ? targetValueB : targetValue
    const setTv = isB ? setTargetValueB : setTargetValue

    return (
      <div className="space-y-4">
        {/* Start Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('input.startValue')}
          </label>
          {renderCommaInput(sv, setSv, '10,000,000')}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
            {parseNumber(sv) > 0 ? formatKoreanMoney(parseNumber(sv)) : ''}
          </p>
        </div>

        {/* Mode-specific inputs */}
        {mode === 'cagr' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.endValue')}
              </label>
              {renderCommaInput(ev, setEv, '20,000,000')}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                {parseNumber(ev) > 0 ? formatKoreanMoney(parseNumber(ev)) : ''}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.period')}
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  {renderNumberInput(p, setP, '10', periodUnit === 'years' ? t('units.year') : t('units.month'))}
                </div>
                <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                  <button
                    onClick={() => setPeriodUnit('years')}
                    className={`px-3 py-2 text-sm ${periodUnit === 'years' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    {t('input.periodYears')}
                  </button>
                  <button
                    onClick={() => setPeriodUnit('months')}
                    className={`px-3 py-2 text-sm ${periodUnit === 'months' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    {t('input.periodMonths')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {mode === 'future' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.cagrRate')}
              </label>
              {renderNumberInput(cr, setCr, '7', '%')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.period')}
              </label>
              {renderNumberInput(p, setP, '10', t('units.year'))}
            </div>
          </>
        )}

        {mode === 'period' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.targetValue')}
              </label>
              {renderCommaInput(tv, setTv, '100,000,000')}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                {parseNumber(tv) > 0 ? formatKoreanMoney(parseNumber(tv)) : ''}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.cagrRate')}
              </label>
              {renderNumberInput(cr, setCr, '7', '%')}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 shrink-0 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          title="링크 복사"
        >
          {copiedId === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          <span className="hidden sm:inline">{copiedId === 'link' ? '복사됨' : '링크 복사'}</span>
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {(['cagr', 'future', 'period'] as Mode[]).map(m => {
          const Icon = modeIcons[m]
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t(`mode.${m}`)}</span>
              <span className="sm:hidden">{t(`mode.${m}Short`)}</span>
            </button>
          )
        })}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {compareMode ? t('compare.investmentA') : t('input.title')}
            </h2>
            {renderInputPanel(false)}
          </div>

          {/* Comparison Input B */}
          {compareMode && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-emerald-200 dark:border-emerald-800">
              <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 mb-4">
                {t('compare.investmentB')}
              </h2>
              {renderInputPanel(true)}
            </div>
          )}

          {/* Compound Frequency */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('input.compoundFreq')}
            </label>
            <select
              value={compoundFreq}
              onChange={e => setCompoundFreq(e.target.value as CompoundFreq)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="yearly">{t('input.yearly')}</option>
              <option value="monthly">{t('input.monthly')}</option>
              <option value="daily">{t('input.daily')}</option>
            </select>

            {/* Compare Toggle */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('compare.toggle')}</span>
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  compareMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    compareMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Presets */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('preset.label')}
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(preset => (
                  <button
                    key={preset.key}
                    onClick={() => handlePreset(preset.key)}
                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {t(`preset.${preset.key}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Result Card */}
          {resultA ? (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  {mode === 'cagr' && (() => {
                    const r = resultA as { cagr: number; totalReturn: number; totalGain: number }
                    return (
                      <>
                        <p className="text-sm opacity-80">{t('result.cagrLabel')}</p>
                        <p className="text-4xl font-bold mt-1">
                          {r.cagr >= 0 ? '' : ''}{r.cagr.toFixed(2)}%
                        </p>
                        <div className="mt-3 space-y-1 text-sm opacity-90">
                          <p>{t('result.totalReturn')}: {r.totalReturn.toFixed(1)}%</p>
                          <p>{t('result.totalGain')}: {formatKoreanMoney(r.totalGain)}</p>
                        </div>
                      </>
                    )
                  })()}

                  {mode === 'future' && (() => {
                    const r = resultA as { futureValue: number; totalReturn: number; totalGain: number; years: number }
                    return (
                      <>
                        <p className="text-sm opacity-80">{t('result.futureValueLabel')}</p>
                        <p className="text-4xl font-bold mt-1">{formatKoreanMoney(r.futureValue)}</p>
                        <div className="mt-3 space-y-1 text-sm opacity-90">
                          <p>{t('result.totalReturn')}: {r.totalReturn.toFixed(1)}%</p>
                          <p>{t('result.totalGain')}: {formatKoreanMoney(r.totalGain)}</p>
                        </div>
                      </>
                    )
                  })()}

                  {mode === 'period' && (() => {
                    const r = resultA as { fullYears: number; months: number; rate: number }
                    return (
                      <>
                        <p className="text-sm opacity-80">{t('result.requiredPeriodLabel')}</p>
                        <p className="text-4xl font-bold mt-1">
                          {r.fullYears}{t('units.year')} {r.months > 0 ? `${r.months}${t('units.month')}` : ''}
                        </p>
                        <p className="mt-3 text-sm opacity-90">
                          CAGR {r.rate}% {t('result.basis')}
                        </p>
                      </>
                    )
                  })()}
                </div>

                <button
                  onClick={() => copyToClipboard(getResultSummaryText(), 'result')}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  title={t('copy')}
                >
                  {copiedId === 'result' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('result.placeholder')}</p>
            </div>
          )}

          {/* Comparison Result */}
          {compareMode && resultA && resultB && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <GitCompareArrows className="w-5 h-5" />
                {t('compare.title')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400">{t('compare.item')}</th>
                      <th className="text-right py-2 px-3 text-blue-600 dark:text-blue-400">{t('compare.investmentA')}</th>
                      <th className="text-right py-2 px-3 text-emerald-600 dark:text-emerald-400">{t('compare.investmentB')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900 dark:text-white">
                    {mode === 'cagr' && (() => {
                      const rA = resultA as { cagr: number; totalReturn: number; totalGain: number; endValue: number }
                      const rB = resultB as { cagr: number; totalReturn: number; totalGain: number; endValue: number }
                      return (
                        <>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">CAGR</td>
                            <td className="text-right py-2 px-3 font-medium">{rA.cagr.toFixed(2)}%</td>
                            <td className="text-right py-2 px-3 font-medium">{rB.cagr.toFixed(2)}%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">{t('result.totalReturn')}</td>
                            <td className="text-right py-2 px-3">{rA.totalReturn.toFixed(1)}%</td>
                            <td className="text-right py-2 px-3">{rB.totalReturn.toFixed(1)}%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">{t('compare.finalValue')}</td>
                            <td className="text-right py-2 px-3">{formatKoreanMoney(rA.endValue)}</td>
                            <td className="text-right py-2 px-3">{formatKoreanMoney(rB.endValue)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3">{t('compare.difference')}</td>
                            <td colSpan={2} className="text-right py-2 px-3 font-medium">
                              {rA.endValue === rB.endValue
                                ? t('compare.same')
                                : formatKoreanMoney(Math.abs(rA.endValue - rB.endValue))
                              }
                              {rA.endValue !== rB.endValue && (
                                <span className={rA.endValue > rB.endValue ? 'text-blue-600 dark:text-blue-400 ml-1' : 'text-emerald-600 dark:text-emerald-400 ml-1'}>
                                  ({rA.endValue > rB.endValue ? 'A' : 'B'} {t('compare.advantage')})
                                </span>
                              )}
                            </td>
                          </tr>
                        </>
                      )
                    })()}

                    {mode === 'future' && (() => {
                      const rA = resultA as { futureValue: number; totalReturn: number; totalGain: number; rate: number }
                      const rB = resultB as { futureValue: number; totalReturn: number; totalGain: number; rate: number }
                      return (
                        <>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">CAGR</td>
                            <td className="text-right py-2 px-3 font-medium">{rA.rate}%</td>
                            <td className="text-right py-2 px-3 font-medium">{rB.rate}%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">{t('result.totalReturn')}</td>
                            <td className="text-right py-2 px-3">{rA.totalReturn.toFixed(1)}%</td>
                            <td className="text-right py-2 px-3">{rB.totalReturn.toFixed(1)}%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">{t('compare.finalValue')}</td>
                            <td className="text-right py-2 px-3">{formatKoreanMoney(rA.futureValue)}</td>
                            <td className="text-right py-2 px-3">{formatKoreanMoney(rB.futureValue)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3">{t('compare.difference')}</td>
                            <td colSpan={2} className="text-right py-2 px-3 font-medium">
                              {Math.round(rA.futureValue) === Math.round(rB.futureValue)
                                ? t('compare.same')
                                : formatKoreanMoney(Math.abs(rA.futureValue - rB.futureValue))
                              }
                              {Math.round(rA.futureValue) !== Math.round(rB.futureValue) && (
                                <span className={rA.futureValue > rB.futureValue ? 'text-blue-600 dark:text-blue-400 ml-1' : 'text-emerald-600 dark:text-emerald-400 ml-1'}>
                                  ({rA.futureValue > rB.futureValue ? 'A' : 'B'} {t('compare.advantage')})
                                </span>
                              )}
                            </td>
                          </tr>
                        </>
                      )
                    })()}

                    {mode === 'period' && (() => {
                      const rA = resultA as { fullYears: number; months: number; requiredYears: number; rate: number }
                      const rB = resultB as { fullYears: number; months: number; requiredYears: number; rate: number }
                      return (
                        <>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">CAGR</td>
                            <td className="text-right py-2 px-3 font-medium">{rA.rate}%</td>
                            <td className="text-right py-2 px-3 font-medium">{rB.rate}%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">{t('result.requiredPeriod')}</td>
                            <td className="text-right py-2 px-3">{rA.fullYears}{t('units.year')} {rA.months > 0 ? `${rA.months}${t('units.month')}` : ''}</td>
                            <td className="text-right py-2 px-3">{rB.fullYears}{t('units.year')} {rB.months > 0 ? `${rB.months}${t('units.month')}` : ''}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3">{t('compare.difference')}</td>
                            <td colSpan={2} className="text-right py-2 px-3 font-medium">
                              {Math.abs(rA.requiredYears - rB.requiredYears) < 0.01
                                ? t('compare.same')
                                : `${Math.abs(rA.requiredYears - rB.requiredYears).toFixed(1)}${t('units.year')}`
                              }
                              {Math.abs(rA.requiredYears - rB.requiredYears) >= 0.01 && (
                                <span className={rA.requiredYears < rB.requiredYears ? 'text-blue-600 dark:text-blue-400 ml-1' : 'text-emerald-600 dark:text-emerald-400 ml-1'}>
                                  ({rA.requiredYears < rB.requiredYears ? 'A' : 'B'} {t('compare.faster')})
                                </span>
                              )}
                            </td>
                          </tr>
                        </>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('chart.title')}</h3>
              <div className="w-full" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      label={{ value: t('chart.year'), position: 'insideBottomRight', offset: -5, fill: '#6b7280' }}
                    />
                    <YAxis
                      tickFormatter={formatChartAxis}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      width={70}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatKoreanMoney(Number(value ?? 0)),
                        (name as string) === 'value' ? (compareMode ? t('compare.investmentA') : t('chart.value')) : t('compare.investmentB')
                      ]}
                      labelFormatter={(label) => `${label}${t('units.year')}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    {compareMode && <Legend />}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={chartData.length <= 30}
                      name={compareMode ? t('compare.investmentA') : t('chart.value')}
                    />
                    {compareMode && (
                      <Line
                        type="monotone"
                        dataKey="valueB"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={chartData.length <= 30}
                        name={t('compare.investmentB')}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Yearly Table */}
          {chartData.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => setShowTable(!showTable)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('table.title')}</h3>
                {showTable ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {showTable && (
                <div className="px-6 pb-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400">{t('table.year')}</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400">{t('table.value')}</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400">{t('table.growth')}</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400">{t('table.growthRate')}</th>
                        {compareMode && (
                          <>
                            <th className="text-right py-2 px-2 text-emerald-600 dark:text-emerald-400">{t('table.valueB')}</th>
                            <th className="text-right py-2 px-2 text-emerald-600 dark:text-emerald-400">{t('table.growthB')}</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map(row => (
                        <tr key={row.year} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-2 px-2 text-gray-900 dark:text-white">{row.year}{t('units.year')}</td>
                          <td className="text-right py-2 px-2 text-gray-900 dark:text-white font-medium">{formatKoreanMoney(row.value)}</td>
                          <td className="text-right py-2 px-2 text-gray-600 dark:text-gray-400">
                            {row.year > 0 ? `+${formatKoreanMoney(row.growth)}` : '-'}
                          </td>
                          <td className="text-right py-2 px-2 text-gray-600 dark:text-gray-400">
                            {row.year > 0 ? `${row.growthRate.toFixed(2)}%` : '-'}
                          </td>
                          {compareMode && (
                            <>
                              <td className="text-right py-2 px-2 text-emerald-700 dark:text-emerald-400 font-medium">
                                {row.valueB != null ? formatKoreanMoney(row.valueB) : '-'}
                              </td>
                              <td className="text-right py-2 px-2 text-emerald-600 dark:text-emerald-400">
                                {row.year > 0 && row.growthB != null ? `+${formatKoreanMoney(row.growthB)}` : '-'}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showGuide && (
          <div className="px-6 pb-6 space-y-6">
            {/* What is CAGR */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.whatIsCagr.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.whatIsCagr.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-sm">
                    <span className="text-blue-500 mt-1">&#8226;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Formula */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.formula.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.formula.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-sm">
                    <span className="text-blue-500 mt-1">&#8226;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Usage */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.usage.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.usage.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-sm">
                    <span className="text-blue-500 mt-1">&#8226;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-sm">
                    <span className="text-blue-500 mt-1">&#8226;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
