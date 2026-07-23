'use client'

/**
 * GpaConverter — 학점 변환기 (4.5 / 4.3 / 4.0 / 백분율 동시 변환)
 * 번역 네임스페이스: gpaConverterCalc
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Copy, Check, BookOpen, Link as LinkIcon, Download, Calculator, Award, GraduationCap } from 'lucide-react'
import NextLink from 'next/link'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

type Scale = '4.5' | '4.3' | '4.0' | '100'

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

const SCALE_MAX: Record<Scale, number> = { '4.5': 4.5, '4.3': 4.3, '4.0': 4.0, '100': 100 }

// 학점(4.5 기준) → 등급 / 백분위 매핑
const GPA45_TO_PERCENT: { min: number; max: number; percentMin: number; percentMax: number; grade: string }[] = [
  { min: 4.25, max: 4.5, percentMin: 95, percentMax: 100, grade: 'A+' },
  { min: 3.75, max: 4.24, percentMin: 90, percentMax: 94, grade: 'A0' },
  { min: 3.25, max: 3.74, percentMin: 85, percentMax: 89, grade: 'B+' },
  { min: 2.75, max: 3.24, percentMin: 80, percentMax: 84, grade: 'B0' },
  { min: 2.25, max: 2.74, percentMin: 75, percentMax: 79, grade: 'C+' },
  { min: 1.75, max: 2.24, percentMin: 70, percentMax: 74, grade: 'C0' },
  { min: 1.25, max: 1.74, percentMin: 65, percentMax: 69, grade: 'D+' },
  { min: 0.75, max: 1.24, percentMin: 60, percentMax: 64, grade: 'D0' },
  { min: 0, max: 0.74, percentMin: 0, percentMax: 59, grade: 'F' },
]

// 백분위 → 학점(4.5 기준)
const PERCENT_TO_GPA45: { min: number; max: number; gpa: number; grade: string }[] = [
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

interface Converted {
  g45: number
  g43: number
  g40: number
  percentMin: number
  percentMax: number
  percentExact: number | null
  grade: string
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function convert(val: number, scale: Scale): Converted | null {
  if (isNaN(val) || val < 0 || val > SCALE_MAX[scale]) return null

  let g45: number
  let percentExact: number | null = null
  let gradeFromPercent: string | null = null

  if (scale === '100') {
    percentExact = val
    const band = PERCENT_TO_GPA45.find((r) => val >= r.min && val <= r.max)
    g45 = band ? band.gpa : 0
    gradeFromPercent = band ? band.grade : 'F'
  } else {
    g45 = val * (4.5 / SCALE_MAX[scale])
  }

  const band = GPA45_TO_PERCENT.find((r) => g45 >= r.min && g45 <= r.max) ?? GPA45_TO_PERCENT[GPA45_TO_PERCENT.length - 1]

  return {
    g45: scale === '4.5' ? val : round2(g45),
    g43: scale === '4.3' ? val : round2(g45 * (4.3 / 4.5)),
    g40: scale === '4.0' ? val : round2(g45 * (4.0 / 4.5)),
    percentMin: band.percentMin,
    percentMax: band.percentMax,
    percentExact,
    grade: gradeFromPercent ?? band.grade,
  }
}

export default function GpaConverter() {
  const t = useTranslations('gpaConverterCalc')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [scale, setScale] = useState<Scale>(() => {
    const s = searchParams.get('scale') as Scale
    return SCALE_MAX[s] ? s : '4.5'
  })
  const [inputValue, setInputValue] = useState(() => searchParams.get('v') ?? '')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('scale', scale)
    if (inputValue) params.set('v', inputValue)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [scale, inputValue, pathname, router])

  const result = useMemo(() => {
    if (!inputValue) return null
    const val = parseFloat(inputValue)
    if (isNaN(val)) return null
    if (val < 0 || val > SCALE_MAX[scale]) return 'invalid' as const
    return convert(val, scale)
  }, [inputValue, scale])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* silent */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const grades = t.raw('grades') as GradeRow[]
  const guideSections = t.raw('guide.sections') as GuideSection[]

  const percentText = (r: Converted) =>
    r.percentExact != null ? `${r.percentExact}%` : `${r.percentMin}~${r.percentMax}%`

  const resultText = useMemo(() => {
    if (!result || result === 'invalid') return ''
    return `4.5→${result.g45} / 4.3→${result.g43} / 4.0→${result.g40} / ${percentText(result)} (${result.grade})`
  }, [result])

  const saveAsImage = useCallback(() => {
    if (!result || result === 'invalid') return
    const W = 660, H = 420
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#1e293b')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#818cf8'; ctx.fillRect(0, 0, W, 8)
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 28px system-ui, sans-serif'
    ctx.fillText('🎓 ' + t('title'), 40, 40)
    ctx.fillStyle = '#94a3b8'; ctx.font = '16px system-ui, sans-serif'
    ctx.fillText(`${t('input.label')}: ${inputValue} (${t(`scales.${scaleKey(scale)}`)})`, 40, 82)

    const tiles: [string, string][] = [
      ['4.5', String(result.g45)],
      ['4.3', String(result.g43)],
      ['4.0*', String(result.g40)],
      [t('result.percent'), percentText(result)],
    ]
    const tw = (W - 80 - 30) / 4
    tiles.forEach(([label, val], i) => {
      const x = 40 + i * (tw + 10)
      ctx.fillStyle = 'rgba(129,140,248,0.12)'
      ctx.fillRect(x, 140, tw, 110)
      ctx.strokeStyle = 'rgba(129,140,248,0.4)'
      ctx.strokeRect(x, 140, tw, 110)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#94a3b8'; ctx.font = '14px system-ui, sans-serif'
      ctx.fillText(label, x + tw / 2, 158)
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 24px system-ui, sans-serif'
      ctx.fillText(val, x + tw / 2, 190)
    })
    ctx.textAlign = 'center'
    ctx.fillStyle = '#34d399'; ctx.font = 'bold 30px system-ui, sans-serif'
    ctx.fillText(`${t('result.grade')}  ${result.grade}`, W / 2, 290)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#64748b'; ctx.font = '13px system-ui, sans-serif'
    ctx.fillText('toolhub.ai.kr · ' + t('note40'), 40, H - 34)

    const link = document.createElement('a')
    link.download = `gpa-${inputValue}-${scale}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [result, inputValue, scale, t])

  const scales: Scale[] = ['4.5', '4.3', '4.0', '100']

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 좌: 입력 */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-5`}>
            {/* 만점 기준 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('scaleLabel')}</label>
              <div className="grid grid-cols-2 gap-2">
                {scales.map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      scale === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`scales.${scaleKey(s)}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 입력값 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('input.label')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={scale === '100' ? '1' : '0.01'}
                  min="0"
                  max={SCALE_MAX[scale]}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t('input.placeholder')}
                  className={`${glassInput} px-3 py-2`}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">/ {SCALE_MAX[scale]}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('input.help')}</p>
            </div>

            {/* 액션 */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => copyToClipboard(window.location.href, 'link')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                {copiedId === 'link' ? <><Check className="w-4 h-4" />{t('copyLinkDone')}</> : <><LinkIcon className="w-4 h-4" />{t('copyLink')}</>}
              </button>
              <button
                onClick={saveAsImage}
                disabled={!result || result === 'invalid'}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saved ? <><Check className="w-4 h-4" />{t('saveImageDone')}</> : <><Download className="w-4 h-4" />{t('saveImage')}</>}
              </button>
            </div>
          </div>
        </div>

        {/* 우: 결과 + 참고표 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 변환 결과 */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('result.title')}</h2>

            {!inputValue || !result ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('result.empty')}</p>
            ) : result === 'invalid' ? (
              <p className="text-red-500 text-sm">{t('result.invalidRange')}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { key: '4.5', label: t('scales.s45'), val: result.g45 },
                    { key: '4.3', label: t('scales.s43'), val: result.g43 },
                    { key: '4.0', label: t('scales.s40'), val: result.g40 },
                    { key: '100', label: t('result.percent'), val: percentText(result) },
                  ] as const).map((tile) => (
                    <div
                      key={tile.key}
                      className={`rounded-xl p-4 text-center ${scale === tile.key ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950'}`}
                    >
                      <p className={`text-xs ${scale === tile.key ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{tile.label}</p>
                      <p className={`text-2xl font-bold ${scale === tile.key ? 'text-white' : 'text-blue-700 dark:text-blue-300'}`}>{tile.val}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.grade')}</span>
                    <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-lg font-bold">{result.grade}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(resultText, 'result')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {copiedId === 'result' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === 'result' ? t('copied') : t('copyResult')}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t('note40')}</p>
              </>
            )}
          </div>

          {/* 등급 참고표 */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('table.title')}</h2>
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

          {/* 관련 도구 */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('crossLinks.title')}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <NextLink href="/gpa-calculator/" className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span>
                  <span className="block font-medium text-gray-900 dark:text-white">{t('crossLinks.calc.label')}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('crossLinks.calc.desc')}</span>
                </span>
              </NextLink>
              <NextLink href="/grade-calculator/" className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                <span>
                  <span className="block font-medium text-gray-900 dark:text-white">{t('crossLinks.grade.label')}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('crossLinks.grade.desc')}</span>
                </span>
              </NextLink>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {guideSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-500" />
                {section.title}
              </h3>
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

function scaleKey(s: Scale): string {
  return s === '4.5' ? 's45' : s === '4.3' ? 's43' : s === '4.0' ? 's40' : 's100'
}
