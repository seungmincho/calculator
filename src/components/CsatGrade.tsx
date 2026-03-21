'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  GraduationCap,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BookOpen,
  RefreshCw,
  Award,
  TrendingUp,
} from 'lucide-react'

// ── Types ──

type SubjectKey =
  | 'korean'
  | 'mathCalc'
  | 'mathProb'
  | 'english'
  | 'koreanHistory'
  | 'socialStudies'
  | 'science'

interface GradeCutoff {
  grade: number
  rawCutoff: number
  standardScore?: number | null
  percentile?: number | null
}

interface SubjectData {
  key: SubjectKey
  labelKey: string
  detailKey: string
  maxScore: number
  isAbsolute: boolean
  cutoffs: GradeCutoff[]
}

// ── Cutoff Data (2025학년도 수능) ──

const SUBJECTS: SubjectData[] = [
  {
    key: 'korean',
    labelKey: 'subjects.korean',
    detailKey: 'subjectDetail.korean',
    maxScore: 100,
    isAbsolute: false,
    cutoffs: [
      { grade: 1, rawCutoff: 92, standardScore: 131, percentile: 96 },
      { grade: 2, rawCutoff: 85, standardScore: 124, percentile: 89 },
      { grade: 3, rawCutoff: 77, standardScore: 116, percentile: 77 },
      { grade: 4, rawCutoff: 68, standardScore: 107, percentile: 60 },
      { grade: 5, rawCutoff: 58, standardScore: 97, percentile: 40 },
      { grade: 6, rawCutoff: 47, standardScore: 86, percentile: 23 },
      { grade: 7, rawCutoff: 36, standardScore: 75, percentile: 11 },
      { grade: 8, rawCutoff: 27, standardScore: 66, percentile: 4 },
      { grade: 9, rawCutoff: 0, standardScore: null, percentile: 0 },
    ],
  },
  {
    key: 'mathCalc',
    labelKey: 'subjects.math',
    detailKey: 'subjectDetail.mathCalc',
    maxScore: 100,
    isAbsolute: false,
    cutoffs: [
      { grade: 1, rawCutoff: 92, standardScore: 135, percentile: 96 },
      { grade: 2, rawCutoff: 85, standardScore: 131, percentile: 90 },
      { grade: 3, rawCutoff: 76, standardScore: 123, percentile: 77 },
      { grade: 4, rawCutoff: 64, standardScore: 112, percentile: 60 },
      { grade: 5, rawCutoff: 48, standardScore: 96, percentile: 40 },
      { grade: 6, rawCutoff: 32, standardScore: 80, percentile: 23 },
      { grade: 7, rawCutoff: 20, standardScore: 68, percentile: 11 },
      { grade: 8, rawCutoff: 12, standardScore: 60, percentile: 4 },
      { grade: 9, rawCutoff: 0, standardScore: null, percentile: 0 },
    ],
  },
  {
    key: 'mathProb',
    labelKey: 'subjects.math',
    detailKey: 'subjectDetail.mathProb',
    maxScore: 100,
    isAbsolute: false,
    cutoffs: [
      { grade: 1, rawCutoff: 88, standardScore: 130, percentile: 95 },
      { grade: 2, rawCutoff: 80, standardScore: 124, percentile: 88 },
      { grade: 3, rawCutoff: 68, standardScore: 114, percentile: 76 },
      { grade: 4, rawCutoff: 52, standardScore: 100, percentile: 58 },
      { grade: 5, rawCutoff: 36, standardScore: 86, percentile: 39 },
      { grade: 6, rawCutoff: 24, standardScore: 74, percentile: 22 },
      { grade: 7, rawCutoff: 16, standardScore: 66, percentile: 10 },
      { grade: 8, rawCutoff: 8, standardScore: 58, percentile: 4 },
      { grade: 9, rawCutoff: 0, standardScore: null, percentile: 0 },
    ],
  },
  {
    key: 'english',
    labelKey: 'subjects.english',
    detailKey: 'subjectDetail.english',
    maxScore: 100,
    isAbsolute: true,
    cutoffs: [
      { grade: 1, rawCutoff: 90 },
      { grade: 2, rawCutoff: 80 },
      { grade: 3, rawCutoff: 70 },
      { grade: 4, rawCutoff: 60 },
      { grade: 5, rawCutoff: 50 },
      { grade: 6, rawCutoff: 40 },
      { grade: 7, rawCutoff: 30 },
      { grade: 8, rawCutoff: 20 },
      { grade: 9, rawCutoff: 0 },
    ],
  },
  {
    key: 'koreanHistory',
    labelKey: 'subjects.koreanHistory',
    detailKey: 'subjectDetail.koreanHistory',
    maxScore: 50,
    isAbsolute: true,
    cutoffs: [
      { grade: 1, rawCutoff: 40 },
      { grade: 2, rawCutoff: 35 },
      { grade: 3, rawCutoff: 30 },
      { grade: 4, rawCutoff: 25 },
      { grade: 5, rawCutoff: 20 },
      { grade: 6, rawCutoff: 15 },
      { grade: 7, rawCutoff: 10 },
      { grade: 8, rawCutoff: 5 },
      { grade: 9, rawCutoff: 0 },
    ],
  },
  {
    key: 'socialStudies',
    labelKey: 'subjects.socialStudies',
    detailKey: 'subjectDetail.socialStudies',
    maxScore: 50,
    isAbsolute: false,
    cutoffs: [
      { grade: 1, rawCutoff: 47 },
      { grade: 2, rawCutoff: 44 },
      { grade: 3, rawCutoff: 40 },
      { grade: 4, rawCutoff: 35 },
      { grade: 5, rawCutoff: 29 },
      { grade: 6, rawCutoff: 23 },
      { grade: 7, rawCutoff: 17 },
      { grade: 8, rawCutoff: 11 },
      { grade: 9, rawCutoff: 0 },
    ],
  },
  {
    key: 'science',
    labelKey: 'subjects.science',
    detailKey: 'subjectDetail.science',
    maxScore: 50,
    isAbsolute: false,
    cutoffs: [
      { grade: 1, rawCutoff: 46 },
      { grade: 2, rawCutoff: 42 },
      { grade: 3, rawCutoff: 38 },
      { grade: 4, rawCutoff: 33 },
      { grade: 5, rawCutoff: 27 },
      { grade: 6, rawCutoff: 21 },
      { grade: 7, rawCutoff: 15 },
      { grade: 8, rawCutoff: 9 },
      { grade: 9, rawCutoff: 0 },
    ],
  },
]

// ── Helpers ──

function getGrade(subject: SubjectData, score: number): number {
  for (const c of subject.cutoffs) {
    if (score >= c.rawCutoff) return c.grade
  }
  return 9
}

function getGradeColor(grade: number): string {
  switch (grade) {
    case 1:
      return 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200'
    case 2:
      return 'bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500 text-gray-800 dark:text-gray-200'
    case 3:
      return 'bg-orange-100 dark:bg-orange-900/40 border-orange-400 dark:border-orange-600 text-orange-800 dark:text-orange-200'
    case 4:
    case 5:
      return 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
    case 6:
    case 7:
      return 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
    default:
      return 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
  }
}

function getGradeCircleColor(grade: number): string {
  switch (grade) {
    case 1:
      return 'from-yellow-400 to-yellow-600'
    case 2:
      return 'from-gray-300 to-gray-500'
    case 3:
      return 'from-orange-400 to-orange-600'
    case 4:
    case 5:
      return 'from-blue-400 to-blue-600'
    case 6:
    case 7:
      return 'from-green-400 to-green-600'
    default:
      return 'from-red-400 to-red-600'
  }
}

function getRowHighlight(grade: number): string {
  switch (grade) {
    case 1:
      return 'bg-yellow-50 dark:bg-yellow-900/20'
    case 2:
      return 'bg-gray-50 dark:bg-gray-700/30'
    case 3:
      return 'bg-orange-50 dark:bg-orange-900/20'
    case 4:
    case 5:
      return 'bg-blue-50 dark:bg-blue-900/20'
    case 6:
    case 7:
      return 'bg-green-50 dark:bg-green-900/20'
    default:
      return 'bg-red-50 dark:bg-red-900/20'
  }
}

// ── Component ──

export default function CsatGrade() {
  const t = useTranslations('csatGrade')

  const [subjectKey, setSubjectKey] = useState<SubjectKey>('korean')
  const [rawScore, setRawScore] = useState<string>('')
  const [result, setResult] = useState<{
    grade: number
    subject: SubjectData
    score: number
  } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const subject = useMemo(
    () => SUBJECTS.find((s) => s.key === subjectKey)!,
    [subjectKey]
  )

  // URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('subject')
    const sc = params.get('score')
    if (s && SUBJECTS.some((sub) => sub.key === s)) {
      setSubjectKey(s as SubjectKey)
      if (sc) {
        const num = parseInt(sc, 10)
        const sub = SUBJECTS.find((sub) => sub.key === s)!
        if (!isNaN(num) && num >= 0 && num <= sub.maxScore) {
          setRawScore(sc)
          setResult({ grade: getGrade(sub, num), subject: sub, score: num })
        }
      }
    }
  }, [])

  const updateURL = useCallback((subj: string, score: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('subject', subj)
    if (score) url.searchParams.set('score', score)
    else url.searchParams.delete('score')
    window.history.replaceState({}, '', url)
  }, [])

  const handleCalculate = useCallback(() => {
    const score = parseInt(rawScore, 10)
    if (isNaN(score) || score < 0 || score > subject.maxScore) return
    const grade = getGrade(subject, score)
    setResult({ grade, subject, score })
    updateURL(subjectKey, rawScore)
  }, [rawScore, subject, subjectKey, updateURL])

  const handleReset = useCallback(() => {
    setRawScore('')
    setResult(null)
    setShowTable(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('subject')
    url.searchParams.delete('score')
    window.history.replaceState({}, '', url)
  }, [])

  const handleSubjectChange = useCallback(
    (key: SubjectKey) => {
      setSubjectKey(key)
      setResult(null)
      setRawScore('')
      updateURL(key, '')
    },
    [updateURL]
  )

  const copyLink = useCallback(async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('subject', subjectKey)
    if (rawScore) url.searchParams.set('score', rawScore)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString())
      } else {
        const ta = document.createElement('textarea')
        ta.value = url.toString()
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }, [subjectKey, rawScore])

  const matchedCutoff = useMemo(() => {
    if (!result) return null
    return result.subject.cutoffs.find((c) => c.grade === result.grade) ?? null
  }, [result])

  const scoreBarSegments = useMemo(() => {
    const cutoffs = subject.cutoffs
    const segments: { grade: number; from: number; to: number }[] = []
    for (let i = 0; i < cutoffs.length; i++) {
      const from = cutoffs[i].rawCutoff
      const to = i === 0 ? subject.maxScore : cutoffs[i - 1].rawCutoff - 1
      segments.push({ grade: cutoffs[i].grade, from, to })
    }
    return segments.reverse()
  }, [subject])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg text-white">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              {t('subject')}
            </h2>

            {/* Year badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-sm font-medium text-blue-700 dark:text-blue-300">
              <GraduationCap className="w-4 h-4" />
              {t('year')}
            </div>

            {/* Subject select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('subject')}
              </label>
              <select
                value={subjectKey}
                onChange={(e) =>
                  handleSubjectChange(e.target.value as SubjectKey)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {t(s.detailKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Raw score input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('rawScore')} ({t('maxScore')}: {subject.maxScore})
              </label>
              <input
                type="number"
                min={0}
                max={subject.maxScore}
                value={rawScore}
                onChange={(e) => setRawScore(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCalculate()
                }}
                placeholder={`0 ~ ${subject.maxScore}`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Absolute/relative badge */}
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  subject.isAbsolute
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                }`}
              >
                {subject.isAbsolute ? t('absoluteGrade') : t('relativeGrade')}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCalculate}
                disabled={!rawScore}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t('calculate')}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                title={t('reset')}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Copy link */}
            <button
              onClick={copyLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  {t('linkCopied')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {t('copyLinkButton')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Section */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Grade result card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  {t('result')}
                </h2>

                <div className="flex flex-col sm:flex-row items-center gap-8">
                  {/* Grade circle */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-32 h-32 rounded-full bg-gradient-to-br ${getGradeCircleColor(
                        result.grade
                      )} flex items-center justify-center shadow-lg`}
                    >
                      <div className="text-center text-white">
                        <div className="text-4xl font-bold">
                          {result.grade}
                        </div>
                        <div className="text-sm opacity-90">{t('grade')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getGradeColor(
                        result.grade
                      )}`}
                    >
                      <Award className="w-5 h-5" />
                      <span className="font-semibold text-lg">
                        {t('gradeResult', { grade: result.grade })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('yourScore')}
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.score}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                            {' '}
                            / {result.subject.maxScore}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('cutoff')}
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {matchedCutoff?.rawCutoff ?? 0}
                        </div>
                      </div>
                    </div>

                    {/* Standard score & percentile for relative subjects */}
                    {!result.subject.isAbsolute && matchedCutoff && (
                      <div className="grid grid-cols-2 gap-4">
                        {matchedCutoff.standardScore != null && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              {t('standardScore')}
                            </div>
                            <div className="text-xl font-bold text-blue-800 dark:text-blue-200">
                              {matchedCutoff.standardScore}
                            </div>
                          </div>
                        )}
                        {matchedCutoff.percentile != null && (
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                            <div className="text-xs text-indigo-600 dark:text-indigo-400">
                              {t('percentile')}
                            </div>
                            <div className="text-xl font-bold text-indigo-800 dark:text-indigo-200">
                              {matchedCutoff.percentile}%
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Absolute badge */}
                    {result.subject.isAbsolute && (
                      <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        {t('absoluteGrade')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score bar visualization */}
                <div className="mt-8">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('gradeRange')}
                  </div>
                  <div className="relative w-full h-8 rounded-lg overflow-hidden flex">
                    {scoreBarSegments.map((seg) => {
                      const width =
                        ((seg.to - seg.from + 1) / (subject.maxScore + 1)) * 100
                      const isActive = result.grade === seg.grade
                      return (
                        <div
                          key={seg.grade}
                          className={`relative h-full flex items-center justify-center text-xs font-bold transition-all ${
                            isActive
                              ? 'ring-2 ring-blue-500 ring-offset-1 z-10'
                              : 'opacity-70'
                          }`}
                          style={{
                            width: `${width}%`,
                            backgroundColor: getSegmentBg(seg.grade),
                          }}
                          title={`${seg.grade}${t('grade')}: ${seg.from}~${seg.to}`}
                        >
                          <span className="text-white drop-shadow-sm">
                            {seg.grade}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {/* Score marker */}
                  <div className="relative w-full h-3 mt-1">
                    <div
                      className="absolute top-0 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-blue-600 dark:border-t-blue-400 transition-all"
                      style={{
                        left: `${(result.score / subject.maxScore) * 100}%`,
                        transform: 'translateX(-6px)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <GraduationCap className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('description')}
              </p>
            </div>
          )}

          {/* Grade cutoff table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <button
              onClick={() => setShowTable(!showTable)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                {t('gradeTable')} — {t(subject.detailKey)}
              </h2>
              {showTable ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {showTable && (
              <div className="px-6 pb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-400 font-medium">
                          {t('grade')}
                        </th>
                        <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-400 font-medium">
                          {t('cutoff')}
                        </th>
                        {!subject.isAbsolute &&
                          subject.cutoffs[0]?.standardScore != null && (
                            <>
                              <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-400 font-medium">
                                {t('standardScore')}
                              </th>
                              <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-400 font-medium">
                                {t('percentile')}
                              </th>
                            </>
                          )}
                        <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-400 font-medium">
                          {t('gradeRange')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {subject.cutoffs.map((c, i) => {
                        const upper =
                          i === 0
                            ? subject.maxScore
                            : subject.cutoffs[i - 1].rawCutoff - 1
                        const isHighlighted =
                          result && result.grade === c.grade
                        return (
                          <tr
                            key={c.grade}
                            className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                              isHighlighted
                                ? getRowHighlight(c.grade)
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white bg-gradient-to-br ${getGradeCircleColor(
                                  c.grade
                                )}`}
                              >
                                {c.grade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                              {c.rawCutoff}
                            </td>
                            {!subject.isAbsolute &&
                              subject.cutoffs[0]?.standardScore != null && (
                                <>
                                  <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                                    {c.standardScore ?? '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                                    {c.percentile != null
                                      ? `${c.percentile}%`
                                      : '-'}
                                  </td>
                                </>
                              )}
                            <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                              {c.rawCutoff} ~ {upper}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            {t('disclaimer')}
          </p>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {t('guide.title')}
          </h2>
          {showGuide ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showGuide && (
          <div className="px-6 pb-6 space-y-6">
            {/* Grading system */}
            <div>
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">
                {t('guide.grading.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.grading.items') as string[]).map(
                  (item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span className="text-blue-500 mt-0.5">•</span>
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">
                {t('guide.tips.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-indigo-500 mt-0.5">•</span>
                    {item}
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

// ── Score bar segment colors ──

function getSegmentBg(grade: number): string {
  const colors: Record<number, string> = {
    1: '#ca8a04',
    2: '#9ca3af',
    3: '#ea580c',
    4: '#3b82f6',
    5: '#60a5fa',
    6: '#22c55e',
    7: '#4ade80',
    8: '#ef4444',
    9: '#f87171',
  }
  return colors[grade] ?? '#9ca3af'
}
