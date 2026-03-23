'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Link, RotateCcw, BookOpen, ChevronDown, ChevronUp, Download, Share2, Trophy, Users, TrendingUp, BarChart3, Loader2, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { submitSalarySurvey, getCommunityStats, getCommunityRank, type CommunityStats, type CommunityRank } from '@/utils/salarySurvey'

// ═══════════════════════════════════════════════════════════════════════════════
// 공식 데이터: 국세청 근로소득 백분위 (2023 귀속, 2024 공개)
// 출처: 국세청 국세통계포털 (TASIS), 통계청 경제활동인구조사
// ═══════════════════════════════════════════════════════════════════════════════

// 연간 총급여 기준 누적 분포 (만원) — 이 금액 이하인 사람이 해당 %
const INCOME_PERCENTILES: [number, number][] = [
  [10, 800],    // 하위 10%: 800만원 이하
  [20, 1500],
  [25, 1800],   // 하위 25% (1분위)
  [30, 2200],
  [40, 2800],
  [50, 3500],   // 중위: 3,500만원
  [60, 4200],
  [70, 5000],
  [75, 5600],   // 상위 25%
  [80, 6300],
  [90, 8500],
  [95, 11000],  // 상위 5%
  [99, 20000],  // 상위 1%
  [99.9, 50000], // 상위 0.1%
]

// 연령대별 중위연봉 (만원) — 통계청 2024
const AGE_MEDIAN: Record<string, number> = {
  '20s': 2800,
  '30s': 4000,
  '40s': 4800,
  '50s': 4200,
  '60s': 2600,
}

// 연령대별 소득 분포 보정 계수 (중위 대비)
const AGE_PERCENTILES: Record<string, [number, number][]> = {
  '20s': [[10, 500], [25, 1200], [50, 2800], [75, 4000], [90, 5500], [95, 7000], [99, 12000]],
  '30s': [[10, 1200], [25, 2400], [50, 4000], [75, 5800], [90, 8000], [95, 10500], [99, 18000]],
  '40s': [[10, 1500], [25, 2800], [50, 4800], [75, 7200], [90, 10000], [95, 14000], [99, 25000]],
  '50s': [[10, 1200], [25, 2400], [50, 4200], [75, 6500], [90, 9500], [95, 13000], [99, 23000]],
  '60s': [[10, 500], [25, 1200], [50, 2600], [75, 4500], [90, 7000], [95, 10000], [99, 18000]],
}

// 성별 중위연봉 (만원) — 통계청 2024
const GENDER_MEDIAN: Record<string, number> = {
  male: 4200,
  female: 2800,
}

// 성별 소득 분포
const GENDER_PERCENTILES: Record<string, [number, number][]> = {
  male: [[10, 1200], [25, 2400], [50, 4200], [75, 6200], [90, 9000], [95, 12000], [99, 22000]],
  female: [[10, 600], [25, 1500], [50, 2800], [75, 4200], [90, 6000], [95, 8500], [99, 16000]],
}

// 직업군별 평균연봉 (만원) — 고용노동부 고용형태별근로실태조사 2024
const INDUSTRY_AVG: Record<string, number> = {
  it: 5800,
  finance: 7200,
  medical: 5500,
  civil: 5000,
  education: 4600,
  manufacturing: 4200,
  construction: 3800,
  service: 2800,
  selfEmployed: 3200,
  logistics: 3500,
  media: 4500,
  legal: 8000,
}

// 직업군별 소득 분포
const INDUSTRY_PERCENTILES: Record<string, [number, number][]> = {
  it: [[10, 2800], [25, 4000], [50, 5800], [75, 8000], [90, 12000], [95, 15000], [99, 30000]],
  finance: [[10, 3500], [25, 5000], [50, 7200], [75, 10000], [90, 15000], [95, 20000], [99, 40000]],
  medical: [[10, 2500], [25, 3500], [50, 5500], [75, 9000], [90, 15000], [95, 25000], [99, 50000]],
  civil: [[10, 3000], [25, 3800], [50, 5000], [75, 6500], [90, 8000], [95, 9500], [99, 13000]],
  education: [[10, 2500], [25, 3200], [50, 4600], [75, 6000], [90, 7500], [95, 9000], [99, 12000]],
  manufacturing: [[10, 2000], [25, 2800], [50, 4200], [75, 5800], [90, 7500], [95, 9000], [99, 14000]],
  construction: [[10, 1500], [25, 2400], [50, 3800], [75, 5200], [90, 7000], [95, 8500], [99, 12000]],
  service: [[10, 800], [25, 1500], [50, 2800], [75, 4000], [90, 5500], [95, 7000], [99, 10000]],
  selfEmployed: [[10, 500], [25, 1200], [50, 3200], [75, 5500], [90, 8000], [95, 12000], [99, 25000]],
  logistics: [[10, 1500], [25, 2200], [50, 3500], [75, 5000], [90, 6500], [95, 8000], [99, 12000]],
  media: [[10, 2000], [25, 3000], [50, 4500], [75, 6500], [90, 9000], [95, 12000], [99, 20000]],
  legal: [[10, 3000], [25, 5000], [50, 8000], [75, 12000], [90, 18000], [95, 25000], [99, 50000]],
}

// ═══════════════════════════════════════════════════════════════════════════════
// 계산 로직
// ═══════════════════════════════════════════════════════════════════════════════

function interpolatePercentile(salary: number, percentiles: [number, number][]): number {
  const salaryMan = salary / 10000 // 원 → 만원

  if (salaryMan <= percentiles[0][1]) {
    return percentiles[0][0] * (salaryMan / percentiles[0][1])
  }
  if (salaryMan >= percentiles[percentiles.length - 1][1]) {
    const last = percentiles[percentiles.length - 1]
    return Math.min(99.99, last[0] + (100 - last[0]) * 0.5)
  }

  for (let i = 0; i < percentiles.length - 1; i++) {
    const [pctLow, valLow] = percentiles[i]
    const [pctHigh, valHigh] = percentiles[i + 1]
    if (salaryMan >= valLow && salaryMan <= valHigh) {
      const ratio = (salaryMan - valLow) / (valHigh - valLow)
      return pctLow + ratio * (pctHigh - pctLow)
    }
  }
  return 50
}

function getTopPercent(percentile: number): number {
  return Math.max(0.01, Math.round((100 - percentile) * 100) / 100)
}

interface RankResult {
  overall: { percentile: number; topPercent: number }
  byAge: { percentile: number; topPercent: number; median: number } | null
  byGender: { percentile: number; topPercent: number; median: number } | null
  byIndustry: { percentile: number; topPercent: number; avg: number } | null
}

function calculateRank(
  annualSalary: number,
  ageGroup?: string,
  gender?: string,
  industry?: string
): RankResult {
  const overallPct = interpolatePercentile(annualSalary, INCOME_PERCENTILES)

  let byAge = null
  if (ageGroup && AGE_PERCENTILES[ageGroup]) {
    const pct = interpolatePercentile(annualSalary, AGE_PERCENTILES[ageGroup])
    byAge = { percentile: pct, topPercent: getTopPercent(pct), median: AGE_MEDIAN[ageGroup] * 10000 }
  }

  let byGender = null
  if (gender && GENDER_PERCENTILES[gender]) {
    const pct = interpolatePercentile(annualSalary, GENDER_PERCENTILES[gender])
    byGender = { percentile: pct, topPercent: getTopPercent(pct), median: GENDER_MEDIAN[gender] * 10000 }
  }

  let byIndustry = null
  if (industry && INDUSTRY_PERCENTILES[industry]) {
    const pct = interpolatePercentile(annualSalary, INDUSTRY_PERCENTILES[industry])
    byIndustry = { percentile: pct, topPercent: getTopPercent(pct), avg: INDUSTRY_AVG[industry] * 10000 }
  }

  return {
    overall: { percentile: overallPct, topPercent: getTopPercent(overallPct) },
    byAge,
    byGender,
    byIndustry,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Supabase 기반 커뮤니티 데이터 수집
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════════════════════════════════════════

function formatKRW(value: number): string {
  if (value >= 100_000_000) {
    const eok = Math.floor(value / 100_000_000)
    const man = Math.floor((value % 100_000_000) / 10_000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`
  }
  if (value >= 10_000) return `${Math.floor(value / 10_000).toLocaleString()}만`
  return value.toLocaleString()
}

function getRankEmoji(topPercent: number): string {
  if (topPercent <= 1) return '👑'
  if (topPercent <= 5) return '💎'
  if (topPercent <= 10) return '🏆'
  if (topPercent <= 25) return '⭐'
  if (topPercent <= 50) return '👍'
  return '💪'
}

function getRankColor(topPercent: number): string {
  if (topPercent <= 1) return 'from-yellow-400 to-amber-500'
  if (topPercent <= 5) return 'from-purple-500 to-indigo-600'
  if (topPercent <= 10) return 'from-blue-500 to-cyan-500'
  if (topPercent <= 25) return 'from-green-500 to-emerald-500'
  if (topPercent <= 50) return 'from-teal-400 to-green-400'
  return 'from-gray-400 to-gray-500'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

const AGE_GROUPS = ['20s', '30s', '40s', '50s', '60s'] as const
const GENDERS = ['male', 'female'] as const
const INDUSTRIES = ['it', 'finance', 'medical', 'civil', 'education', 'manufacturing', 'construction', 'service', 'selfEmployed', 'logistics', 'media', 'legal'] as const

export default function SalaryRank() {
  const t = useTranslations('salaryRank')
  const router = useRouter()
  const searchParams = useSearchParams()
  const resultRef = useRef<HTMLDivElement>(null)

  const [salaryInput, setSalaryInput] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [gender, setGender] = useState('')
  const [industry, setIndustry] = useState('')
  const [result, setResult] = useState<RankResult | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [contributed, setContributed] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'already' | 'error'>('idle')
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null)
  const [communityRank, setCommunityRank] = useState<CommunityRank | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)

  // Dark mode detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const check = () => setIsDark(document.documentElement.classList.contains('dark') || mq.matches)
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    mq.addEventListener('change', check)
    return () => { observer.disconnect(); mq.removeEventListener('change', check) }
  }, [])

  const updateURL = useCallback((params: Record<string, string>) => {
    const p = new URLSearchParams(searchParams)
    Object.entries(params).forEach(([k, v]) => {
      if (v) p.set(k, v); else p.delete(k)
    })
    router.replace(`?${p.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Fetch community stats
  const fetchStats = useCallback(async (salary?: number) => {
    setStatsLoading(true)
    try {
      const [stats, rank] = await Promise.all([
        getCommunityStats(),
        salary ? getCommunityRank(salary) : Promise.resolve(null),
      ])
      setCommunityStats(stats)
      setCommunityRank(rank)
    } catch { /* ignore */ }
    setStatsLoading(false)
  }, [])

  // Restore from URL
  useEffect(() => {
    const s = searchParams.get('salary')
    if (!s) { fetchStats(); return }
    setSalaryInput(s)
    const a = searchParams.get('age') || ''
    const g = searchParams.get('gender') || ''
    const i = searchParams.get('industry') || ''
    if (a) setAgeGroup(a)
    if (g) setGender(g)
    if (i) setIndustry(i)
    if (/^\d+$/.test(s)) {
      setResult(calculateRank(Number(s), a, g, i))
      fetchStats(Number(s))
    } else {
      fetchStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCalculate = useCallback(() => {
    const salary = Number(salaryInput.replace(/,/g, ''))
    if (!salary || salary < 0) return
    const res = calculateRank(salary, ageGroup, gender, industry)
    setResult(res)
    setContributed(false)
    setSubmitStatus('idle')
    setShowContribute(true)
    updateURL({ salary: String(salary), age: ageGroup, gender, industry })
    fetchStats(salary)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }, [salaryInput, ageGroup, gender, industry, updateURL, fetchStats])

  const handleContribute = useCallback(async () => {
    const salary = Number(salaryInput.replace(/,/g, ''))
    if (!salary) return
    setSubmitStatus('loading')
    const { success, error } = await submitSalarySurvey({ salary, ageGroup, gender, industry })
    if (success) {
      setContributed(true)
      setSubmitStatus('idle')
      fetchStats(salary) // refresh stats after contribution
    } else if (error === 'already_submitted') {
      setSubmitStatus('already')
    } else {
      setSubmitStatus('error')
    }
  }, [salaryInput, ageGroup, gender, industry, fetchStats])

  const handleReset = useCallback(() => {
    setSalaryInput('')
    setAgeGroup('')
    setGender('')
    setIndustry('')
    setResult(null)
    setContributed(false)
    setShowContribute(false)
    setSubmitStatus('idle')
    setCommunityRank(null)
    updateURL({ salary: '', age: '', gender: '', industry: '' })
  }, [updateURL])

  const copyLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(window.location.href) } catch { /* */ }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [])

  const shareResult = useCallback(async () => {
    if (!result) return
    const text = `내 연봉은 한국 전체 상위 ${result.overall.topPercent}%! ${getRankEmoji(result.overall.topPercent)}\n${window.location.href}`
    if (navigator.share) {
      try { await navigator.share({ title: t('title'), text, url: window.location.href }) } catch { /* */ }
    } else {
      try { await navigator.clipboard.writeText(text) } catch { /* */ }
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }, [result, t])

  // Distribution chart data
  const distributionData = useMemo(() => {
    const brackets = [
      { label: '~1천만', min: 0, max: 10_000_000, pct: 10 },
      { label: '1~2천만', min: 10_000_000, max: 20_000_000, pct: 15 },
      { label: '2~3천만', min: 20_000_000, max: 30_000_000, pct: 18 },
      { label: '3~4천만', min: 30_000_000, max: 40_000_000, pct: 16 },
      { label: '4~5천만', min: 40_000_000, max: 50_000_000, pct: 13 },
      { label: '5~6천만', min: 50_000_000, max: 60_000_000, pct: 9 },
      { label: '6~8천만', min: 60_000_000, max: 80_000_000, pct: 9 },
      { label: '8천~1억', min: 80_000_000, max: 100_000_000, pct: 5 },
      { label: '1~2억', min: 100_000_000, max: 200_000_000, pct: 4 },
      { label: '2억+', min: 200_000_000, max: Infinity, pct: 1 },
    ]
    const salary = Number(salaryInput.replace(/,/g, '')) || 0
    return brackets.map(b => ({
      ...b,
      isYou: salary >= b.min && salary < b.max,
    }))
  }, [salaryInput])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCalculate()
  }, [handleCalculate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors shrink-0">
          {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          {linkCopied ? t('linkCopied') : t('copyLink')}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {/* Annual salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('annualSalary')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={salaryInput ? Number(salaryInput.replace(/,/g, '')).toLocaleString() : ''}
                  onChange={e => setSalaryInput(e.target.value.replace(/,/g, '').replace(/[^\d]/g, ''))}
                  onKeyDown={handleKeyDown}
                  placeholder={t('salaryPlaceholder')}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{t('won')}</span>
              </div>
              {salaryInput && Number(salaryInput) > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">= {formatKRW(Number(salaryInput))}{t('won')}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('salaryHint')}</p>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-1.5">
              {[2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000].map(v => (
                <button key={v} onClick={() => setSalaryInput(String(v * 10000))}
                  className="px-2 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                  {v >= 10000 ? `${v / 10000}억` : `${v.toLocaleString()}만`}
                </button>
              ))}
            </div>

            {/* Age group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ageGroup')}</label>
              <div className="flex flex-wrap gap-1.5">
                {AGE_GROUPS.map(ag => (
                  <button key={ag} onClick={() => setAgeGroup(ageGroup === ag ? '' : ag)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      ageGroup === ag
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>
                    {t(`ages.${ag}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('gender')}</label>
              <div className="flex gap-2">
                {GENDERS.map(g => (
                  <button key={g} onClick={() => setGender(gender === g ? '' : g)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      gender === g
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>
                    {t(`genders.${g}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('industry')}</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">{t('industryAll')}</option>
                {INDUSTRIES.map(i => (
                  <option key={i} value={i}>{t(`industries.${i}`)}</option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button onClick={handleCalculate} disabled={!salaryInput}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <BarChart3 className="w-5 h-5" />
                {t('calculate')}
              </button>
              <button onClick={handleReset} className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Data source note */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">{t('dataSource')}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">{t('dataSourceDesc')}</p>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2 space-y-4" ref={resultRef}>
          {!result ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-16 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-400 dark:text-gray-500 text-lg">{t('enterSalary')}</p>
            </div>
          ) : (
            <>
              {/* Main result card */}
              <div className={`bg-gradient-to-br ${getRankColor(result.overall.topPercent)} rounded-2xl shadow-xl p-8 text-center text-white relative overflow-hidden`}>
                <div className="absolute inset-0 bg-white/5" />
                <div className="relative z-10">
                  <p className="text-6xl mb-2">{getRankEmoji(result.overall.topPercent)}</p>
                  <p className="text-sm opacity-80 mb-1">{t('yourSalary')}</p>
                  <p className="text-xl font-bold mb-4">{formatKRW(Number(salaryInput))}{t('won')}</p>
                  <p className="text-sm opacity-80">{t('overallRank')}</p>
                  <p className="text-6xl sm:text-7xl font-black my-2">
                    {t('top')} {result.overall.topPercent}%
                  </p>
                  <p className="text-sm opacity-80">
                    {t('beatsPercent', { percent: result.overall.percentile.toFixed(1) })}
                  </p>

                  {/* Share buttons */}
                  <div className="flex justify-center gap-3 mt-6">
                    <button onClick={shareResult} className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                      <Share2 className="w-4 h-4" />{t('share')}
                    </button>
                    <button onClick={copyLink} className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                      <Link className="w-4 h-4" />{t('copyLink')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Detailed comparison cards */}
              <div className="grid sm:grid-cols-3 gap-3">
                {result.byAge && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-blue-500" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('ageComparison')}</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{t('top')} {result.byAge.topPercent}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('ages.' + ageGroup)} {t('median')}: {formatKRW(result.byAge.median)}{t('won')}</p>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${result.byAge.percentile}%` }} />
                    </div>
                  </div>
                )}
                {result.byGender && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('genderComparison')}</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{t('top')} {result.byGender.topPercent}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('genders.' + gender)} {t('median')}: {formatKRW(result.byGender.median)}{t('won')}</p>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${result.byGender.percentile}%` }} />
                    </div>
                  </div>
                )}
                {result.byIndustry && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-green-500" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('industryComparison')}</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{t('top')} {result.byIndustry.topPercent}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('industries.' + industry)} {t('average')}: {formatKRW(result.byIndustry.avg)}{t('won')}</p>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${result.byIndustry.percentile}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Distribution chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> {t('distributionChart')}
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }} unit="%" />
                      <Tooltip
                        formatter={(value) => `${value}%`}
                        contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '8px', color: isDark ? '#f3f4f6' : '#111827' }}
                      />
                      <Bar dataKey="pct" name={t('workerPercent')} radius={[4, 4, 0, 0]}>
                        {distributionData.map((entry, i) => (
                          <Cell key={i} fill={entry.isYou ? '#3b82f6' : (isDark ? '#4b5563' : '#d1d5db')} />
                        ))}
                      </Bar>
                      {result && (
                        <ReferenceLine x={distributionData.find(d => d.isYou)?.label} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">{t('chartNote')}</p>
              </div>

              {/* Data contribution */}
              {showContribute && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-200">{t('contributeTitle')}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{t('contributeDesc')}</p>
                    </div>
                    {contributed ? (
                      <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                        <Check className="w-4 h-4" /> {t('contributed')}
                      </span>
                    ) : submitStatus === 'already' ? (
                      <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 font-medium">
                        <AlertCircle className="w-4 h-4" /> {t('contributeAlready')}
                      </span>
                    ) : (
                      <button onClick={handleContribute} disabled={submitStatus === 'loading'}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5">
                        {submitStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('contributeBtn')}
                      </button>
                    )}
                  </div>
                  {submitStatus === 'error' && (
                    <p className="text-xs text-red-500 mt-2">{t('contributeError')}</p>
                  )}
                </div>
              )}

              {/* Community Stats */}
              {communityStats && communityStats.totalCount >= 5 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" /> {t('community.title')}
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({t('community.realtime')})</span>
                  </h3>

                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-3 text-center">
                      <p className="text-xs text-indigo-600 dark:text-indigo-400">{t('community.participants')}</p>
                      <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{communityStats.totalCount.toLocaleString()}{t('community.people')}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400">{t('community.avgSalary')}</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatKRW(communityStats.avgSalary)}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 text-center">
                      <p className="text-xs text-purple-600 dark:text-purple-400">{t('community.medianSalary')}</p>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatKRW(communityStats.medianSalary)}</p>
                    </div>
                  </div>

                  {/* Community rank */}
                  {communityRank && communityRank.total > 0 && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-lg p-4 mb-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">{t('community.yourRank')}</p>
                        <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                          {t('top')} {Math.max(0.1, Math.round((100 - communityRank.percentile) * 10) / 10)}%
                        </p>
                      </div>
                      <div className="mt-2 h-2.5 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${communityRank.percentile}%` }} />
                      </div>
                      <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1.5">
                        {t('community.rankDesc', { below: communityRank.below.toLocaleString(), total: communityRank.total.toLocaleString() })}
                      </p>
                    </div>
                  )}

                  {/* Age group breakdown */}
                  {Object.keys(communityStats.byAge).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{t('community.byAge')}</p>
                      <div className="space-y-1.5">
                        {AGE_GROUPS.filter(ag => communityStats.byAge[ag]).map(ag => {
                          const d = communityStats.byAge[ag]
                          const maxAvg = Math.max(...Object.values(communityStats.byAge).map(v => v.avg))
                          return (
                            <div key={ag} className="flex items-center gap-2 text-xs">
                              <span className="w-10 text-gray-500 dark:text-gray-400 shrink-0">{t(`ages.${ag}`)}</span>
                              <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                                <div className="h-full bg-blue-400 dark:bg-blue-600 rounded flex items-center px-1.5 text-white font-medium transition-all"
                                  style={{ width: `${(d.avg / maxAvg) * 100}%`, minWidth: '2rem' }}>
                                  {formatKRW(d.avg)}
                                </div>
                              </div>
                              <span className="w-12 text-gray-400 dark:text-gray-500 text-right shrink-0">{d.count}{t('community.people')}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Industry breakdown */}
                  {Object.keys(communityStats.byIndustry).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{t('community.byIndustry')}</p>
                      <div className="space-y-1.5">
                        {INDUSTRIES.filter(ind => communityStats.byIndustry[ind]).map(ind => {
                          const d = communityStats.byIndustry[ind]
                          const maxAvg = Math.max(...Object.values(communityStats.byIndustry).map(v => v.avg))
                          return (
                            <div key={ind} className="flex items-center gap-2 text-xs">
                              <span className="w-16 text-gray-500 dark:text-gray-400 truncate shrink-0">{t(`industries.${ind}`)}</span>
                              <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                                <div className="h-full bg-green-400 dark:bg-green-600 rounded flex items-center px-1.5 text-white font-medium transition-all"
                                  style={{ width: `${(d.avg / maxAvg) * 100}%`, minWidth: '2rem' }}>
                                  {formatKRW(d.avg)}
                                </div>
                              </div>
                              <span className="w-12 text-gray-400 dark:text-gray-500 text-right shrink-0">{d.count}{t('community.people')}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {statsLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">{t('community.loading')}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-expanded={showGuide}>
          <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <BookOpen className="w-5 h-5" /> {t('guide.title')}
          </span>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 space-y-4">
            {(['howToRead', 'dataExplain', 'tips'] as const).map(section => (
              <div key={section}>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t(`guide.${section}.title`)}</h3>
                <ul className="space-y-1">
                  {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span><span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('faqTitle')}</h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <details key={i} className="group">
              <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {t(`faq.q${i}.question`)}
              </summary>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-blue-300 dark:border-blue-700">
                {t(`faq.q${i}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
