'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Flame, Copy, Check, BookOpen, Plus, Trash2 } from 'lucide-react'

// MET (Metabolic Equivalent of Task) values for common activities
// Source: Compendium of Physical Activities (2024)
interface Activity {
  id: string
  category: string
  met: number
}

const ACTIVITIES: Activity[] = [
  // 걷기
  { id: 'walkSlow', category: 'walking', met: 2.5 },
  { id: 'walkNormal', category: 'walking', met: 3.5 },
  { id: 'walkFast', category: 'walking', met: 5.0 },
  { id: 'walkUphill', category: 'walking', met: 6.0 },
  // 달리기
  { id: 'jogging', category: 'running', met: 7.0 },
  { id: 'runSlow', category: 'running', met: 8.3 },
  { id: 'runMedium', category: 'running', met: 9.8 },
  { id: 'runFast', category: 'running', met: 11.5 },
  { id: 'runSprint', category: 'running', met: 14.5 },
  // 자전거
  { id: 'bikeSlow', category: 'cycling', met: 4.0 },
  { id: 'bikeNormal', category: 'cycling', met: 6.8 },
  { id: 'bikeFast', category: 'cycling', met: 10.0 },
  { id: 'bikeStationary', category: 'cycling', met: 7.0 },
  // 수영
  { id: 'swimSlow', category: 'swimming', met: 5.8 },
  { id: 'swimMedium', category: 'swimming', met: 7.0 },
  { id: 'swimFast', category: 'swimming', met: 9.8 },
  // 구기/팀
  { id: 'basketball', category: 'sports', met: 6.5 },
  { id: 'soccer', category: 'sports', met: 7.0 },
  { id: 'tennis', category: 'sports', met: 7.3 },
  { id: 'badminton', category: 'sports', met: 5.5 },
  { id: 'tableTennis', category: 'sports', met: 4.0 },
  { id: 'volleyball', category: 'sports', met: 4.0 },
  { id: 'golf', category: 'sports', met: 3.5 },
  // 헬스/피트니스
  { id: 'weightLight', category: 'fitness', met: 3.5 },
  { id: 'weightModerate', category: 'fitness', met: 5.0 },
  { id: 'weightHeavy', category: 'fitness', met: 6.0 },
  { id: 'yoga', category: 'fitness', met: 3.0 },
  { id: 'pilates', category: 'fitness', met: 3.0 },
  { id: 'aerobics', category: 'fitness', met: 6.5 },
  { id: 'jumpRope', category: 'fitness', met: 11.0 },
  { id: 'stairClimber', category: 'fitness', met: 9.0 },
  { id: 'elliptical', category: 'fitness', met: 5.0 },
  // 일상/기타
  { id: 'hiking', category: 'outdoor', met: 6.0 },
  { id: 'mountainClimbing', category: 'outdoor', met: 8.0 },
  { id: 'skiing', category: 'outdoor', met: 7.0 },
  { id: 'cleaning', category: 'daily', met: 3.3 },
  { id: 'gardening', category: 'daily', met: 4.0 },
  { id: 'dancing', category: 'daily', met: 5.5 },
]

const CATEGORIES = ['walking', 'running', 'cycling', 'swimming', 'sports', 'fitness', 'outdoor', 'daily'] as const

interface ExerciseEntry {
  id: number
  activityId: string
  duration: number // minutes
}

let nextId = 1

export default function ExerciseCalorie() {
  const t = useTranslations('exerciseCalorie')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [weight, setWeight] = useState('70')
  const [entries, setEntries] = useState<ExerciseEntry[]>([
    { id: nextId++, activityId: 'walkNormal', duration: 30 },
  ])

  const addEntry = useCallback(() => {
    setEntries(prev => [...prev, { id: nextId++, activityId: 'walkNormal', duration: 30 }])
  }, [])

  const removeEntry = useCallback((id: number) => {
    setEntries(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev)
  }, [])

  const updateEntry = useCallback((id: number, field: 'activityId' | 'duration', value: string | number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }, [])

  const results = useMemo(() => {
    const w = parseFloat(weight) || 0
    if (w <= 0) return null

    const items = entries.map(entry => {
      const activity = ACTIVITIES.find(a => a.id === entry.activityId)
      if (!activity) return null
      // Calories = MET × weight(kg) × time(hours)
      const calories = Math.round(activity.met * w * (entry.duration / 60))
      return {
        ...entry,
        activityName: entry.activityId,
        met: activity.met,
        calories,
        category: activity.category,
      }
    }).filter(Boolean) as { id: number; activityId: string; duration: number; activityName: string; met: number; calories: number; category: string }[]

    const totalCalories = items.reduce((sum, i) => sum + i.calories, 0)
    const totalMinutes = items.reduce((sum, i) => sum + i.duration, 0)

    // 칼로리 환산
    const riceBowls = totalCalories / 300 // 밥 한공기 약 300kcal
    const fatGrams = totalCalories / 7.7   // 체지방 1g = 7.7kcal

    return { items, totalCalories, totalMinutes, riceBowls, fatGrams }
  }, [weight, entries])

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
    if (!results) return ''
    const lines = [
      `[운동 칼로리 계산 결과]`,
      `체중: ${weight}kg`,
      '',
    ]
    results.items.forEach(item => {
      lines.push(`${t(`activities.${item.activityName}`)}: ${item.duration}분 → ${item.calories}kcal`)
    })
    lines.push('')
    lines.push(`총 운동시간: ${results.totalMinutes}분`)
    lines.push(`총 소모 칼로리: ${results.totalCalories}kcal`)
    return lines.join('\n')
  }, [results, weight, t])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 입력 패널 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('inputTitle')}</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('weight')}</label>
              <div className="relative">
                <input
                  type="number"
                  min="20"
                  max="300"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>
              </div>
            </div>
          </div>

          {/* 운동 항목 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exercises')}</h2>
              <button
                onClick={addEntry}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('addExercise')}
              </button>
            </div>

            {entries.map((entry, idx) => (
              <div key={entry.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={t('removeExercise')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={entry.activityId}
                  onChange={e => updateEntry(entry.id, 'activityId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {CATEGORIES.map(cat => (
                    <optgroup key={cat} label={t(`categories.${cat}`)}>
                      {ACTIVITIES.filter(a => a.category === cat).map(a => (
                        <option key={a.id} value={a.id}>
                          {t(`activities.${a.id}`)} (MET {a.met})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('duration')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="600"
                      value={entry.duration}
                      onChange={e => updateEntry(entry.id, 'duration', parseInt(e.target.value, 10) || 0)}
                      className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('minutes')}</span>
                    <div className="flex gap-1 ml-auto">
                      {[15, 30, 60].map(m => (
                        <button
                          key={m}
                          onClick={() => updateEntry(entry.id, 'duration', m)}
                          className={`px-2 py-0.5 text-xs rounded ${entry.duration === m ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'} transition-colors`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-4">
          {results ? (
            <>
              {/* 총 결과 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('result')}</h2>
                  <button
                    onClick={() => copyToClipboard(buildSummary(), 'result')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {copiedId === 'result' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'result' ? t('copied') : t('copy')}
                  </button>
                </div>

                {/* 핵심 숫자 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">{t('totalCalories')}</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{results.totalCalories.toLocaleString()}</p>
                    <p className="text-xs text-orange-500">kcal</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t('totalTime')}</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{results.totalMinutes}</p>
                    <p className="text-xs text-blue-500">{t('minutes')}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('riceBowls')}</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{results.riceBowls.toFixed(1)}</p>
                    <p className="text-xs text-green-500">{t('bowls')}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{t('fatBurn')}</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{results.fatGrams.toFixed(0)}</p>
                    <p className="text-xs text-purple-500">g</p>
                  </div>
                </div>

                {/* 항목별 상세 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('breakdown')}</h3>
                  <div className="space-y-2">
                    {results.items.map((item) => {
                      const pct = results.totalCalories > 0 ? (item.calories / results.totalCalories) * 100 : 0
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-700 dark:text-gray-300 truncate">{t(`activities.${item.activityName}`)}</span>
                              <span className="text-gray-900 dark:text-white font-medium ml-2 shrink-0">{item.calories} kcal</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{item.duration}{t('minutes')} · MET {item.met} · {pct.toFixed(0)}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* MET 참고 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('metInfo')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('metDescription')}</p>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
              <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('inputPrompt')}</p>
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
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.formula.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.formula.items') as string[]).map((item, i) => (
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
