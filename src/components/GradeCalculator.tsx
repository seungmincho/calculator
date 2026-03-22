'use client'

/**
 * GradeCalculator - 석차/등급 계산기
 * 번역 네임스페이스: gradeCalc
 *
 * 사용하는 번역 키:
 * - title, description
 * - input.score, input.scorePlaceholder
 * - input.rank, input.rankPlaceholder, input.rankHelp
 * - input.totalStudents, input.totalStudentsPlaceholder
 * - input.calculate, input.reset
 * - result.title, result.grade, result.percentile, result.rank
 * - result.topPercent, result.gradeUnit
 * - table.title, table.grade, table.cutoff, table.cumulative, table.ratio
 * - position.title, position.topLabel
 * - grades (array of 9 grade label strings)
 * - guide.title
 * - guide.gradeSystem.title, guide.gradeSystem.items (string[])
 * - guide.usage.title, guide.usage.items (string[])
 * - error.invalidRank, error.rankExceedsTotal, error.required
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calculator, RotateCcw, Award, BarChart3, BookOpen, Info } from 'lucide-react'

/** 9등급제 누적비율 상한 */
const GRADE_CUTOFFS = [4, 11, 23, 40, 60, 77, 89, 96, 100] as const

/** 각 등급의 비율 구간 */
const GRADE_RATIOS = [4, 7, 12, 17, 20, 17, 12, 7, 4] as const

interface GradeResult {
  grade: number
  percentile: number
  topPercent: number
  rank: number
  totalStudents: number
}

function calculateGrade(rank: number, totalStudents: number): GradeResult {
  const topPercent = (rank / totalStudents) * 100
  const percentile = ((totalStudents - rank) / totalStudents) * 100

  let grade = 9
  for (let i = 0; i < GRADE_CUTOFFS.length; i++) {
    if (topPercent <= GRADE_CUTOFFS[i]) {
      grade = i + 1
      break
    }
  }

  return { grade, percentile, topPercent, rank, totalStudents }
}

export default function GradeCalculator() {
  const t = useTranslations('gradeCalc')
  const router = useRouter()
  const searchParams = useSearchParams()

  const [score, setScore] = useState('')
  const [rank, setRank] = useState('')
  const [totalStudents, setTotalStudents] = useState('')
  const [result, setResult] = useState<GradeResult | null>(null)
  const [error, setError] = useState('')

  const updateURL = useCallback((newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    const scoreParam = searchParams.get('score')
    if (!scoreParam) return
    const rankParam = searchParams.get('rank')
    const totalParam = searchParams.get('total')
    if (scoreParam && /^\d+(\.\d+)?$/.test(scoreParam)) setScore(scoreParam)
    if (rankParam && /^\d+$/.test(rankParam)) setRank(rankParam)
    if (totalParam && /^\d+$/.test(totalParam)) setTotalStudents(totalParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (score || rank || totalStudents) {
      updateURL({ score, rank, total: totalStudents })
    }
  }, [score, rank, totalStudents, updateURL])

  const handleCalculate = useCallback(() => {
    setError('')
    const total = parseInt(totalStudents, 10)
    const rankNum = parseInt(rank, 10)

    if (!total || total <= 0) {
      setError(t('error.required'))
      return
    }
    if (!rankNum || rankNum <= 0) {
      setError(t('error.invalidRank'))
      return
    }
    if (rankNum > total) {
      setError(t('error.rankExceedsTotal'))
      return
    }

    setResult(calculateGrade(rankNum, total))
  }, [rank, totalStudents, t])

  const handleReset = useCallback(() => {
    setScore('')
    setRank('')
    setTotalStudents('')
    setResult(null)
    setError('')
  }, [])

  const gradeColors = useMemo(() => [
    'bg-blue-600', 'bg-blue-500', 'bg-cyan-500', 'bg-green-500',
    'bg-yellow-500', 'bg-orange-400', 'bg-orange-500', 'bg-red-400', 'bg-red-500',
  ], [])

  const gradeTextColors = useMemo(() => [
    'text-blue-600 dark:text-blue-400',
    'text-blue-500 dark:text-blue-300',
    'text-cyan-600 dark:text-cyan-400',
    'text-green-600 dark:text-green-400',
    'text-yellow-600 dark:text-yellow-400',
    'text-orange-500 dark:text-orange-300',
    'text-orange-600 dark:text-orange-400',
    'text-red-500 dark:text-red-300',
    'text-red-600 dark:text-red-400',
  ], [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCalculate()
    }
  }, [handleCalculate])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              {t('input.title')}
            </h2>

            {/* Score (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.score')}
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('input.scorePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Rank */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.rank')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('input.rankPlaceholder')}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                <Info className="w-3 h-3 inline mr-1" />
                {t('input.rankHelp')}
              </p>
            </div>

            {/* Total Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.totalStudents')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={totalStudents}
                onChange={(e) => setTotalStudents(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('input.totalStudentsPlaceholder')}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCalculate}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                {t('input.calculate')}
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 transition-colors"
                aria-label={t('input.reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Result card */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                {t('result.title')}
              </h2>

              {/* Big grade display */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold ${gradeColors[result.grade - 1]}`}>
                    {result.grade}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {t('result.gradeUnit')}
                  </span>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('result.percentile')}</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.percentile.toFixed(1)}%</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('result.topPercent')}</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{result.topPercent.toFixed(1)}%</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 text-center col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('result.rank')}</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {result.rank} / {result.totalStudents}
                    </p>
                  </div>
                </div>
              </div>

              {/* Position bar */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('position.title')}
                </h3>
                <div className="relative">
                  {/* Grade segments */}
                  <div className="flex rounded-lg overflow-hidden h-10">
                    {GRADE_RATIOS.map((ratio, i) => (
                      <div
                        key={i}
                        className={`${gradeColors[i]} flex items-center justify-center text-white text-xs font-medium transition-all`}
                        style={{ width: `${ratio}%` }}
                      >
                        {ratio >= 7 ? `${i + 1}` : ''}
                      </div>
                    ))}
                  </div>
                  {/* Current position indicator */}
                  <div
                    className="absolute top-0 h-10 flex items-center pointer-events-none"
                    style={{ left: `${Math.min(result.topPercent, 99.5)}%` }}
                  >
                    <div className="w-0.5 h-full bg-gray-900 dark:bg-white" />
                  </div>
                  <div
                    className="absolute -bottom-6 transform -translate-x-1/2"
                    style={{ left: `${Math.min(result.topPercent, 99.5)}%` }}
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white bg-yellow-300 dark:bg-yellow-500 px-1.5 py-0.5 rounded">
                      {t('position.topLabel', { percent: result.topPercent.toFixed(1) })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grade table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {t('table.title')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-400 font-medium">{t('table.grade')}</th>
                    <th className="py-2 px-3 text-center text-gray-600 dark:text-gray-400 font-medium">{t('table.ratio')}</th>
                    <th className="py-2 px-3 text-center text-gray-600 dark:text-gray-400 font-medium">{t('table.cumulative')}</th>
                    {result && (
                      <th className="py-2 px-3 text-center text-gray-600 dark:text-gray-400 font-medium">{t('table.cutoff')}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {GRADE_CUTOFFS.map((cutoff, i) => {
                    const isCurrentGrade = result?.grade === i + 1
                    const cutoffRank = result ? Math.round((cutoff / 100) * result.totalStudents) : null
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                          isCurrentGrade
                            ? 'bg-blue-50 dark:bg-blue-950 font-semibold'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 ${isCurrentGrade ? gradeTextColors[i] : 'text-gray-900 dark:text-white'}`}>
                            <span className={`w-3 h-3 rounded-full ${gradeColors[i]}`} />
                            {i + 1}{t('result.gradeUnit')}
                            {isCurrentGrade && <span className="text-xs">&#9664;</span>}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-700 dark:text-gray-300">
                          {GRADE_RATIOS[i]}%
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-700 dark:text-gray-300">
                          ~{cutoff}%
                        </td>
                        {result && (
                          <td className="py-2.5 px-3 text-center text-gray-700 dark:text-gray-300">
                            ~{cutoffRank}{t('table.person')}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.gradeSystem.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.gradeSystem.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.usage.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500 mt-0.5">&#8226;</span>
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
