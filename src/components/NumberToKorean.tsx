'use client'

import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/numberToKorean'
import { Copy, Check } from 'lucide-react'
import { useHydrated } from '@/hooks/useHydrated'
import { useSearchParams } from '@/hooks/useSearchParams'
import NumberToKoreanBatch from '@/components/NumberToKoreanBatch'
import NumberToKoreanCopyRecovery from '@/components/NumberToKoreanCopyRecovery'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { initialNumberEditingState, reduceNumberEditing, numberInputSyncUrl, numberShareUrl, type NumberEditingAction } from '@/utils/numberToKoreanEditing'
import { createNumberCopyController, type NumberCopyRequest, type NumberCopyState, type NumberCopyTarget } from '@/utils/numberToKoreanActions'
import {
  parseAmount, toKoreanReading, toKoreanFormal, toHanja, toMixed, toEnglish,
  commafy, type ParsedNum,
} from '@/utils/numberToKorean'

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
  const language = useOptionalLanguage()?.language ?? 'ko'
  const [editing, setEditing] = useState(initialNumberEditingState)
  const editingRef = useRef(editing), fieldRef = useRef<HTMLInputElement>(null)
  const input = editing.raw
  const [spacing, setSpacing] = useState(false)
  const [prefix, setPrefix] = useState('금 ')
  const [copyState, setCopyState] = useState<NumberCopyState | null>(null)
  const clipboard = useRef<ReturnType<typeof createNumberCopyController> | null>(null)
  const mounted = useRef(false), latestContext = useRef('')
  const hydrated = useHydrated()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const invalidateCopy = useCallback(() => { clipboard.current?.invalidate() }, [])
  const invalidateSingle = useCallback(() => { latestContext.current = ''; invalidateCopy() }, [invalidateCopy])
  const dispatch = useCallback((action: NumberEditingAction) => {
    const before = editingRef.current, next = reduceNumberEditing(before, action)
    if (next === before) return
    if (next.raw !== before.raw || ['change', 'compositionStart', 'compositionEnd', 'clear', 'quickAdd'].includes(action.type)) invalidateSingle()
    editingRef.current = next; setEditing(next)
  }, [invalidateSingle])

  useLayoutEffect(() => {
    mounted.current = true
    const controller = createNumberCopyController({ after(callback, delay) {
      const timer = setTimeout(callback, delay); return () => clearTimeout(timer)
    } }, state => { if (mounted.current) setCopyState(state) })
    clipboard.current = controller
    return () => { mounted.current = false; controller.dispose(); clipboard.current = null }
  }, [])

  useEffect(() => {
    if (!hydrated || editing.urlRestored) return
    let active = true
    queueMicrotask(() => { if (active) dispatch({ type: 'hydrate', params: new URLSearchParams(query) }) })
    return () => { active = false }
  }, [hydrated, editing.urlRestored, query, dispatch])

  // A trailing input event after compositionend gets a newer generation/reservation.
  useLayoutEffect(() => {
    if (!editing.normalizePending || editing.composing || editing.focused) return
    const generation = editing.generation
    const timer = setTimeout(() => {
      if (mounted.current && document.activeElement !== fieldRef.current) dispatch({ type: 'normalizeDeferred', generation })
    }, 0)
    return () => clearTimeout(timer)
  }, [editing.generation, editing.normalizePending, editing.composing, editing.focused, dispatch])

  const parsed: ParsedNum | null = useMemo(() => (input.trim() ? parseAmount(input) : null), [input])

  useEffect(() => {
    const next = numberInputSyncUrl(window.location.href, editing)
    if (next !== null && next !== window.location.href) window.history.replaceState(window.history.state, '', next)
  }, [editing])

  const numberDisplay = parsed ? `${parsed.neg ? '-' : ''}${commafy(parsed.int)}${parsed.frac ? '.' + parsed.frac : ''}` : ''
  const formal = parsed ? toKoreanFormal(parsed, prefix, spacing) : ''
  const hanja = parsed ? toHanja(parsed) : ''
  const notAmount = !!parsed && !formal

  const rows: { id: NumberCopyTarget; label: string; value: string }[] = [
    { id: 'contract', label: t('contractFormat'), value: formal ? `${formal}(₩${commafy(parsed!.int)})` : '' },
    { id: 'chinese', label: t('chineseNum'), value: hanja },
    { id: 'mixed', label: t('mixedNum'), value: parsed ? toMixed(parsed) : '' },
    { id: 'reading', label: t('koreanInformal'), value: parsed ? toKoreanReading(parsed, spacing) : '' },
    { id: 'english', label: t('englishNum'), value: parsed ? toEnglish(parsed) : '' },
  ]

  const copyContext = JSON.stringify([input, prefix, spacing, language, formal, t('koreanFormal'), t('editing.linkLabel'), t('editing.batchLabel'), t('copy'), t('copied'), rows])
  useLayoutEffect(() => { latestContext.current = copyContext })
  useLayoutEffect(() => { invalidateCopy() }, [copyContext, invalidateCopy])
  const requestCopy = (request: NumberCopyRequest) => {
    if (!mounted.current || editingRef.current.composing || !editingRef.current.urlRestored || latestContext.current !== copyContext) return
    void clipboard.current?.request(request)
  }
  const copyDisabled = editing.composing || !editing.urlRestored
  const copiedId = copyState?.status === 'copied' ? copyState.target : null
  const copyLabel = (id: NumberCopyTarget) => copyState?.target === id && copyState.status === 'copying' ? t('editing.copying') : copiedId === id ? t('copied') : t('copy')
  const copyButton = (id: NumberCopyTarget, value: string, label: string) => (
    <button
      type="button" data-number-copy={id} data-number-copied={copiedId === id}
      onClick={() => requestCopy({ text: value, target: id, label })}
      disabled={!value || copyDisabled || copyState?.target === id && copyState.status === 'copying'}
      className="min-h-11 flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-soft hover:bg-subtle text-body rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label={`${label} ${copyLabel(id)}`.trim()}
    >
      {copiedId === id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
      {copyLabel(id)}
    </button>
  )
  const recovery = copyState?.status === 'failed' ? <NumberToKoreanCopyRecovery key={copyState.token.request}
    target={copyState.target} text={copyState.text} label={copyState.label}
    onRetry={() => { if (!editingRef.current.composing) void clipboard.current?.retry(copyState.token) }}
    onClose={() => { clipboard.current?.close(copyState.token) }} /> : undefined

  return (
    <div className="space-y-8" data-number-composing={editing.composing} data-number-restored={editing.urlRestored}>
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {copyState?.target !== 'batch' && recovery}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="min-w-0 lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <label htmlFor="ntk-input" className="block text-sm font-medium text-body mb-2">{t('inputNumber')}</label>
              <input
                id="ntk-input"
                ref={fieldRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={input}
                onChange={event => dispatch({ type: 'change', raw: event.target.value, isComposing: (event.nativeEvent as InputEvent).isComposing })}
                onCompositionStart={() => dispatch({ type: 'compositionStart' })}
                onCompositionEnd={event => dispatch({ type: 'compositionEnd', raw: event.currentTarget.value })}
                onFocus={() => dispatch({ type: 'focus' })}
                onBlur={() => dispatch({ type: 'blur' })}
                aria-describedby="number-editing-hint"
                placeholder={t('placeholder')}
                className="ui-field px-4 py-3 text-lg tabular-nums"
              />
              <p id="number-editing-hint" className="text-xs text-muted mt-2">{t('editing.blurHint')}</p>
              <p className="text-xs text-muted mt-2">{t('inputHint')}</p>
              {editing.example && <p data-number-example className="mt-2 text-sm text-sub">{t('editing.example')}</p>}
              {editing.composing && <p role="status" className="mt-2 text-sm text-sub">{t('editing.composing')}</p>}
              {/* 모바일: 결과 카드가 입력 카드 아래라 입력하는 동안 결과를 바로 보여 준다 */}
              {formal && (
                <div className="lg:hidden mt-3 flex items-start justify-between gap-3 bg-primary-soft rounded-2xl px-4 py-3">
                  <div className="min-w-0 text-lg font-bold text-fg break-all" aria-hidden="true">{formal}</div>
                  {copyButton('formal-mobile', formal, t('koreanFormal'))}
                </div>
              )}
              {!parsed && /[\d가-힣]/.test(input) && <p className="text-xs text-red-600 mt-1">{t('invalidNumber')} · {t('maxNumber')}</p>}
            </div>

            <div>
              <div className="block text-sm font-medium text-body mb-2">{t('quickAmounts')}</div>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('quickAmounts')}>
                {QUICK_ADD.map((q) => (
                  <button key={q.value} type="button" data-number-quick={q.value} disabled={editing.composing} onClick={() => dispatch({ type: 'quickAdd', amount: q.value })} className="min-h-11 px-2 py-2 text-sm bg-soft hover:bg-subtle text-body rounded-xl transition-colors tabular-nums disabled:opacity-40">
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="block text-sm font-medium text-body mb-2">{t('prefixLabel')}</div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('prefixLabel')}>
                {PREFIXES.map((p) => (
                  <button
                    key={p.id}
                    role="radio"
                    data-number-prefix={p.id}
                    aria-checked={prefix === p.value}
                    onClick={() => { if (prefix !== p.value) { invalidateSingle(); setPrefix(p.value) } }}
                    className={`min-h-11 px-2 py-2 text-sm rounded-xl transition-colors ${prefix === p.value ? 'bg-primary text-white' : 'bg-soft hover:bg-subtle text-body'}`}
                  >
                    {p.label || t('prefixNone')}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex min-h-11 items-center gap-2 cursor-pointer">
              <input type="checkbox" data-number-spacing checked={spacing} onChange={(e) => { if (spacing !== e.target.checked) { invalidateSingle(); setSpacing(e.target.checked) } }} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-body">{t('spacing')}</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" data-number-clear disabled={editing.composing} onClick={() => dispatch({ type: 'clear' })} className="ui-btn-soft min-h-11 px-4 py-2 disabled:opacity-40">{t('editing.clear')}</button>
              <button type="button" data-number-copy="link" data-number-copied={copiedId === 'link'} onClick={() => {
                const text = numberShareUrl(window.location.href, editingRef.current)
                if (text) requestCopy({ text, target: 'link', label: t('editing.linkLabel') })
              }} disabled={!parsed || copyDisabled || copyState?.target === 'link' && copyState.status === 'copying'} className="ui-btn-soft min-h-11 px-4 py-2 disabled:opacity-40">
                {copyState?.target === 'link' && copyState.status === 'copying' ? t('editing.copying') : copiedId === 'link' ? t('copied') : t('copyLink')}
              </button>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="min-w-0 lg:col-span-2 space-y-4">
          <div className="ui-card p-6" data-number-result>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-muted mb-1">{t('koreanFormal')}</div>
                <div className="text-2xl sm:text-3xl font-bold text-fg break-all" aria-live="polite">
                  {formal || <span className="text-faint font-medium text-xl">{notAmount ? t('integerOnly') : t('inputPrompt')}</span>}
                </div>
                <div className="text-sm text-muted mt-2 tabular-nums break-all">{numberDisplay && `${numberDisplay}${t('wonUnit')}`}</div>
              </div>
              {copyButton('formal', formal, t('koreanFormal'))}
            </div>
          </div>

          <div className="ui-card divide-y divide-line">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted mb-1">{r.label}</div>
                  <div className="text-lg font-medium text-fg break-all">{r.value || <span className="text-faint">-</span>}</div>
                </div>
                {copyButton(r.id, r.value, r.label)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <NumberToKoreanBatch prefix={prefix} spacing={spacing} copyState={copyState} copyDisabled={copyDisabled}
        onCopy={requestCopy} onInvalidateCopy={invalidateCopy} recovery={copyState?.target === 'batch' ? recovery : undefined} />

      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
