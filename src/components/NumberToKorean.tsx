'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Copy, Check } from 'lucide-react'
import {
  parseAmount, toKoreanReading, toKoreanFormal, toHanja, toMixed, toEnglish,
  commafy, canonical, addDigits, type ParsedNum,
} from '@/utils/numberToKorean'

// 숫자형 입력이면 천 단위 쉼표로 재포맷, 한글이 섞였으면 그대로 둔다 (역변환용)
// ponytail: 중간 편집 시 커서가 끝으로 이동 — 불편 신고 오면 selection 보정 추가
function formatInput(raw: string): string {
  const s = raw.replace(/[\s,₩원정]/g, '').replace(/^(일금|금)/, '')
  const m = s.match(/^([-−]?)(\d*)(\.\d*)?$/)
  if (!m || !/\d/.test(s)) return raw
  return m[1] + (m[2] ? commafy(m[2]) : '') + (m[3] ?? '')
}

const QUICK_ADD = [
  { label: '+1천', value: '1000' },
  { label: '+1만', value: '10000' },
  { label: '+10만', value: '100000' },
  { label: '+100만', value: '1000000' },
  { label: '+1000만', value: '10000000' },
  { label: '+1억', value: '100000000' },
]

const PREFIXES = [
  { id: 'geum', value: '금 ', label: '금' },
  { id: 'ilgeum', value: '일금 ', label: '일금' },
  { id: 'none', value: '', label: '' },
]

export default function NumberToKorean() {
  const t = useTranslations('numberToKorean')
  const [input, setInput] = useState('')
  const [spacing, setSpacing] = useState(false)
  const [prefix, setPrefix] = useState('금 ')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 공유 링크 복원 (?n=1234500)
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get('n')
    if (n) setInput(formatInput(n))
  }, [])

  const parsed: ParsedNum | null = useMemo(() => (input.trim() ? parseAmount(input) : null), [input])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (parsed) url.searchParams.set('n', canonical(parsed))
    else url.searchParams.delete('n')
    window.history.replaceState(window.history.state, '', url)
  }, [parsed])

  const numberDisplay = parsed ? `${parsed.neg ? '-' : ''}${commafy(parsed.int)}${parsed.frac ? '.' + parsed.frac : ''}` : ''
  const formal = parsed ? toKoreanFormal(parsed, prefix, spacing) : ''
  const hanja = parsed ? toHanja(parsed) : ''
  const notAmount = !!parsed && !formal

  const rows = [
    { id: 'contract', label: t('contractFormat'), value: formal ? `${formal}(₩${commafy(parsed!.int)})` : '' },
    { id: 'chinese', label: t('chineseNum'), value: hanja },
    { id: 'mixed', label: t('mixedNum'), value: parsed ? toMixed(parsed) : '' },
    { id: 'reading', label: t('koreanInformal'), value: parsed ? toKoreanReading(parsed, spacing) : '' },
    { id: 'english', label: t('englishNum'), value: parsed ? toEnglish(parsed) : '' },
  ]

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
    } catch { /* 복사 실패해도 상태 표시는 동일 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleAdd = (amount: string) => {
    const base = parsed && !parsed.neg ? parsed.int : '0'
    const next = addDigits(base, amount)
    if (next.length <= 20) setInput(commafy(next) + (parsed && !parsed.neg && parsed.frac ? '.' + parsed.frac : ''))
  }

  const CopyButton = ({ id, value, label }: { id: string; value: string; label?: string }) => (
    <button
      onClick={() => value && copyToClipboard(value, id)}
      disabled={!value}
      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-soft hover:bg-subtle text-body rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label={`${label ?? ''} ${t('copy')}`.trim()}
    >
      {copiedId === id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
      {copiedId === id ? t('copied') : t('copy')}
    </button>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <label htmlFor="ntk-input" className="block text-sm font-medium text-body mb-2">{t('inputNumber')}</label>
              <input
                id="ntk-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                value={input}
                onChange={(e) => setInput(formatInput(e.target.value))}
                placeholder={t('placeholder')}
                className="ui-field px-4 py-3 text-lg tabular-nums"
              />
              <p className="text-xs text-muted mt-2">{t('inputHint')}</p>
              {!parsed && /[\d가-힣]/.test(input) && <p className="text-xs text-red-600 mt-1">{t('invalidNumber')} · {t('maxNumber')}</p>}
            </div>

            <div>
              <div className="block text-sm font-medium text-body mb-2">{t('quickAmounts')}</div>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_ADD.map((q) => (
                  <button key={q.value} onClick={() => handleAdd(q.value)} className="px-2 py-2 text-sm bg-soft hover:bg-subtle text-body rounded-xl transition-colors tabular-nums">
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="block text-sm font-medium text-body mb-2">{t('prefixLabel')}</div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {PREFIXES.map((p) => (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={prefix === p.value}
                    onClick={() => setPrefix(p.value)}
                    className={`px-2 py-2 text-sm rounded-xl transition-colors ${prefix === p.value ? 'bg-primary text-white' : 'bg-soft hover:bg-subtle text-body'}`}
                  >
                    {p.label || t('prefixNone')}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={spacing} onChange={(e) => setSpacing(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-body">{t('spacing')}</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setInput(''); setCopiedId(null) }} className="ui-btn-soft px-4 py-2">{t('reset')}</button>
              <button onClick={() => copyToClipboard(window.location.href, 'link')} disabled={!parsed} className="ui-btn-soft px-4 py-2 disabled:opacity-40">
                {copiedId === 'link' ? t('copied') : t('copyLink')}
              </button>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ui-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-muted mb-1">{t('koreanFormal')}</div>
                <div className="text-2xl sm:text-3xl font-bold text-fg break-all">
                  {formal || <span className="text-faint font-medium text-xl">{notAmount ? t('integerOnly') : t('inputPrompt')}</span>}
                </div>
                <div className="text-sm text-muted mt-2 tabular-nums break-all">{numberDisplay && `${numberDisplay}${t('wonUnit')}`}</div>
              </div>
              <CopyButton id="formal" value={formal} label={t('koreanFormal')} />
            </div>
          </div>

          <div className="ui-card divide-y divide-line">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted mb-1">{r.label}</div>
                  <div className="text-lg font-medium text-fg break-all">{r.value || <span className="text-faint">-</span>}</div>
                </div>
                <CopyButton id={r.id} value={r.value} label={r.label} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['usage', 'rules'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
