'use client'

/**
 * GpaConverter — 학점 변환기 (4.5 / 4.3 / 4.0 / 백분율 동시 변환)
 * 번역 네임스페이스: gpaConverterCalc
 *
 * 두 가지 방법을 나란히 보여준다.
 *  - 비례 환산: 값 ÷ 내 만점 × 목표 만점 (모든 칸 채움)
 *  - 등급표 기준(참고): 4.5 만점 일반 등급 구간(A+ 95~100 …)으로 묶어 옮김 (4.5 / 100점 칸만)
 * 학교·기업별 공식 환산표는 검증된 출처가 없어 넣지 않았다 (지원처 공식 우선 안내).
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, Link as LinkIcon, Download } from 'lucide-react'
import NextLink from 'next/link'

type Scale = '4.5' | '4.3' | '4.0' | '100'

interface GuideSection {
  title: string
  items: string[]
}

const SCALES: Scale[] = ['4.5', '4.3', '4.0', '100']
const SCALE_MAX: Record<Scale, number> = { '4.5': 4.5, '4.3': 4.3, '4.0': 4.0, '100': 100 }

// 4.5 만점 → 등급 / 백분위 (일반 참고 구간, min 내림차순 — find(g >= min)로 구간 사이 틈 없음)
const GPA45_BANDS = [
  { min: 4.25, percent: '95~100', grade: 'A+' },
  { min: 3.75, percent: '90~94', grade: 'A0' },
  { min: 3.25, percent: '85~89', grade: 'B+' },
  { min: 2.75, percent: '80~84', grade: 'B0' },
  { min: 2.25, percent: '75~79', grade: 'C+' },
  { min: 1.75, percent: '70~74', grade: 'C0' },
  { min: 1.25, percent: '65~69', grade: 'D+' },
  { min: 0.75, percent: '60~64', grade: 'D0' },
  { min: 0, percent: '0~59', grade: 'F' },
]

// 백분율 → 4.5 만점 (같은 참고 구간의 역방향)
const PERCENT_BANDS = [
  { min: 95, gpa: 4.5, grade: 'A+' },
  { min: 90, gpa: 4.0, grade: 'A0' },
  { min: 85, gpa: 3.5, grade: 'B+' },
  { min: 80, gpa: 3.0, grade: 'B0' },
  { min: 75, gpa: 2.5, grade: 'C+' },
  { min: 70, gpa: 2.0, grade: 'C0' },
  { min: 65, gpa: 1.5, grade: 'D+' },
  { min: 60, gpa: 1.0, grade: 'D0' },
  { min: 0, gpa: 0.0, grade: 'F' },
]

// 등급 참고표. 4.3 만점은 +/0/- 체계(A- 3.7, B+ 3.3 …), 4.5 만점은 +/0 체계.
// 기존 messages의 grades 표는 4.3 열이 4.5와 같게(B+ 3.5) 잘못 들어가 있어 여기서 직접 관리.
const GRADE_TABLE: { grade: string; g45: number | null; g43: number; percent: string | null }[] = [
  { grade: 'A+', g45: 4.5, g43: 4.3, percent: '95~100' },
  { grade: 'A0', g45: 4.0, g43: 4.0, percent: '90~94' },
  { grade: 'A-', g45: null, g43: 3.7, percent: null },
  { grade: 'B+', g45: 3.5, g43: 3.3, percent: '85~89' },
  { grade: 'B0', g45: 3.0, g43: 3.0, percent: '80~84' },
  { grade: 'B-', g45: null, g43: 2.7, percent: null },
  { grade: 'C+', g45: 2.5, g43: 2.3, percent: '75~79' },
  { grade: 'C0', g45: 2.0, g43: 2.0, percent: '70~74' },
  { grade: 'C-', g45: null, g43: 1.7, percent: null },
  { grade: 'D+', g45: 1.5, g43: 1.3, percent: '65~69' },
  { grade: 'D0', g45: 1.0, g43: 1.0, percent: '60~64' },
  { grade: 'D-', g45: null, g43: 0.7, percent: null },
  { grade: 'F', g45: 0, g43: 0, percent: '0~59' },
]

export interface Converted {
  ratio: Record<Scale, number>
  /** 등급표 기준 4.5 환산 (백분율 입력일 때만) */
  bandG45: number | null
  /** 등급표 기준 백분위 구간 (학점 입력일 때만) */
  bandPercent: string | null
  grade: string
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d

export function convert(val: number, scale: Scale): Converted | null {
  if (!Number.isFinite(val) || val < 0 || val > SCALE_MAX[scale]) return null
  const frac = val / SCALE_MAX[scale]
  const ratio = {
    '4.5': round(frac * 4.5, 2),
    '4.3': round(frac * 4.3, 2),
    '4.0': round(frac * 4.0, 2),
    '100': round(frac * 100, 1),
  } as Record<Scale, number>
  ratio[scale] = val

  if (scale === '100') {
    const b = PERCENT_BANDS.find((r) => val >= r.min)!
    return { ratio, bandG45: b.gpa, bandPercent: null, grade: b.grade }
  }
  const b = GPA45_BANDS.find((r) => frac * 4.5 >= r.min)!
  // 4.3 입력은 4.3 체계 등급(A- 등)으로: 가장 가까운 등급점, 동점이면 위 등급
  const grade =
    scale === '4.3'
      ? GRADE_TABLE.reduce((best, r) => (Math.abs(val - r.g43) < Math.abs(val - best.g43) ? r : best)).grade
      : b.grade
  return { ratio, bandG45: null, bandPercent: b.percent, grade }
}

const fmt = (s: Scale, n: number) => (s === '100' ? `${n}%` : n.toFixed(2))

export default function GpaConverter() {
  const t = useTranslations('gpaConverterCalc')
  const searchParams = useSearchParams()

  const [scale, setScale] = useState<Scale>(() => {
    const s = searchParams.get('scale') as Scale
    return SCALE_MAX[s] ? s : '4.5'
  })
  const [inputValue, setInputValue] = useState(() => searchParams.get('v') ?? '')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // URL 공유: 기본값(4.5·빈 값)은 쿼리에서 빼서 깨끗한 URL 유지
  useEffect(() => {
    const p = new URLSearchParams()
    if (scale !== '4.5') p.set('scale', scale)
    if (inputValue) p.set('v', inputValue)
    const qs = p.toString()
    window.history.replaceState(window.history.state, '', qs ? `?${qs}` : window.location.pathname)
  }, [scale, inputValue])

  const num = inputValue.trim() === '' ? NaN : Number(inputValue)
  const result = useMemo(() => (Number.isNaN(num) ? null : convert(num, scale)), [num, scale])
  const invalid = inputValue.trim() !== '' && !result
  // 만점 초과 입력 → 담을 수 있는 가장 작은 만점 제안 (예: 4.3 선택 후 4.4 입력, 4.5 선택 후 88 입력)
  const suggest = invalid && num > SCALE_MAX[scale]
    ? SCALES.slice().sort((a, b) => SCALE_MAX[a] - SCALE_MAX[b]).find((s) => SCALE_MAX[s] >= num)
    : undefined

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

  const guideSections = t.raw('guide.sections') as GuideSection[]
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[] | undefined

  const scaleLabel = (s: Scale) => t(`scales.${scaleKey(s)}`)

  const resultText = useMemo(() => {
    if (!result) return ''
    const others = SCALES.filter((s) => s !== scale).map((s) => `${scaleLabel(s)} ${fmt(s, result.ratio[s])}`)
    const band = result.bandG45 != null
      ? `${scaleLabel('4.5')} ${result.bandG45.toFixed(1)}`
      : `${t('result.percent')} ${result.bandPercent}%`
    return [
      `${scaleLabel(scale)} ${inputValue}`,
      `${t('result.method.ratio')}: ${others.join(' / ')}`,
      `${t('result.method.band')}: ${result.grade} · ${band}`,
      'toolhub.ai.kr/gpa-converter/',
    ].join('\n')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, scale, inputValue, t])

  const saveAsImage = useCallback(() => {
    if (!result) return
    const W = 660, H = 380
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#191f28'; ctx.font = 'bold 28px system-ui, sans-serif'
    ctx.fillText(t('title'), 40, 40)
    ctx.fillStyle = '#6b7684'; ctx.font = '16px system-ui, sans-serif'
    ctx.fillText(`${t('input.label')}: ${inputValue} (${scaleLabel(scale)}) · ${t('result.method.ratio')}`, 40, 82)

    const tw = (W - 80 - 30) / 4
    SCALES.forEach((s, i) => {
      const x = 40 + i * (tw + 10)
      ctx.fillStyle = s === scale ? '#e8f3ff' : '#f2f4f6'
      ctx.fillRect(x, 130, tw, 110)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#6b7684'; ctx.font = '14px system-ui, sans-serif'
      ctx.fillText(scaleLabel(s), x + tw / 2, 150)
      ctx.fillStyle = s === scale ? '#3182f6' : '#191f28'; ctx.font = 'bold 26px system-ui, sans-serif'
      ctx.fillText(fmt(s, result.ratio[s]), x + tw / 2, 185)
    })
    ctx.textAlign = 'left'
    ctx.fillStyle = '#333d4b'; ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.fillText(`${t('result.grade')} ${result.grade}`, 40, 270)
    ctx.fillStyle = '#8b95a1'; ctx.font = '13px system-ui, sans-serif'
    ctx.fillText('toolhub.ai.kr · ' + t('note40'), 40, H - 40)

    const link = document.createElement('a')
    link.download = `gpa-${inputValue}-${scale}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, inputValue, scale, t])

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 좌: 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('scaleLabel')}</label>
              <div className="grid grid-cols-2 gap-2">
                {SCALES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    aria-pressed={scale === s}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      scale === s ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {scaleLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="gpa-input" className="block text-sm font-medium text-body mb-2">{t('input.label')}</label>
              <div className="flex items-center gap-2">
                <input
                  id="gpa-input"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  max={SCALE_MAX[scale]}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={scale === '100' ? '88' : t('input.placeholder')}
                  aria-invalid={invalid}
                  className="ui-field px-4 py-3 w-full text-lg tabular-nums"
                />
                <span className="text-sm text-muted whitespace-nowrap">/ {SCALE_MAX[scale]}</span>
              </div>
              <p className="text-xs text-faint mt-1">{t('input.help')}</p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => copyToClipboard(window.location.href, 'link')}
                className="ui-btn w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
              >
                {copiedId === 'link' ? <><Check className="w-4 h-4" />{t('copyLinkDone')}</> : <><LinkIcon className="w-4 h-4" />{t('copyLink')}</>}
              </button>
              <button
                onClick={saveAsImage}
                disabled={!result}
                className="ui-btn-soft w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saved ? <><Check className="w-4 h-4" />{t('saveImageDone')}</> : <><Download className="w-4 h-4" />{t('saveImage')}</>}
              </button>
            </div>
          </div>
        </div>

        {/* 우: 결과 + 참고표 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6" aria-live="polite">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-fg">{t('result.title')}</h2>
              {result && (
                <button
                  onClick={() => copyToClipboard(resultText, 'result')}
                  className="ui-btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  {copiedId === 'result' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'result' ? t('copied') : t('copyResult')}
                </button>
              )}
            </div>

            {!inputValue.trim() ? (
              <p className="text-faint text-sm">{t('result.empty')}</p>
            ) : invalid ? (
              <div className="text-sm space-y-2">
                <p className="text-red-600 dark:text-red-400">
                  {t('result.invalidRange')} — {t('result.rangeHint', { max: SCALE_MAX[scale] })}
                </p>
                {suggest && (
                  <button onClick={() => setScale(suggest)} className="ui-btn-soft px-3 py-1.5 text-sm">
                    {t('result.switchScale', { scale: scaleLabel(suggest) })}
                  </button>
                )}
              </div>
            ) : result && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left py-2 pr-3 font-medium text-sub">{t('result.scaleCol')}</th>
                        <th className="text-right py-2 px-3 font-medium text-sub">{t('result.method.ratio')}</th>
                        <th className="text-right py-2 pl-3 font-medium text-sub">{t('result.method.band')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SCALES.map((s) => {
                        const mine = s === scale
                        const band = mine ? null
                          : s === '4.5' && result.bandG45 != null ? result.bandG45.toFixed(1)
                          : s === '100' && result.bandPercent ? `${result.bandPercent}%`
                          : null
                        return (
                          <tr key={s} className="border-b border-line last:border-0">
                            <td className="py-3 pr-3 text-body">
                              {scaleLabel(s)}
                              {mine && <span className="ml-2 text-xs text-muted">{t('result.input')}</span>}
                            </td>
                            <td className={`py-3 px-3 text-right tabular-nums text-xl font-bold ${mine ? 'text-muted' : 'text-fg'}`}>
                              {fmt(s, result.ratio[s])}
                            </td>
                            <td className="py-3 pl-3 text-right tabular-nums text-body">{band ?? <span className="text-faint">—</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-sub">{t('result.grade')}</span>
                  <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-lg bg-soft text-fg text-lg font-bold">{result.grade}</span>
                  <span className="text-xs text-muted">{scale === '4.3' ? t('scales.s43') : t('result.gradeRef')}</span>
                </div>

                <div className="mt-4 bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
                  <p className="font-medium text-fg">{t('methods.title')}</p>
                  <p>{t('methods.ratio')}</p>
                  <p>{t('methods.band')}</p>
                  <p>{t('methods.official')}</p>
                </div>
                <p className="text-xs text-faint mt-3">{t('note40')}</p>
              </>
            )}
          </div>

          {/* 등급 참고표 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('table.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-2 px-3 font-medium text-sub">{t('table.grade')}</th>
                    <th className="text-center py-2 px-3 font-medium text-sub">{t('table.gpa45')}</th>
                    <th className="text-center py-2 px-3 font-medium text-sub">{t('table.gpa43')}</th>
                    <th className="text-center py-2 px-3 font-medium text-sub">{t('table.percent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADE_TABLE.map((row) => (
                    <tr key={row.grade} className={`border-b border-line last:border-0 ${result?.grade === row.grade ? 'bg-subtle' : ''}`}>
                      <td className="py-2 px-3 font-semibold text-fg">{row.grade}</td>
                      <td className="py-2 px-3 text-center text-body tabular-nums">{row.g45 != null ? row.g45.toFixed(1) : '—'}</td>
                      <td className="py-2 px-3 text-center text-body tabular-nums">{row.g43.toFixed(1)}</td>
                      <td className="py-2 px-3 text-center text-body tabular-nums">{row.percent ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-faint mt-3">{t('table.note')}</p>
          </div>

          {/* 관련 도구 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('crossLinks.title')}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <NextLink href="/gpa-calculator/" className="block p-4 rounded-xl bg-subtle hover:bg-soft transition-colors">
                <span className="block font-medium text-fg">{t('crossLinks.calc.label')}</span>
                <span className="block text-xs text-muted mt-0.5">{t('crossLinks.calc.desc')}</span>
              </NextLink>
              <NextLink href="/grade-calculator/" className="block p-4 rounded-xl bg-subtle hover:bg-soft transition-colors">
                <span className="block font-medium text-fg">{t('crossLinks.grade.label')}</span>
                <span className="block text-xs text-muted mt-0.5">{t('crossLinks.grade.desc')}</span>
              </NextLink>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {guideSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="font-medium text-fg mb-2">{section.title}</h3>
              <ul className="space-y-1">
                {section.items.map((item, jdx) => (
                  <li key={jdx} className="text-sm text-sub flex items-start gap-2">
                    <span className="text-faint mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {Array.isArray(faq) && faq.length > 0 && (
          <div className="mt-8 border-t border-line pt-6">
            <h3 className="font-medium text-fg mb-3">{t('guide.faq.title')}</h3>
            <dl className="space-y-4">
              {faq.map((f, i) => (
                <div key={i}>
                  <dt className="text-sm font-medium text-body">{f.q}</dt>
                  <dd className="text-sm text-sub mt-1">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

function scaleKey(s: Scale): string {
  return s === '4.5' ? 's45' : s === '4.3' ? 's43' : s === '4.0' ? 's40' : 's100'
}
