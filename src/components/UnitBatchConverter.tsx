'use client'

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/unitConverter'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { convertUnitBatch, serializeUnitBatch, UNIT_BATCH_MAX_CHARACTERS, UNIT_BATCH_MAX_ROWS, UNIT_BATCH_PREVIEW_ROWS, type UnitBatchSnapshot, type UnitBatchExportLabels } from '@/utils/unitBatch'
import { isUnitFavoritePair, type UnitFavoritePair } from '@/utils/unitFavorites'
import { findUnit } from '@/utils/units'
import { createShareResultDownloads } from '@/utils/shareResultActions'
import type { UnitCopyRequest, UnitCopyState } from '@/utils/unitBatchActions'

interface Props {
  pair: UnitFavoritePair | null; ready: boolean; copyState: UnitCopyState | null
  onCopy: (request: UnitCopyRequest) => void; onInvalidateCopy: () => void; onBeginOutput: () => void; recovery?: ReactNode
}
export default function UnitBatchConverter({ pair, ready, copyState, onCopy, onInvalidateCopy, onBeginOutput, recovery }: Props) {
  const t = useTranslations('unitConverter'), language = useOptionalLanguage()?.language ?? 'ko'
  const [source, setSource] = useState('1\n10\n100'), [result, setResult] = useState<UnitBatchSnapshot | null>(null)
  const [error, setError] = useState<'invalidPair' | 'tooManyCharacters' | 'tooManyRows' | null>(null)
  const [downloadError, setDownloadError] = useState(false)
  const active = useRef(false), currentContext = useRef(''), downloads = useRef<ReturnType<typeof createShareResultDownloads> | null>(null)
  const pairKey = JSON.stringify(pair), resultPairKey = result ? JSON.stringify(result.pair) : ''
  const labels: UnitBatchExportLabels = {
    headers: [t('batch.columns.line'), t('batch.columns.source'), t('batch.columns.from'), t('batch.columns.result'), t('batch.columns.to'), t('batch.columns.status'), t('batch.columns.precision'), t('batch.columns.remBase')],
    valid: t('batch.valid'), blank: t('batch.blank'), error: code => t(`batch.errors.${code}`),
  }
  const tsv = result ? serializeUnitBatch(result, 'tsv', labels) : ''
  const context = JSON.stringify([source, pairKey, result?.source, resultPairKey, ready, language, tsv])
  useLayoutEffect(() => {
    const owner = createShareResultDownloads(); owner.activate(); downloads.current = owner; active.current = true
    return () => { active.current = false; currentContext.current = ''; owner.dispose(); downloads.current = null; onInvalidateCopy() }
  }, [onInvalidateCopy])
  useLayoutEffect(() => { currentContext.current = context; onInvalidateCopy() }, [context, onInvalidateCopy])
  const current = () => active.current && currentContext.current === context
  const edit = (value: string) => {
    if (value === source) return
    currentContext.current = ''; onInvalidateCopy(); setSource(value); setError(null); setDownloadError(false)
  }
  const run = () => {
    if (!current() || !ready) return
    onInvalidateCopy(); setDownloadError(false)
    const next = convertUnitBatch(source, pair)
    if (!next.ok) { setError(next.error); return }
    setResult(next.snapshot); setError(null)
  }
  const stale = !!result && (result.source !== source || resultPairKey !== pairKey)
  const preview = useMemo(() => result?.rows.slice(0, UNIT_BATCH_PREVIEW_ROWS) ?? [], [result])
  const usablePair = isUnitFavoritePair(pair), from = usablePair ? findUnit(pair.c, pair.f)?.sym : '', to = usablePair ? findUnit(pair.c, pair.t)?.sym : ''
  const hasRows = !!result?.rows.length, copying = copyState?.id === 'batch' && copyState.status === 'copying', copied = copyState?.id === 'batch' && copyState.status === 'copied'
  const copy = () => { if (current() && ready && hasRows && !copying) onCopy({ id: 'batch', text: tsv, label: t('batch.copyLabel') }) }
  const csv = () => {
    if (!current() || !ready || !result || !hasRows || !downloads.current) return
    onBeginOutput()
    setDownloadError(false)
    try {
      const text = serializeUnitBatch(result, 'csv', labels), blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
      const outcome = downloads.current.download(blob, 'unit-conversion-batch.csv', current)
      if (current() && outcome === 'failed') setDownloadError(true)
    } catch { if (current()) setDownloadError(true) }
  }
  return <section data-unit-batch="" aria-labelledby="unit-batch-title" className="ui-card min-w-0 space-y-5 p-4 sm:p-6">
    <div><h2 id="unit-batch-title" className="text-xl font-semibold text-fg">{t('batch.title')}</h2><p className="mt-2 text-sm text-sub">{t('batch.description')}</p></div>
    <p data-unit-batch-pair="" className="rounded-xl bg-subtle p-3 text-sm text-body">{usablePair ? t('batch.currentPair', { from, to, precision: pair.p }) : t('batch.choosePair')}{usablePair && pair.c === 'css' ? ' ' + t('batch.remBase', { value: pair.rb }) : ''}</p>
    <div><label htmlFor="unit-batch-input" className="mb-2 block text-sm font-medium text-body">{t('batch.input')}</label>
      <textarea id="unit-batch-input" value={source} onChange={event => edit(event.target.value)} rows={6} spellCheck={false} className="ui-field w-full min-w-0 resize-y px-3 py-3 font-mono text-base" />
      <p className="mt-2 text-xs text-muted">{t('batch.limits', { rows: UNIT_BATCH_MAX_ROWS, characters: UNIT_BATCH_MAX_CHARACTERS })}</p>
      <p className="mt-1 text-xs text-muted">{t('batch.linePolicy')}</p>
    </div>
    <div className="flex flex-wrap gap-2"><button type="button" data-unit-batch-run="" disabled={!ready || !usablePair} onClick={run} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('batch.run')}</button>
      <button type="button" data-unit-batch-clear="" onClick={() => edit('')} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('batch.clear')}</button></div>
    {error && <p role="alert" data-unit-batch-error={error} className="text-sm text-body">{t(`batch.errors.${error}`)}</p>}
    {result ? <div className="min-w-0 space-y-4" data-unit-batch-result="" data-unit-batch-stale={stale}>
      <p className="text-sm font-medium text-body">{t('batch.resultPair', { from: result.fromSymbol, to: result.toSymbol, precision: result.pair.p })}{result.pair.c === 'css' ? ' ' + t('batch.remBase', { value: result.pair.rb }) : ''}</p>
      {stale && <p role="status" className="rounded-xl bg-subtle p-3 text-sm text-body">{t('batch.previous')}</p>}
      <p data-unit-batch-counts="" className="text-sm tabular-nums text-sub">{t('batch.counts', { total: result.rows.length, valid: result.valid, invalid: result.invalid, blank: result.blank })}</p>
      <p className="text-xs text-muted">{t('batch.preview', { visible: preview.length, total: result.rows.length })}</p>
      <div className="max-h-96 overflow-auto rounded-xl border border-line"><table className="w-full text-left text-sm"><caption className="sr-only">{t('batch.table')}</caption>
        <thead className="bg-subtle text-body"><tr>{['line', 'source', 'result', 'status'].map(column => <th key={column} scope="col" className="px-3 py-2">{t(`batch.columns.${column}`)}</th>)}</tr></thead>
        <tbody>{preview.map(row => <tr key={row.line} data-unit-batch-line={row.line} className="border-t border-line align-top"><th scope="row" className="px-3 py-2 font-normal tabular-nums text-sub">{row.line}</th><td className="max-w-48 whitespace-pre-wrap break-all px-3 py-2 text-body">{row.raw || t('batch.emptyCell')}</td><td className="whitespace-nowrap px-3 py-2 tabular-nums text-fg">{row.status === 'valid' ? row.formatted + ' ' + result.toSymbol : t('batch.emptyCell')}</td><td className="min-w-28 px-3 py-2 text-sub">{row.status === 'valid' ? t('batch.valid') : row.status === 'blank' ? t('batch.blank') : t(`batch.errors.${row.error}`)}</td></tr>)}</tbody>
      </table></div>
      <div className="flex flex-wrap gap-2"><button type="button" data-unit-batch-copy="" onClick={copy} disabled={!ready || !hasRows || copying} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t(copied ? 'batch.copied' : copying ? 'batch.copying' : 'batch.copy')}</button><button type="button" data-unit-batch-csv="" onClick={csv} disabled={!ready || !hasRows} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('batch.csv')}</button></div>
      {downloadError && <p role="alert" className="text-sm text-body">{t('batch.downloadFailed')}</p>}
      {recovery}
    </div> : <p className="text-sm text-muted">{t('batch.pending')}</p>}
    <p className="text-xs text-muted">{t('batch.privacy')}</p>
  </section>
}
