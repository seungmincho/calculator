'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Trash2, Download, RotateCcw, AlertTriangle, TrendingUp, Link, Check } from 'lucide-react'

interface BloodSugarRecord {
  id: string
  value: number
  timing: 'fasting' | 'beforeMeal' | 'afterMeal' | 'bedtime'
  date: string
  time: string
  note: string
  createdAt: number
}

type TimingType = BloodSugarRecord['timing']
type StatsPeriod = 7 | 30

interface Classification {
  labelKey: string
  color: string
  bg: string
  darkBg: string
}

function classifyBloodSugar(
  value: number,
  timing: TimingType
): Classification {
  const isAfterMeal = timing === 'afterMeal'

  if (value < 70) {
    return {
      labelKey: 'classLow',
      color: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-100',
      darkBg: 'dark:bg-red-900/30',
    }
  }

  if (isAfterMeal) {
    if (value < 140) {
      return {
        labelKey: 'classNormalAfterMeal',
        color: 'text-green-700 dark:text-green-400',
        bg: 'bg-green-100',
        darkBg: 'dark:bg-green-900/30',
      }
    }
    if (value < 200) {
      return {
        labelKey: 'classPreDiabetesAfterMeal',
        color: 'text-yellow-700 dark:text-yellow-400',
        bg: 'bg-yellow-100',
        darkBg: 'dark:bg-yellow-900/30',
      }
    }
    return {
      labelKey: 'classDiabetesAfterMeal',
      color: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-100',
      darkBg: 'dark:bg-red-900/30',
    }
  }

  // fasting / beforeMeal / bedtime
  if (value <= 99) {
    return {
      labelKey: 'classNormalFasting',
      color: 'text-green-700 dark:text-green-400',
      bg: 'bg-green-100',
      darkBg: 'dark:bg-green-900/30',
    }
  }
  if (value <= 125) {
    return {
      labelKey: 'classPreDiabetesFasting',
      color: 'text-yellow-700 dark:text-yellow-400',
      bg: 'bg-yellow-100',
      darkBg: 'dark:bg-yellow-900/30',
    }
  }
  return {
    labelKey: 'classDiabetesFasting',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/30',
  }
}

const STORAGE_KEY = 'bloodSugarRecords'
const TIMINGS: TimingType[] = ['fasting', 'beforeMeal', 'afterMeal', 'bedtime']

function loadRecords(): BloodSugarRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as BloodSugarRecord[]
  } catch {
    return []
  }
}

function saveRecords(records: BloodSugarRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // ignore storage errors
  }
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function nowTimeStr(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function BloodSugar() {
  const t = useTranslations('bloodSugar')
  const searchParams = useSearchParams()

  const [records, setRecords] = useState<BloodSugarRecord[]>([])
  const [valueInput, setValueInput] = useState(() => searchParams.get('value') ?? '')
  const [timing, setTiming] = useState<TimingType>(() => {
    const t_ = searchParams.get('timing')
    return (TIMINGS.includes(t_ as TimingType) ? t_ : 'fasting') as TimingType
  })
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState(nowTimeStr())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>(7)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    setRecords(loadRecords())
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (valueInput) url.searchParams.set('value', valueInput)
    else url.searchParams.delete('value')
    url.searchParams.set('timing', timing)
    window.history.replaceState({}, '', url)
  }, [valueInput, timing])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // ignore
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [])

  const handleSubmit = useCallback(() => {
    const num = parseFloat(valueInput)
    if (isNaN(num) || num <= 0 || num > 600) {
      setError('혈당 수치를 올바르게 입력하세요 (1~600 mg/dL)')
      return
    }
    if (!date) {
      setError('날짜를 입력하세요.')
      return
    }
    setError('')
    const record: BloodSugarRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      value: Math.round(num * 10) / 10,
      timing,
      date,
      time,
      note: note.trim(),
      createdAt: Date.now(),
    }
    setRecords(prev => {
      const next = [record, ...prev]
      saveRecords(next)
      return next
    })
    setValueInput('')
    setNote('')
  }, [valueInput, timing, date, time, note])

  const handleDelete = useCallback((id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id)
      saveRecords(next)
      return next
    })
  }, [])

  const handleClearAll = useCallback(() => {
    if (!window.confirm(t('clearConfirm'))) return
    setRecords([])
    saveRecords([])
  }, [t])

  const handleReset = useCallback(() => {
    setValueInput('')
    setTiming('fasting')
    setDate(todayStr())
    setTime(nowTimeStr())
    setNote('')
    setError('')
  }, [])

  const handleExportCsv = useCallback(() => {
    if (records.length === 0) return
    const headers = [
      t('colDate'),
      t('colValue'),
      t('colTiming'),
      t('colStatus'),
      t('colNote'),
    ]
    const rows = records.map(r => {
      const cls = classifyBloodSugar(r.value, r.timing)
      const timingLabel = t(`timing${r.timing.charAt(0).toUpperCase() + r.timing.slice(1)}` as Parameters<typeof t>[0])
      const statusLabel = t(cls.labelKey as Parameters<typeof t>[0])
      return [
        `"${r.date} ${r.time}"`,
        r.value,
        `"${timingLabel}"`,
        `"${statusLabel}"`,
        `"${r.note.replace(/"/g, '""')}"`,
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blood-sugar-${todayStr()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [records, t])

  const stats = useMemo(() => {
    const cutoff = Date.now() - statsPeriod * 24 * 60 * 60 * 1000
    const filtered = records.filter(r => r.createdAt >= cutoff)
    if (filtered.length === 0) return null
    const values = filtered.map(r => r.value)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    return {
      avg: Math.round(avg * 10) / 10,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    }
  }, [records, statsPeriod])

  const timingKey = useCallback((t_: TimingType) => {
    const map: Record<TimingType, string> = {
      fasting: 'timingFasting',
      beforeMeal: 'timingBeforeMeal',
      afterMeal: 'timingAfterMeal',
      bedtime: 'timingBedtime',
    }
    return map[t_]
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🩸</span> {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors shrink-0"
        >
          {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          {linkCopied ? '복사됨' : '링크 복사'}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">{t('disclaimer')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('addRecord')}</h2>

            {/* Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('value')}
              </label>
              <input
                type="number"
                min="1"
                max="600"
                step="0.1"
                value={valueInput}
                onChange={e => setValueInput(e.target.value)}
                placeholder={t('valuePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>

            {/* Timing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('timing')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIMINGS.map(t_ => (
                  <button
                    key={t_}
                    onClick={() => setTiming(t_)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timing === t_
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(timingKey(t_) as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('date')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('time')}
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('note')}
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t('notePlaceholder')}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg px-4 py-3 font-medium hover:from-red-700 hover:to-pink-700 transition-all"
              >
                {t('submit')}
              </button>
              <button
                onClick={handleReset}
                title={t('reset')}
                className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Statistics Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" />
                {t('statistics')}
              </h2>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-sm">
                <button
                  onClick={() => setStatsPeriod(7)}
                  className={`px-3 py-1 transition-colors ${
                    statsPeriod === 7
                      ? 'bg-red-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('statsPeriod7')}
                </button>
                <button
                  onClick={() => setStatsPeriod(30)}
                  className={`px-3 py-1 transition-colors ${
                    statsPeriod === 30
                      ? 'bg-red-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('statsPeriod30')}
                </button>
              </div>
            </div>

            {stats ? (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={t('statsAvg')} value={`${stats.avg}`} unit="mg/dL" color="text-blue-600 dark:text-blue-400" />
                <StatCard label={t('statsCount')} value={`${stats.count}`} unit="건" color="text-purple-600 dark:text-purple-400" />
                <StatCard label={t('statsMin')} value={`${stats.min}`} unit="mg/dL" color="text-green-600 dark:text-green-400" />
                <StatCard label={t('statsMax')} value={`${stats.max}`} unit="mg/dL" color="text-red-600 dark:text-red-400" />
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('statsNoData')}</p>
            )}
          </div>
        </div>

        {/* History Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('history')}</h2>
              <div className="flex gap-2">
                {records.length > 0 && (
                  <>
                    <button
                      onClick={handleExportCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {t('exportCsv')}
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('clearAll')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {records.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-12">{t('historyEmpty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{t('colDate')}</th>
                      <th className="text-right py-2 pr-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{t('colValue')}</th>
                      <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{t('colTiming')}</th>
                      <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{t('colStatus')}</th>
                      <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400">{t('colNote')}</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(record => {
                      const cls = classifyBloodSugar(record.value, record.timing)
                      return (
                        <tr
                          key={record.id}
                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {record.date}<br />
                            <span className="text-xs text-gray-400 dark:text-gray-500">{record.time}</span>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {record.value}
                          </td>
                          <td className="py-2.5 pr-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {t(timingKey(record.timing) as Parameters<typeof t>[0])}
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls.bg} ${cls.darkBg} ${cls.color}`}>
                              {t(cls.labelKey as Parameters<typeof t>[0])}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                            {record.note || '—'}
                          </td>
                          <td className="py-2.5">
                            <button
                              onClick={() => handleDelete(record.id)}
                              aria-label={t('deleteRecord')}
                              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('guideTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Fasting guide */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('guideFastingTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideFastingItems') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? 'bg-green-500' : i === 1 ? 'bg-yellow-500' : i === 2 ? 'bg-red-500' : 'bg-red-700'}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* After-meal guide */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('guideAfterMealTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideAfterMealItems') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? 'bg-green-500' : i === 1 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('guideTipsTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideTipsItems') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Color legend */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-3 text-sm">
            <LegendBadge label={t('classLow')} color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
            <LegendBadge label={t('classNormalFasting') + ' / ' + t('classNormalAfterMeal')} color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
            <LegendBadge label={t('classPreDiabetes')} color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" />
            <LegendBadge label={t('classDiabetes')} color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{unit}</p>
    </div>
  )
}

function LegendBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}
