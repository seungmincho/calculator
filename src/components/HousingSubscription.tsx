'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Info, RotateCcw, ChevronDown, ChevronUp, Link, Check } from 'lucide-react'

// ── Scoring tables ──────────────────────────────────────────────

function getHomelessScore(years: number, isUnder30Unmarried: boolean): number {
  if (isUnder30Unmarried) return 0
  if (years < 1) return 2
  if (years < 2) return 4
  if (years < 3) return 6
  if (years < 4) return 8
  if (years < 5) return 10
  if (years < 6) return 12
  if (years < 7) return 14
  if (years < 8) return 16
  if (years < 9) return 18
  if (years < 10) return 20
  if (years < 11) return 22
  if (years < 12) return 24
  if (years < 13) return 26
  if (years < 14) return 28
  if (years < 15) return 30
  return 32
}

function getDependentScore(count: number): number {
  const scores = [5, 10, 15, 20, 25, 30, 35]
  return scores[Math.min(count, 6)]
}

function getSubscriptionScore(months: number): number {
  if (months < 6) return 1
  if (months < 12) return 2
  if (months < 24) return 3
  if (months < 36) return 4
  if (months < 48) return 5
  if (months < 60) return 6
  if (months < 72) return 7
  if (months < 84) return 8
  if (months < 96) return 9
  if (months < 108) return 10
  if (months < 120) return 11
  if (months < 132) return 12
  if (months < 144) return 13
  if (months < 156) return 14
  if (months < 168) return 15
  if (months < 180) return 16
  return 17
}

function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  )
}

function yearsBetween(start: Date, end: Date): number {
  const months = monthsBetween(start, end)
  return Math.max(0, months / 12)
}

function getAgeAtDate(birthDate: Date, refDate: Date): number {
  let age = refDate.getFullYear() - birthDate.getFullYear()
  const m = refDate.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && refDate.getDate() < birthDate.getDate())) age--
  return age
}

// ── Rough percentile estimate (simplified) ──
function estimatePercentile(score: number): string {
  if (score >= 74) return '5'
  if (score >= 68) return '10'
  if (score >= 62) return '20'
  if (score >= 55) return '30'
  if (score >= 48) return '40'
  if (score >= 42) return '50'
  if (score >= 35) return '60'
  return '70'
}

// ── Donut chart ──────────────────────────────────────────────────

function DonutChart({ score, max }: { score: number; max: number }) {
  const radius = 70
  const stroke = 14
  const normalizedRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const pct = Math.min(score / max, 1)
  const offset = circumference - pct * circumference

  let color = '#3b82f6' // blue
  if (score >= 60) color = '#10b981' // green
  else if (score >= 45) color = '#f59e0b' // amber

  return (
    <svg width={radius * 2} height={radius * 2} className="transform -rotate-90">
      <circle
        cx={radius}
        cy={radius}
        r={normalizedRadius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={stroke}
        className="dark:stroke-gray-700"
      />
      <circle
        cx={radius}
        cy={radius}
        r={normalizedRadius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

// ── Score bar ────────────────────────────────────────────────────

function ScoreBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = max > 0 ? (score / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {score} <span className="text-gray-400 dark:text-gray-500 font-normal">/ {max}</span>
        </span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Tooltip ──────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-gray-400 hover:text-blue-500 focus:outline-none"
        aria-label="정보"
      >
        <Info size={14} />
      </button>
      {show && (
        <span className="absolute z-20 left-6 top-0 w-56 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-2 shadow-lg whitespace-normal">
          {text}
        </span>
      )}
    </span>
  )
}

// ── Input helpers ────────────────────────────────────────────────

interface LabelProps {
  label: string
  tooltip?: string
  children: React.ReactNode
}
function FormRow({ label, tooltip, children }: LabelProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      {children}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────

type InputMode = 'date' | 'direct'

export default function HousingSubscription() {
  const t = useTranslations('housingSubscription')
  const searchParams = useSearchParams()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // ── Homeless period ──────────────────────────────────────────
  const [homelessMode, setHomelessMode] = useState<InputMode>('date')
  const [homelessStartDate, setHomelessStartDate] = useState('')
  const [homelessYearsDirect, setHomelessYearsDirect] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [isMarried, setIsMarried] = useState(false)

  // ── Dependents ───────────────────────────────────────────────
  const [dependentCount, setDependentCount] = useState(0)

  // ── Subscription account ─────────────────────────────────────
  const [subMode, setSubMode] = useState<InputMode>('date')
  const [subStartDate, setSubStartDate] = useState('')
  const [subMonthsDirect, setSubMonthsDirect] = useState('')

  // ── Guide accordion ──────────────────────────────────────────
  const [guideOpen, setGuideOpen] = useState(false)

  // URL param sync - read on mount
  useEffect(() => {
    const dep = searchParams.get('dependents')
    const married = searchParams.get('married')
    const hYears = searchParams.get('homelessYears')
    const subMonths = searchParams.get('subMonths')
    if (dep) setDependentCount(Number(dep))
    if (married === 'true') setIsMarried(true)
    if (hYears) { setHomelessMode('direct'); setHomelessYearsDirect(hYears) }
    if (subMonths) { setSubMode('direct'); setSubMonthsDirect(subMonths) }
  }, [])

  // URL param sync - write on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    params.set('dependents', String(dependentCount))
    if (isMarried) params.set('married', 'true')
    if (homelessMode === 'direct' && homelessYearsDirect) params.set('homelessYears', homelessYearsDirect)
    if (subMode === 'direct' && subMonthsDirect) params.set('subMonths', subMonthsDirect)
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
  }, [dependentCount, isMarried, homelessMode, homelessYearsDirect, subMode, subMonthsDirect])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch { /* */ }
    setCopiedId('link')
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // ── Derived calculations ─────────────────────────────────────
  const { homelessYears } = useMemo(() => {
    if (homelessMode === 'direct') {
      const y = parseFloat(homelessYearsDirect) || 0
      return { homelessYears: y, homelessMonths: y * 12 }
    }
    if (!homelessStartDate) return { homelessYears: 0, homelessMonths: 0 }
    const start = new Date(homelessStartDate)
    const y = yearsBetween(start, today)
    return { homelessYears: y, homelessMonths: y * 12 }
  }, [homelessMode, homelessStartDate, homelessYearsDirect])

  const isUnder30Unmarried = useMemo(() => {
    if (isMarried) return false
    if (!birthDate) return true // default: assume under 30 if no birth date
    const birth = new Date(birthDate)
    const age = getAgeAtDate(birth, today)
    return age < 30
  }, [birthDate, isMarried])

  const subMonths = useMemo(() => {
    if (subMode === 'direct') {
      return parseFloat(subMonthsDirect) * (subMonthsDirect.includes('.') ? 12 : 1) || 0
      // allow months as integer directly
    }
    if (!subStartDate) return 0
    const start = new Date(subStartDate)
    return Math.max(0, monthsBetween(start, today))
  }, [subMode, subStartDate, subMonthsDirect])

  // Re-compute subMonths cleanly for direct mode (user enters months)
  const subMonthsFinal = useMemo(() => {
    if (subMode === 'direct') return Math.max(0, Math.floor(parseFloat(subMonthsDirect) || 0))
    return Math.max(0, subMonths)
  }, [subMode, subMonthsDirect, subMonths])

  const scoreA = useMemo(() => getHomelessScore(homelessYears, isUnder30Unmarried), [homelessYears, isUnder30Unmarried])
  const scoreB = useMemo(() => getDependentScore(dependentCount), [dependentCount])
  const scoreC = useMemo(() => getSubscriptionScore(subMonthsFinal), [subMonthsFinal])
  const totalScore = scoreA + scoreB + scoreC

  const percentile = estimatePercentile(totalScore)

  const reset = useCallback(() => {
    setHomelessMode('date')
    setHomelessStartDate('')
    setHomelessYearsDirect('')
    setBirthDate('')
    setIsMarried(false)
    setDependentCount(0)
    setSubMode('date')
    setSubStartDate('')
    setSubMonthsDirect('')
  }, [])

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm'
  const modeBtn = (active: boolean) =>
    `px-3 py-1 text-xs rounded-md font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            title="링크 복사"
          >
            {copiedId === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedId === 'link' ? '복사됨' : '링크 복사'}</span>
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            aria-label={t('reset')}
          >
            <RotateCcw size={14} />
            {t('reset')}
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Input panel ──────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">

          {/* A. 무주택기간 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold">A</span>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{t('sectionA')}</h2>
              <span className="ml-auto text-xs text-gray-400">{t('maxA')}</span>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button className={modeBtn(homelessMode === 'date')} onClick={() => setHomelessMode('date')}>{t('dateMode')}</button>
              <button className={modeBtn(homelessMode === 'direct')} onClick={() => setHomelessMode('direct')}>{t('directMode')}</button>
            </div>

            {homelessMode === 'date' ? (
              <FormRow label={t('homelessStartLabel')} tooltip={t('homelessStartTooltip')}>
                <input type="date" value={homelessStartDate} max={todayStr}
                  onChange={e => setHomelessStartDate(e.target.value)} className={inputClass} />
              </FormRow>
            ) : (
              <FormRow label={t('homelessYearsLabel')} tooltip={t('homelessYearsTooltip')}>
                <div className="flex items-center gap-2">
                  <input type="number" value={homelessYearsDirect} min="0" max="30" step="0.5"
                    onChange={e => setHomelessYearsDirect(e.target.value)}
                    className={inputClass} placeholder="0" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('yearsUnit')}</span>
                </div>
              </FormRow>
            )}

            <FormRow label={t('birthDateLabel')} tooltip={t('birthDateTooltip')}>
              <input type="date" value={birthDate} max={todayStr}
                onChange={e => setBirthDate(e.target.value)} className={inputClass} />
            </FormRow>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={isMarried} onChange={e => setIsMarried(e.target.checked)}
                className="accent-blue-600" />
              {t('marriedLabel')}
              <Tooltip text={t('marriedTooltip')} />
            </label>

            {isUnder30Unmarried && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded-lg p-2">
                {t('under30Notice')}
              </p>
            )}
          </div>

          {/* B. 부양가족 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold">B</span>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{t('sectionB')}</h2>
              <span className="ml-auto text-xs text-gray-400">{t('maxB')}</span>
            </div>

            <FormRow label={t('dependentLabel')} tooltip={t('dependentTooltip')}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDependentCount(c => Math.max(0, c - 1))}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center"
                >-</button>
                <span className="text-xl font-bold text-gray-900 dark:text-white w-8 text-center">{dependentCount}</span>
                <button
                  type="button"
                  onClick={() => setDependentCount(c => Math.min(6, c + 1))}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center"
                >+</button>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('personUnit')}</span>
              </div>
            </FormRow>

            <p className="text-xs text-gray-500 dark:text-gray-400">{t('dependentNote')}</p>

            {/* Score preview for B */}
            <div className="flex justify-between items-center text-xs bg-emerald-50 dark:bg-emerald-950 rounded-lg px-3 py-2">
              <span className="text-emerald-700 dark:text-emerald-300">{t('expectedScore')}</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">{scoreB}점</span>
            </div>
          </div>

          {/* C. 청약통장 가입기간 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold">C</span>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{t('sectionC')}</h2>
              <span className="ml-auto text-xs text-gray-400">{t('maxC')}</span>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button className={modeBtn(subMode === 'date')} onClick={() => setSubMode('date')}>{t('dateMode')}</button>
              <button className={modeBtn(subMode === 'direct')} onClick={() => setSubMode('direct')}>{t('directMode')}</button>
            </div>

            {subMode === 'date' ? (
              <FormRow label={t('subStartLabel')} tooltip={t('subStartTooltip')}>
                <input type="date" value={subStartDate} max={todayStr}
                  onChange={e => setSubStartDate(e.target.value)} className={inputClass} />
              </FormRow>
            ) : (
              <FormRow label={t('subMonthsLabel')} tooltip={t('subMonthsTooltip')}>
                <div className="flex items-center gap-2">
                  <input type="number" value={subMonthsDirect} min="0" max="300" step="1"
                    onChange={e => setSubMonthsDirect(e.target.value)}
                    className={inputClass} placeholder="0" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('monthsUnit')}</span>
                </div>
              </FormRow>
            )}
          </div>
        </div>

        {/* ── Result panel ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Total score card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('resultTitle')}</h2>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Donut */}
              <div className="relative flex-shrink-0">
                <DonutChart score={totalScore} max={84} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{totalScore}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500">{t('outOf84')}</span>
                </div>
              </div>

              {/* Score bars */}
              <div className="flex-1 w-full space-y-4">
                <ScoreBar label={`A. ${t('sectionA')}`} score={scoreA} max={32} color="bg-blue-500" />
                <ScoreBar label={`B. ${t('sectionB')}`} score={scoreB} max={35} color="bg-emerald-500" />
                <ScoreBar label={`C. ${t('sectionC')}`} score={scoreC} max={17} color="bg-purple-500" />

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                  <span className="font-semibold text-gray-900 dark:text-white">{t('totalLabel')}</span>
                  <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{totalScore}점</span>
                </div>
              </div>
            </div>
          </div>

          {/* Percentile estimate */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5 flex gap-4 items-start">
            <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">{t('percentileTitle')}</p>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                {t('percentileDesc').replace('{score}', String(totalScore)).replace('{pct}', percentile)}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{t('percentileNote')}</p>
            </div>
          </div>

          {/* Score detail table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('detailTableTitle')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">{t('tableCategory')}</th>
                    <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">{t('tableMyValue')}</th>
                    <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">{t('tableMyScore')}</th>
                    <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">{t('tableMaxScore')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr>
                    <td className="py-2 text-gray-700 dark:text-gray-300">{t('sectionA')}</td>
                    <td className="py-2 text-center text-gray-900 dark:text-white">
                      {isUnder30Unmarried ? t('notApplicable') : `${homelessYears.toFixed(1)}${t('yearsUnit')}`}
                    </td>
                    <td className="py-2 text-center font-semibold text-blue-600 dark:text-blue-400">{scoreA}</td>
                    <td className="py-2 text-center text-gray-400">32</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700 dark:text-gray-300">{t('sectionB')}</td>
                    <td className="py-2 text-center text-gray-900 dark:text-white">{dependentCount}{t('personUnit')}{dependentCount >= 6 ? ' 이상' : ''}</td>
                    <td className="py-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">{scoreB}</td>
                    <td className="py-2 text-center text-gray-400">35</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700 dark:text-gray-300">{t('sectionC')}</td>
                    <td className="py-2 text-center text-gray-900 dark:text-white">{subMonthsFinal}{t('monthsUnit')}</td>
                    <td className="py-2 text-center font-semibold text-purple-600 dark:text-purple-400">{scoreC}</td>
                    <td className="py-2 text-center text-gray-400">17</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                    <td className="py-2 text-gray-900 dark:text-white">{t('totalLabel')}</td>
                    <td className="py-2"></td>
                    <td className="py-2 text-center text-blue-600 dark:text-blue-400 text-lg">{totalScore}</td>
                    <td className="py-2 text-center text-gray-500 dark:text-gray-400">84</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Guide accordion */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setGuideOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guideTitle')}</h2>
          {guideOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {guideOpen && (
          <div className="px-6 pb-6 grid md:grid-cols-2 gap-6">
            {/* A guide */}
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{t('guideATitle')}</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guideAItems') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2"><span className="text-blue-400 flex-shrink-0">•</span>{item}</li>
                ))}
              </ul>
            </div>

            {/* B guide */}
            <div className="space-y-2">
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">{t('guideBTitle')}</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guideBItems') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2"><span className="text-emerald-400 flex-shrink-0">•</span>{item}</li>
                ))}
              </ul>
            </div>

            {/* C guide */}
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-700 dark:text-purple-300 text-sm">{t('guideCTitle')}</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guideCItems') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2"><span className="text-purple-400 flex-shrink-0">•</span>{item}</li>
                ))}
              </ul>
            </div>

            {/* Cautions */}
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-700 dark:text-amber-300 text-sm">{t('guideCautionTitle')}</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guideCautionItems') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2"><span className="text-amber-400 flex-shrink-0">⚠</span>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
