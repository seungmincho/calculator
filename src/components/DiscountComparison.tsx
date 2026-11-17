'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/discountCalculator'
import { useLanguage } from '@/contexts/LanguageContext'
import MobileResultLink from '@/components/MobileResultLink'
import ShareResult from '@/components/ShareResult'
import {
  DISCOUNT_COMPARISON_FIELDS, DISCOUNT_COMPARISON_LIMITS, captureDiscountComparison, createDiscountCondition,
  discountComparisonUrl, evaluateDiscountComparison, formatDiscountComparison, normalizeDiscountConditionName,
  type DiscountConditionDraft, type DiscountConditionField,
} from '@/utils/discountComparison'
import { copyDiscountComparison, createDiscountComparisonDownloads, createDiscountComparisonGuard, type DiscountActionToken } from '@/utils/discountComparisonActions'

export interface DiscountComparisonProps {
  rows: readonly DiscountConditionDraft[]
  onChange: (rows: DiscountConditionDraft[]) => void
  /** The parent increments this for edits/restoration, including equal-value round trips. */
  revision: string | number
  /** A basic-result copy supersedes this panel's pending clipboard/share output. */
  outputRevision?: number
  onOutput?: () => void
  ready: boolean
  /** Current basic calculator parameters; this child never changes the address bar. */
  baseUrl: string
  basicPrice: number | null
  multiPrice: number | null
  linkError?: boolean
}
type Feedback = { scope: string; token: DiscountActionToken; kind: 'copied' | 'copyFailed' | 'downloaded' | 'downloadFailed'; text?: string; selectionFailed?: boolean }
const fieldClass = 'ui-field min-w-0 w-full px-3 py-3 text-base'
const buttonClass = 'ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40'

export default function DiscountComparison({ rows, onChange, revision, outputRevision = 0, onOutput, ready, baseUrl, basicPrice, multiPrice, linkError = false }: DiscountComparisonProps) {
  const t = useTranslations('discountCalculator'), { language } = useLanguage()
  const [guard] = useState(createDiscountComparisonGuard), [feedback, setFeedback] = useState<Feedback | null>(null)
  const [shareRevision, setShareRevision] = useState(0)
  const mounted = useRef(false), sequence = useRef(0), manualRef = useRef<HTMLTextAreaElement>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null), downloads = useRef<ReturnType<typeof createDiscountComparisonDownloads> | null>(null)
  const evaluation = useMemo(() => evaluateDiscountComparison(rows), [rows])
  const snapshot = useMemo(() => captureDiscountComparison(rows), [rows])
  const scope = JSON.stringify([revision, outputRevision, language, baseUrl, ready, rows])
  const money = (value: number, average = false) => `${new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ko-KR', { maximumFractionDigits: average ? 2 : 0 }).format(value)} ${t('comparison.won')}`
  const defaultName = (index: number) => t('comparison.defaultName', { index })
  const rowName = (row: Pick<DiscountConditionDraft, 'name'>, index: number) => row.name.trim() ? normalizeDiscountConditionName(row.name) : defaultName(index + 1)
  const labels = {
    title: t('comparison.exportTitle'), formula: t('comparison.formula'), averageHint: t('comparison.averageHint'), sourceHint: t('comparison.assumption'), defaultName, money,
    lowestTotal: t('comparison.lowestTotal'), lowestUnit: t('comparison.lowestUnit'), none: t('comparison.singleCondition'),
    fields: {
      unitPrice: t('comparison.fields.unitPrice'), quantity: t('comparison.fields.quantity'), coupon: t('comparison.fields.coupon'), shipping: t('comparison.fields.shipping'),
      subtotal: t('comparison.results.subtotal'), appliedCoupon: t('comparison.results.appliedCoupon'), excessCoupon: t('comparison.results.excessCoupon'),
      goodsTotal: t('comparison.results.goodsTotal'), total: t('comparison.results.total'), unitAverage: t('comparison.results.unitAverage'),
    },
  }
  const text = snapshot ? formatDiscountComparison(snapshot, labels) : ''
  const shareUrl = ready && snapshot ? discountComparisonUrl(baseUrl, rows) : null
  const latest = useRef({ scope, rows, ready, text, onChange, onOutput })
  useLayoutEffect(() => {
    latest.current = { scope, rows, ready, text, onChange, onOutput }
  }, [scope, rows, ready, text, onChange, onOutput])
  useLayoutEffect(() => { guard.invalidate() }, [scope, guard])
  useEffect(() => {
    mounted.current = true; const owner = createDiscountComparisonDownloads(); downloads.current = owner
    return () => {
      mounted.current = false; guard.invalidate(); owner.dispose()
      if (clearTimer.current !== null) clearTimeout(clearTimer.current)
      if (downloads.current === owner) downloads.current = null
    }
  }, [guard])
  const commit = (next: DiscountConditionDraft[]) => {
    if (!mounted.current || !latest.current.ready) return
    guard.invalidate(); setFeedback(null)
    if (clearTimer.current !== null) { clearTimeout(clearTimer.current); clearTimer.current = null }
    latest.current.onChange(next)
  }
  const edit = (id: string, field: DiscountConditionField, value: string) => {
    const current = latest.current.rows
    if (!current.some(row => row.id === id && row[field] !== value)) return
    commit(current.map(row => row.id === id ? { ...row, [field]: value } : { ...row }))
  }
  const add = (price?: number | null) => {
    const current = latest.current.rows
    if (current.length >= DISCOUNT_COMPARISON_LIMITS.rows || price === null) return
    let id: string
    do { id = `discount-row-${++sequence.current}` } while (current.some(row => row.id === id))
    const row = createDiscountCondition(id, price)
    if (row) commit([...current.map(value => ({ ...value })), row])
  }
  const remove = (id: string) => {
    const current = latest.current.rows
    if (current.some(row => row.id === id)) commit(current.filter(row => row.id !== id).map(row => ({ ...row })))
  }
  const copy = async () => {
    const clicked = latest.current
    if (!mounted.current || !clicked.ready || !clicked.text) return
    clicked.onOutput?.(); setShareRevision(previous => previous + 1)
    const token = guard.begin(), current = () => mounted.current && guard.current(token) && latest.current.scope === clicked.scope
    if (clearTimer.current !== null) clearTimeout(clearTimer.current)
    setFeedback(null)
    const outcome = await copyDiscountComparison(clicked.text, current)
    if (!current() || outcome === 'stale') return
    setFeedback({ scope: clicked.scope, token, kind: outcome === 'copied' ? 'copied' : 'copyFailed', text: clicked.text })
    if (outcome === 'copied') clearTimer.current = setTimeout(() => { if (current()) setFeedback(null) }, 2000)
  }
  const download = () => {
    const clicked = latest.current
    if (!mounted.current || !clicked.ready || !clicked.text || !downloads.current) return
    clicked.onOutput?.(); setShareRevision(previous => previous + 1)
    const token = guard.begin(), current = () => mounted.current && guard.current(token) && latest.current.scope === clicked.scope
    if (clearTimer.current !== null) clearTimeout(clearTimer.current)
    const outcome = downloads.current.download(clicked.text, current)
    if (current() && outcome !== 'stale') setFeedback({ scope: clicked.scope, token, kind: outcome === 'started' ? 'downloaded' : 'downloadFailed' })
  }
  const activeFeedback = feedback?.scope === scope && guard.current(feedback.token) ? feedback : null
  const shareOutput = () => {
    guard.invalidate(); setFeedback(null); latest.current.onOutput?.()
    if (clearTimer.current !== null) clearTimeout(clearTimer.current)
  }
  const selectionFailed = () => {
    if (mounted.current && latest.current.scope === scope) setFeedback(previous => previous?.scope === scope && previous.kind === 'copyFailed' ? { ...previous, selectionFailed: true } : previous)
  }
  const selectText = () => {
    try { if (!manualRef.current) throw new Error('Missing field'); manualRef.current.focus(); manualRef.current.select(); manualRef.current.setSelectionRange(0, activeFeedback?.text?.length ?? 0) }
    catch { selectionFailed() }
  }
  const canAdd = ready && rows.length < DISCOUNT_COMPARISON_LIMITS.rows
  const sourceAvailable = (price: number | null) => price !== null && createDiscountCondition('source-check', price) !== null
  const resultFields = ['subtotal', 'appliedCoupon', 'excessCoupon', 'goodsTotal', 'shipping', 'total', 'unitAverage'] as const
  const winnerNames = (ids: readonly string[]) => snapshot?.rows.flatMap((row, index) => ids.includes(row.id) ? [rowName(row, index)] : []).join(' / ') ?? ''
  const shareProps = snapshot && shareUrl ? {
    resultKey: JSON.stringify([scope, shareRevision]),
    card: {
      tool: t('title'), label: t('comparison.shareLabel'), headline: t('comparison.shareHeadline', { count: snapshot.rows.length }), sub: t('comparison.shareSummary'),
      rows: snapshot.rows.map((row, index) => ({ label: defaultName(index + 1), value: `${money(row.total)} · ${money(row.unitAverage, true)}` })),
    }, url: shareUrl, text, fileName: 'discount-comparison',
  } : null
  // ShareResult owns async card/link snapshot handling; keep all exports on this scope.

  return <section className="space-y-5" data-discount-comparison aria-labelledby="discount-comparison-title">
    <div className="ui-card min-w-0 space-y-4 p-5">
      <MobileResultLink href="#discount-comparison-result" label={t('comparison.resultTitle')} value={t('comparison.validCount', { valid: evaluation.validCount, total: evaluation.totalCount })} />
      <h2 id="discount-comparison-title" className="text-xl font-semibold text-fg">{t('comparison.title')}</h2>
      <p className="text-sm text-sub">{t('comparison.description')}</p>
      <p className="rounded-xl bg-subtle p-4 text-sm text-body">{t('comparison.formula')}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-discount-action="add" className={buttonClass} disabled={!canAdd} onClick={() => add()}>{t('comparison.add')}</button>
        <button type="button" data-discount-action="import-basic" className={buttonClass} disabled={!canAdd || !sourceAvailable(basicPrice)} onClick={() => add(basicPrice)}>{t('comparison.importBasic')}</button>
        <button type="button" data-discount-action="import-multi" className={buttonClass} disabled={!canAdd || !sourceAvailable(multiPrice)} onClick={() => add(multiPrice)}>{t('comparison.importMulti')}</button>
      </div>
      <p className="text-xs text-sub">{t('comparison.importHint')}</p>
      {rows.length >= DISCOUNT_COMPARISON_LIMITS.rows && <p role="status" className="text-sm text-sub">{t('comparison.limit')}</p>}
      {linkError && <p role="alert" className="text-sm text-red-600">{t('comparison.invalidLink')}</p>}
      {evaluation.error && <p role="alert" className="text-sm text-red-600">{t('comparison.invalidStructure')}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{rows.map((row, index) => {
        const evaluated = evaluation.rows[index]
        return <fieldset key={row.id} data-discount-row={row.id} className="min-w-0 space-y-3 rounded-2xl border border-line bg-subtle p-4">
          <legend className="max-w-full break-words px-1 text-sm font-semibold text-fg">{defaultName(index + 1)}</legend>
          <label className="block space-y-2 text-sm text-body">{t('comparison.name')}<input data-discount-field="name" data-discount-id={row.id} className={fieldClass} value={row.name} maxLength={160} disabled={!ready} aria-invalid={!!evaluated?.errors.name} onChange={event => edit(row.id, 'name', event.target.value)} /></label>
          {evaluated?.errors.name && <p role="alert" className="text-xs text-red-600">{t('comparison.errors.name')}</p>}
          {DISCOUNT_COMPARISON_FIELDS.map(field => <div key={field}>
            <label className="block space-y-2 text-sm text-body">{t(`comparison.fields.${field}`)}<input data-discount-field={field} data-discount-id={row.id} type="text" inputMode="numeric" className={fieldClass} value={row[field]} maxLength={32} disabled={!ready} aria-invalid={!!evaluated?.errors[field]} onChange={event => edit(row.id, field, event.target.value)} /></label>
            {evaluated?.errors[field] && <p role="alert" className="mt-1 text-xs text-red-600">{t(`comparison.errors.${evaluated.errors[field]}`)}</p>}
          </div>)}
          <button type="button" data-discount-remove={row.id} className={buttonClass} disabled={!ready} aria-label={t('comparison.removeNamed', { name: rowName(row, index) })} onClick={() => remove(row.id)}>{t('comparison.remove')}</button>
        </fieldset>
      })}</div>
      <p className="text-xs text-sub">{t('comparison.ranges')} {t('comparison.memory')}</p>
    </div>
    <div id="discount-comparison-result" className="ui-card min-w-0 scroll-mt-20 space-y-4 p-5" aria-labelledby="discount-comparison-results-heading">
      <h3 id="discount-comparison-results-heading" className="text-lg font-semibold text-fg">{t('comparison.resultTitle')}</h3>
      <p data-discount-valid-count role="status" className="text-sm text-body">{t('comparison.validCount', { valid: evaluation.validCount, total: evaluation.totalCount })}</p>
      {!rows.length ? <p className="text-sm text-sub">{t('comparison.empty')}</p> : !evaluation.allReady ? <p data-discount-incomplete className="text-sm text-sub">{t('comparison.incomplete')}</p> : rows.length === 1 ? <p className="text-sm text-sub">{t('comparison.singleCondition')}</p> : <div className="space-y-2 rounded-xl bg-subtle p-4 text-sm text-body">
        <p className="break-words" data-discount-lowest="total">{t('comparison.lowestTotal')}: {winnerNames(evaluation.lowestTotalIds)}</p>
        <p className="break-words" data-discount-lowest="unit">{t('comparison.lowestUnit')}: {winnerNames(evaluation.lowestUnitIds)}</p>
      </div>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{rows.map((row, index) => {
        const evaluated = evaluation.rows[index], result = evaluated?.result
        return <article key={row.id} data-discount-result={row.id} data-discount-status={evaluated?.status} className="min-w-0 space-y-3 rounded-2xl border border-line p-4">
          <h4 className="break-words font-semibold text-fg">{rowName(row, index)}</h4>
          {result ? <>
            <div className="flex flex-wrap gap-2 text-xs text-primary">
              {evaluation.lowestTotalIds.includes(row.id) && <span className="rounded-lg bg-primary-soft px-2 py-1">{t(evaluation.lowestTotalIds.length > 1 ? 'comparison.tiedTotal' : 'comparison.lowestTotal')}</span>}
              {evaluation.lowestUnitIds.includes(row.id) && <span className="rounded-lg bg-primary-soft px-2 py-1">{t(evaluation.lowestUnitIds.length > 1 ? 'comparison.tiedUnit' : 'comparison.lowestUnit')}</span>}
            </div>
            <p className="text-sm text-sub">{money(result.unitPrice)} × {result.quantity}</p>
            <dl className="space-y-2 text-sm">{resultFields.map(field => <div key={field} className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-sub">{labels.fields[field]}</dt><dd className="break-all font-medium tabular-nums text-fg" data-discount-value={field} data-discount-id={row.id}>{money(result[field], field === 'unitAverage')}</dd></div>)}</dl>
          </> : <p className="text-sm text-sub">{t(evaluated?.status === 'missing' ? 'comparison.needsInput' : 'comparison.needsCorrection')}</p>}
        </article>
      })}</div>
      <p className="text-xs text-sub">{t('comparison.averageHint')} {t('comparison.assumption')}</p>
      <div className="flex flex-wrap gap-2"><button type="button" data-discount-action="copy" className={buttonClass} disabled={!ready || !snapshot} onClick={() => void copy()}>{t('comparison.copy')}</button><button type="button" data-discount-action="txt" className={buttonClass} disabled={!ready || !snapshot} onClick={download}>{t('comparison.download')}</button></div>
      {activeFeedback && <p role={activeFeedback.kind === 'copyFailed' || activeFeedback.kind === 'downloadFailed' ? 'alert' : 'status'} data-discount-feedback className="text-sm text-body">{t(`comparison.actions.${activeFeedback.kind}`)}</p>}
      {activeFeedback?.kind === 'copyFailed' && <div className="space-y-2">
        <label className="block space-y-2 text-sm text-body">{t('comparison.manualCopy')}<textarea data-discount-manual ref={manualRef} readOnly value={activeFeedback.text ?? ''} rows={8} className={fieldClass} onFocus={event => { try { event.target.select() } catch { selectionFailed() } }} /></label>
        <button type="button" data-discount-action="select-text" className={buttonClass} onClick={selectText}>{t('comparison.selectText')}</button>
        {activeFeedback.selectionFailed && <p role="status" className="text-sm text-body">{t('comparison.selectionFailed')}</p>}
      </div>}
      <p className="text-xs text-sub">{t('comparison.shareHint')} {t('comparison.shareImageHint')}</p>
      {shareProps && <div data-discount-share-boundary onClickCapture={shareOutput}><ShareResult {...shareProps} /></div>}
    </div>
  </section>
}
