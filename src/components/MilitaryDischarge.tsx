'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Calendar, TrendingUp, Star, Info } from 'lucide-react'

type Branch = 'army' | 'marines' | 'navy' | 'airForce' | 'socialService' | 'conscriptedPolice' | 'industrialTechnician' | 'researchAgent' | 'katusa'

const BRANCH_MONTHS: Record<Branch, number> = {
  army: 18,
  marines: 18,
  navy: 20,
  airForce: 21,
  socialService: 21,
  conscriptedPolice: 18,
  industrialTechnician: 23,
  researchAgent: 36,
  katusa: 18,
}

const ARMY_MILESTONES_MONTHS = [0, 3, 7, 13] // start months for each rank

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateShort(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

interface Result {
  dischargeDate: Date
  totalDays: number
  servedDays: number
  remainingDays: number
  progressPct: number
  isAlreadyDischarged: boolean
  daysSince: number
}

export default function MilitaryDischarge() {
  const t = useTranslations('militaryDischarge')

  const [enlistmentDate, setEnlistmentDate] = useState('')
  const [branch, setBranch] = useState<Branch>('army')
  const [earlyDays, setEarlyDays] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const branches: Branch[] = [
    'army', 'marines', 'navy', 'airForce',
    'socialService', 'conscriptedPolice',
    'industrialTechnician', 'researchAgent', 'katusa',
  ]

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')]

  const result: Result | null = useMemo(() => {
    if (!enlistmentDate) return null
    const enlist = new Date(enlistmentDate)
    enlist.setHours(0, 0, 0, 0)
    if (isNaN(enlist.getTime())) return null

    const months = BRANCH_MONTHS[branch]
    const discharge = addMonths(enlist, months)
    discharge.setDate(discharge.getDate() - 1) // inclusive of enlistment day
    const early = parseInt(earlyDays || '0', 10) || 0
    discharge.setDate(discharge.getDate() - early)

    const totalDays = diffDays(enlist, discharge) + 1
    const servedDays = Math.min(Math.max(diffDays(enlist, today) + 1, 0), totalDays)
    const remainingDays = Math.max(diffDays(today, discharge), 0)
    const progressPct = Math.min(Math.max((servedDays / totalDays) * 100, 0), 100)
    const isAlreadyDischarged = today > discharge
    const daysSince = isAlreadyDischarged ? diffDays(discharge, today) : 0

    return { dischargeDate: discharge, totalDays, servedDays, remainingDays, progressPct, isAlreadyDischarged, daysSince }
  }, [enlistmentDate, branch, earlyDays, today])

  const milestones = useMemo(() => {
    if (!enlistmentDate) return null
    const showMilestones = branch === 'army' || branch === 'marines' || branch === 'katusa'
    if (!showMilestones) return null

    const enlist = new Date(enlistmentDate)
    enlist.setHours(0, 0, 0, 0)

    const rankKeys = ['private', 'corporal', 'sergeant', 'staffSergeant'] as const
    return ARMY_MILESTONES_MONTHS.map((months, i) => {
      const date = addMonths(enlist, months)
      const isPast = today >= date
      const isCurrent = (() => {
        if (i === rankKeys.length - 1) return isPast
        const nextDate = addMonths(enlist, ARMY_MILESTONES_MONTHS[i + 1])
        return today >= date && today < nextDate
      })()
      return { rank: rankKeys[i], date, isPast, isCurrent }
    })
  }, [enlistmentDate, branch, today])

  const funFacts = useMemo(() => {
    if (!result) return null
    const served = result.servedDays
    const meals = Math.round(served * 3)
    const px = Math.round(served / 7)
    const sleeps = served
    return { meals, px, sleeps }
  }, [result])

  const ddayColor = useMemo(() => {
    if (!result) return 'text-gray-600 dark:text-gray-300'
    if (result.isAlreadyDischarged) return 'text-blue-600 dark:text-blue-400'
    if (result.remainingDays > 365) return 'text-red-600 dark:text-red-400'
    if (result.remainingDays > 180) return 'text-orange-500 dark:text-orange-400'
    return 'text-green-600 dark:text-green-400'
  }, [result])

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
    } catch {
      // ignore
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleCopyResult = useCallback(() => {
    if (!result) return
    const text = t('shareText')
      .replace('{date}', formatDateShort(result.dischargeDate))
      .replace('{dday}', String(result.remainingDays))
      .replace('{progress}', result.progressPct.toFixed(1))
    copyToClipboard(text, 'result')
  }, [result, t, copyToClipboard])

  const handleReset = () => {
    setEnlistmentDate('')
    setBranch('army')
    setEarlyDays('')
  }

  const isNearDischarge = result && !result.isAlreadyDischarged && result.remainingDays <= 30

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Celebration banners */}
      {result?.isAlreadyDischarged && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
          <p className="text-blue-700 dark:text-blue-300 font-bold text-lg">{t('celebrationMessage')}</p>
        </div>
      )}
      {isNearDischarge && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
          <p className="text-green-700 dark:text-green-300 font-bold text-lg">{t('nearDischargeMessage')}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            {/* Enlistment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('enlistmentDate')}
              </label>
              <input
                type="date"
                value={enlistmentDate}
                onChange={e => setEnlistmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('branch')}
              </label>
              <select
                value={branch}
                onChange={e => setBranch(e.target.value as Branch)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b} value={b}>
                    {t(b)} ({BRANCH_MONTHS[b]}개월)
                  </option>
                ))}
              </select>
            </div>

            {/* Early days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('earlyDays')}
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={earlyDays}
                onChange={e => setEarlyDays(e.target.value)}
                placeholder={t('earlyDaysPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400"
              />
            </div>

            {/* Reset button */}
            <button
              onClick={handleReset}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
            >
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Discharge date + D-Day */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Discharge date */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">{t('dischargeDate')}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatDate(result.dischargeDate)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {dayNames[result.dischargeDate.getDay()]}
                    </p>
                  </div>

                  {/* D-Day */}
                  <div className="text-center sm:text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('dday')}</p>
                    {result.isAlreadyDischarged ? (
                      <>
                        <p className={`text-4xl font-black ${ddayColor}`}>{t('alreadyDischarged')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {t('daysSince')} {result.daysSince}{t('daysUnit')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={`text-5xl font-black ${ddayColor}`}>D-{result.remainingDays}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('ddayLabel')}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('progressBar')}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{result.progressPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 rounded-full transition-all duration-700 bg-gradient-to-r from-green-400 to-emerald-600"
                      style={{ width: `${result.progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Copy result */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleCopyResult}
                    className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 transition-colors"
                  >
                    {copiedId === 'result' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'result' ? t('copied') : t('copyResult')}
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t('totalDays'), value: result.totalDays, unit: t('daysUnit') },
                  { label: t('servedDays'), value: result.servedDays, unit: t('daysUnit') },
                  { label: t('remainingDays'), value: result.remainingDays, unit: t('daysUnit') },
                  { label: t('progress'), value: result.progressPct.toFixed(1), unit: '%' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stat.value}<span className="text-sm font-normal ml-0.5">{stat.unit}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Milestones (army/marines/katusa) */}
              {milestones && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">{t('milestones')}</h2>
                    <span className="text-xs text-gray-400">({t('milestonesNote')})</span>
                  </div>
                  <div className="space-y-3">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          m.isPast
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${
                              m.isCurrent
                                ? 'text-blue-600 dark:text-blue-400'
                                : m.isPast
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {t(m.rank)}
                            </span>
                            {m.isCurrent && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                                {t('current')}
                              </span>
                            )}
                            {m.isPast && !m.isCurrent && (
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                                {t('completed')}
                              </span>
                            )}
                            {!m.isPast && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                                {t('upcoming')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(m.date)}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 ${
                          m.isPast
                            ? 'bg-green-500 border-green-500'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fun facts */}
              {funFacts && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">{t('funFacts')}</h2>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {t('meals').replace('{count}', funFacts.meals.toLocaleString())}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {t('pxVisits').replace('{count}', funFacts.px.toLocaleString())}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {t('sleeps').replace('{count}', funFacts.sleeps.toLocaleString())}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex flex-col items-center justify-center text-center">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('description')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guideTitle')}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <ul className="space-y-1">
              {(t.raw('guideItems') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guideCautionTitle')}</h3>
            <ul className="space-y-1">
              {(t.raw('guideCautionItems') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">!</span>
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
