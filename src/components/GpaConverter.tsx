'use client'

/**
 * GpaConverter — 학점 변환기
 * 번역 네임스페이스: gpaConverterCalc
 *
 * 사용하는 번역 키:
 * - title, description
 * - mode.label, mode.45to43, mode.43to45, mode.percentToGpa, mode.gpaToPercent
 * - input.label, input.placeholder, input.maxLabel
 * - result.title, result.converted, result.grade, result.percentRange, result.outOf
 * - result.empty, result.invalidRange
 * - table.title, table.grade, table.gpa45, table.gpa43, table.percent
 * - grades (array via t.raw): [{grade, gpa45, gpa43, percent}]
 * - guide.title, guide.sections (array via t.raw): [{title, items[]}]
 * - copyResult, copied
 */

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Copy, Check, ArrowRightLeft, BookOpen } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

type ConvertMode = '45to43' | '43to45' | 'percentToGpa' | 'gpaToPercent'

interface GradeRow {
  grade: string
  gpa45: string
  gpa43: string
  percent: string
}

interface GuideSection {
  title: string
  items: string[]
}

// 백분위 → 학점 매핑 테이블
const PERCENT_TO_GPA_45: { min: number; max: number; gpa: number; grade: string }[] = [
  { min: 95, max: 100, gpa: 4.5, grade: 'A+' },
  { min: 90, max: 94, gpa: 4.0, grade: 'A0' },
  { min: 85, max: 89, gpa: 3.5, grade: 'B+' },
  { min: 80, max: 84, gpa: 3.0, grade: 'B0' },
  { min: 75, max: 79, gpa: 2.5, grade: 'C+' },
  { min: 70, max: 74, gpa: 2.0, grade: 'C0' },
  { min: 65, max: 69, gpa: 1.5, grade: 'D+' },
  { min: 60, max: 64, gpa: 1.0, grade: 'D0' },
  { min: 0, max: 59, gpa: 0.0, grade: 'F' },
]

const PERCENT_TO_GPA_43: { min: number; max: number; gpa: number; grade: string }[] = [
  { min: 95, max: 100, gpa: 4.3, grade: 'A+' },
  { min: 90, max: 94, gpa: 4.0, grade: 'A0' },
  { min: 85, max: 89, gpa: 3.5, grade: 'B+' },
  { min: 80, max: 84, gpa: 3.0, grade: 'B0' },
  { min: 75, max: 79, gpa: 2.5, grade: 'C+' },
  { min: 70, max: 74, gpa: 2.0, grade: 'C0' },
  { min: 65, max: 69, gpa: 1.5, grade: 'D+' },
  { min: 60, max: 64, gpa: 1.0, grade: 'D0' },
  { min: 0, max: 59, gpa: 0.0, grade: 'F' },
]

// 학점 → 백분위 매핑 (4.5 만점 기준)
const GPA45_TO_PERCENT: { min: number; max: number; percentMin: number; percentMax: number; grade: string }[] = [
  { min: 4.5, max: 4.5, percentMin: 95, percentMax: 100, grade: 'A+' },
  { min: 4.0, max: 4.49, percentMin: 90, percentMax: 94, grade: 'A0' },
  { min: 3.5, max: 3.99, percentMin: 85, percentMax: 89, grade: 'B+' },
  { min: 3.0, max: 3.49, percentMin: 80, percentMax: 84, grade: 'B0' },
  { min: 2.5, max: 2.99, percentMin: 75, percentMax: 79, grade: 'C+' },
  { min: 2.0, max: 2.49, percentMin: 70, percentMax: 74, grade: 'C0' },
  { min: 1.5, max: 1.99, percentMin: 65, percentMax: 69, grade: 'D+' },
  { min: 1.0, max: 1.49, percentMin: 60, percentMax: 64, grade: 'D0' },
  { min: 0.0, max: 0.99, percentMin: 0, percentMax: 59, grade: 'F' },
]

// 학점 → 백분위 매핑 (4.3 만점 기준)
const GPA43_TO_PERCENT: { min: number; max: number; percentMin: number; percentMax: number; grade: string }[] = [
  { min: 4.3, max: 4.3, percentMin: 95, percentMax: 100, grade: 'A+' },
  { min: 4.0, max: 4.29, percentMin: 90, percentMax: 94, grade: 'A0' },
  { min: 3.5, max: 3.99, percentMin: 85, percentMax: 89, grade: 'B+' },
  { min: 3.0, max: 3.49, percentMin: 80, percentMax: 84, grade: 'B0' },
  { min: 2.5, max: 2.99, percentMin: 75, percentMax: 79, grade: 'C+' },
  { min: 2.0, max: 2.49, percentMin: 70, percentMax: 74, grade: 'C0' },
  { min: 1.5, max: 1.99, percentMin: 65, percentMax: 69, grade: 'D+' },
  { min: 1.0, max: 1.49, percentMin: 60, percentMax: 64, grade: 'D0' },
  { min: 0.0, max: 0.99, percentMin: 0, percentMax: 59, grade: 'F' },
]

function findGradeFromGpa(gpa: number, table: typeof GPA45_TO_PERCENT): { percentMin: number; percentMax: number; grade: string } | null {
  for (const row of table) {
    if (gpa >= row.min && gpa <= row.max) {
      return { percentMin: row.percentMin, percentMax: row.percentMax, grade: row.grade }
    }
  }
  return null
}

function findGpaFromPercent(percent: number, table: typeof PERCENT_TO_GPA_45): { gpa: number; grade: string } | null {
  for (const row of table) {
    if (percent >= row.min && percent <= row.max) {
      return { gpa: row.gpa, grade: row.grade }
    }
  }
  return null
}

export default function GpaConverter() {
  const t = useTranslations('gpaConverterCalc')
  const [mode, setMode] = useState<ConvertMode>('45to43')
  const [inputValue, setInputValue] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const maxGpa = useMemo(() => {
    if (mode === '45to43') return 4.5
    if (mode === '43to45') return 4.3
    if (mode === 'percentToGpa') return 100
    return 4.5 // gpaToPercent: 사용자가 4.5 또는 4.3 선택
  }, [mode])

  const [gpaToPercentBase, setGpaToPercentBase] = useState<'4.5' | '4.3'>('4.5')

  const result = useMemo(() => {
    const val = parseFloat(inputValue)
    if (isNaN(val) || val < 0) return null

    switch (mode) {
      case '45to43': {
        if (val > 4.5) return { error: 'invalidRange' as const }
        const converted = val * (4.3 / 4.5)
        const rounded = Math.round(converted * 100) / 100
        const gradeInfo = findGradeFromGpa(val, GPA45_TO_PERCENT)
        return {
          converted: rounded,
          outOf: 4.3,
          grade: gradeInfo?.grade ?? 'F',
          percentRange: gradeInfo ? `${gradeInfo.percentMin}~${gradeInfo.percentMax}` : '0~59',
        }
      }
      case '43to45': {
        if (val > 4.3) return { error: 'invalidRange' as const }
        const converted = val * (4.5 / 4.3)
        const rounded = Math.round(converted * 100) / 100
        const gradeInfo = findGradeFromGpa(val, GPA43_TO_PERCENT)
        return {
          converted: rounded,
          outOf: 4.5,
          grade: gradeInfo?.grade ?? 'F',
          percentRange: gradeInfo ? `${gradeInfo.percentMin}~${gradeInfo.percentMax}` : '0~59',
        }
      }
      case 'percentToGpa': {
        if (val > 100) return { error: 'invalidRange' as const }
        const result45 = findGpaFromPercent(val, PERCENT_TO_GPA_45)
        const result43 = findGpaFromPercent(val, PERCENT_TO_GPA_43)
        return {
          gpa45: result45?.gpa ?? 0,
          gpa43: result43?.gpa ?? 0,
          grade: result45?.grade ?? 'F',
          percentRange: `${val}`,
        }
      }
      case 'gpaToPercent': {
        const maxVal = gpaToPercentBase === '4.5' ? 4.5 : 4.3
        if (val > maxVal) return { error: 'invalidRange' as const }
        const table = gpaToPercentBase === '4.5' ? GPA45_TO_PERCENT : GPA43_TO_PERCENT
        const gradeInfo = findGradeFromGpa(val, table)
        return {
          percentMin: gradeInfo?.percentMin ?? 0,
          percentMax: gradeInfo?.percentMax ?? 59,
          grade: gradeInfo?.grade ?? 'F',
          outOf: maxVal,
        }
      }
    }
  }, [inputValue, mode, gpaToPercentBase])

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

  const grades = t.raw('grades') as GradeRow[]
  const guideSections = t.raw('guide.sections') as GuideSection[]

  const resultText = useMemo(() => {
    if (!result || 'error' in result) return ''
    if (mode === 'percentToGpa') {
      const r = result as { gpa45: number; gpa43: number; grade: string }
      return `${r.grade}: ${r.gpa45}/4.5, ${r.gpa43}/4.3`
    }
    if (mode === 'gpaToPercent') {
      const r = result as { percentMin: number; percentMax: number; grade: string }
      return `${r.grade}: ${r.percentMin}~${r.percentMax}%`
    }
    const r = result as { converted: number; outOf: number; grade: string }
    return `${r.converted}/${r.outOf} (${r.grade})`
  }, [result, mode])

  const modes: { key: ConvertMode; labelKey: string }[] = [
    { key: '45to43', labelKey: 'mode.45to43' },
    { key: '43to45', labelKey: 'mode.43to45' },
    { key: 'percentToGpa', labelKey: 'mode.percentToGpa' },
    { key: 'gpaToPercent', labelKey: 'mode.gpaToPercent' },
  ]

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* 좌: 입력 패널 */}
        <div className="lg:col-span-1">
          <div className="${glassCard} ${glassInset} p-6 space-y-5">
            {/* 모드 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('mode.label')}
              </label>
              <div className="space-y-2">
                {modes.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => { setMode(m.key); setInputValue('') }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      mode === m.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <ArrowRightLeft className="inline-block w-4 h-4 mr-2" />
                    {t(m.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* 학점→백분위 모드일 때 만점 기준 선택 */}
            {mode === 'gpaToPercent' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('input.maxLabel')}
                </label>
                <div className="flex gap-2">
                  {(['4.5', '4.3'] as const).map((base) => (
                    <button
                      key={base}
                      onClick={() => { setGpaToPercentBase(base); setInputValue('') }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        gpaToPercentBase === base
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {base} {t('result.outOf')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 입력 필드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('input.label')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={mode === 'gpaToPercent' ? (gpaToPercentBase === '4.5' ? 4.5 : 4.3) : maxGpa}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t('input.placeholder')}
                className="w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('input.maxLabel')}: {mode === 'gpaToPercent' ? gpaToPercentBase : maxGpa}
              </p>
            </div>
          </div>
        </div>

        {/* 우: 결과 + 참고표 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 변환 결과 */}
          <div className="${glassCard} ${glassInset} p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('result.title')}
            </h2>

            {!inputValue || !result ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('result.empty')}</p>
            ) : 'error' in result ? (
              <p className="text-red-500 text-sm">{t('result.invalidRange')}</p>
            ) : (
              <div className="space-y-4">
                {/* 4.5→4.3 or 4.3→4.5 */}
                {(mode === '45to43' || mode === '43to45') && (() => {
                  const r = result as { converted: number; outOf: number; grade: string; percentRange: string }
                  return (
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                          {r.converted}
                          <span className="text-lg font-normal text-gray-500 dark:text-gray-400"> / {r.outOf}</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {t('result.grade')}: <span className="font-semibold text-gray-900 dark:text-white">{r.grade}</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {t('result.percentRange')}: <span className="font-semibold">{r.percentRange}%</span>
                        </p>
                      </div>
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => copyToClipboard(resultText, 'result')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          {copiedId === 'result' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === 'result' ? t('copied') : t('copyResult')}
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* 백분위→학점 */}
                {mode === 'percentToGpa' && (() => {
                  const r = result as { gpa45: number; gpa43: number; grade: string }
                  return (
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
                      <div className="text-center space-y-3">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {t('result.grade')}: <span className="text-xl font-bold text-gray-900 dark:text-white">{r.grade}</span>
                        </p>
                        <div className="flex justify-center gap-8">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">4.5 {t('result.outOf')}</p>
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{r.gpa45}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">4.3 {t('result.outOf')}</p>
                            <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{r.gpa43}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => copyToClipboard(resultText, 'result')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          {copiedId === 'result' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === 'result' ? t('copied') : t('copyResult')}
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* 학점→백분위 */}
                {mode === 'gpaToPercent' && (() => {
                  const r = result as { percentMin: number; percentMax: number; grade: string }
                  return (
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
                      <div className="text-center space-y-3">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {t('result.grade')}: <span className="text-xl font-bold text-gray-900 dark:text-white">{r.grade}</span>
                        </p>
                        <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                          {r.percentMin}~{r.percentMax}
                          <span className="text-lg font-normal text-gray-500 dark:text-gray-400">%</span>
                        </p>
                      </div>
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => copyToClipboard(resultText, 'result')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          {copiedId === 'result' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === 'result' ? t('copied') : t('copyResult')}
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* 등급 참고표 */}
          <div className="${glassCard} ${glassInset} p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('table.title')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">{t('table.grade')}</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">{t('table.gpa45')}</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">{t('table.gpa43')}</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">{t('table.percent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">{row.grade}</td>
                      <td className="py-2 px-3 text-center text-gray-700 dark:text-gray-300">{row.gpa45}</td>
                      <td className="py-2 px-3 text-center text-gray-700 dark:text-gray-300">{row.gpa43}</td>
                      <td className="py-2 px-3 text-center text-gray-700 dark:text-gray-300">{row.percent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="${glassCard} ${glassInset} p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {guideSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{section.title}</h3>
              <ul className="space-y-1">
                {section.items.map((item, jdx) => (
                  <li key={jdx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
