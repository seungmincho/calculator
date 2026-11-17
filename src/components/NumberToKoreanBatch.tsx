'use client'

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/numberToKorean'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import type { NumberCopyRequest, NumberCopyState } from '@/utils/numberToKoreanActions'
import {
  NUMBER_BATCH_MAX_CHARACTERS, NUMBER_BATCH_MAX_LINES, NUMBER_BATCH_MAX_LINE_CHARACTERS,
  convertNumberToKoreanBatch, serializeNumberToKoreanBatch, type NumberBatchExportText,
} from '@/utils/numberToKoreanBatch'

export default function NumberToKoreanBatch({ prefix, spacing, copyState, copyDisabled, onCopy, onInvalidateCopy, recovery }: {
  prefix: string; spacing: boolean; copyState: NumberCopyState | null; copyDisabled: boolean
  onCopy: (request: NumberCopyRequest) => void; onInvalidateCopy: () => void; recovery?: ReactNode
}) {
  const t = useTranslations('numberToKorean')
  const language = useOptionalLanguage()?.language ?? 'ko'
  const [raw, setRaw] = useState('')
  const [notice, setNotice] = useState<'downloadFailed' | null>(null)
  const latestContext = useRef(''), active = useRef(false)
  const copying = copyState?.target === 'batch' && copyState.status === 'copying'
  const copied = copyState?.target === 'batch' && copyState.status === 'copied'
  const result = useMemo(() => convertNumberToKoreanBatch(raw, { prefix, spacing }), [raw, prefix, spacing])
  const hasResults = !result.limit && result.rows.length > 0
  const exportText: NumberBatchExportText = {
    headers: [t('batch.columns.line'), t('batch.columns.label'), t('batch.columns.source'), t('batch.columns.number'), t('batch.columns.reading'), t('batch.columns.formal'), t('batch.columns.status')],
    valid: t('batch.valid'),
    unavailableFormal: t('batch.formalUnavailable'),
    error: (error) => t(`batch.errors.${error}`),
  }

  const copyText = serializeNumberToKoreanBatch(result, 'tsv', exportText)
  const copyContext = JSON.stringify([raw, prefix, spacing, language, copyText, t('editing.batchLabel')])
  useLayoutEffect(() => {
    active.current = true
    return () => { active.current = false; latestContext.current = ''; onInvalidateCopy() }
  }, [onInvalidateCopy])
  useLayoutEffect(() => {
    latestContext.current = copyContext
    onInvalidateCopy()
  }, [copyContext, onInvalidateCopy])
  const copyTable = () => {
    if (!active.current || latestContext.current !== copyContext || !copyText || copying || copyDisabled) return
    onCopy({ text: copyText, target: 'batch', label: t('editing.batchLabel') })
  }

  const downloadCsv = () => {
    const text = serializeNumberToKoreanBatch(result, 'csv', exportText)
    if (!active.current || latestContext.current !== copyContext || !text) return
    setNotice(null)
    let url: string | undefined
    try {
      url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'number-to-korean-batch.csv'
      document.body.appendChild(link)
      try { link.click() } finally { link.remove() }
    } catch {
      setNotice('downloadFailed')
    } finally {
      if (url) {
        const downloadUrl = url
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      }
    }
  }

  return (
    <section className="ui-card min-w-0 p-4 sm:p-6 space-y-5" aria-labelledby="number-batch-heading">
      <div>
        <h2 id="number-batch-heading" className="text-xl font-semibold text-fg">{t('batch.title')}</h2>
        <p className="mt-2 text-sm text-sub">{t('batch.description')}</p>
        <p className="mt-2 text-sm text-sub">{t('batch.options', { prefix: prefix.trim() || t('prefixNone'), spacing: t(spacing ? 'batch.spacingOn' : 'batch.spacingOff') })}</p>
      </div>
      <div>
        <label htmlFor="number-batch-input" className="mb-2 block text-sm font-medium text-body">{t('batch.inputLabel')}</label>
        <textarea
          id="number-batch-input"
          value={raw}
          onChange={(event) => { if (raw !== event.target.value) { latestContext.current = ''; onInvalidateCopy(); setRaw(event.target.value); setNotice(null) } }}
          rows={7}
          spellCheck={false}
          autoComplete="off"
          placeholder={t('batch.placeholder')}
          aria-describedby="number-batch-limits number-batch-privacy"
          className="ui-field min-h-44 min-w-0 w-full resize-y px-4 py-3 font-mono text-base"
        />
        <p id="number-batch-limits" className="mt-2 text-sm text-sub">{t('batch.limits', { lines: NUMBER_BATCH_MAX_LINES, characters: NUMBER_BATCH_MAX_CHARACTERS.toLocaleString(), lineCharacters: NUMBER_BATCH_MAX_LINE_CHARACTERS })}</p>
        <p id="number-batch-privacy" className="mt-1 text-xs text-muted">{t('batch.privacy')}</p>
      </div>
      {result.limit ? (
        <p role="alert" className="rounded-xl bg-subtle p-4 text-sm text-body">{t(`batch.errors.${result.limit}`)}</p>
      ) : (
        <div className="rounded-xl bg-subtle p-4 space-y-2">
          <p role="status" className="text-sm font-medium text-body">{t('batch.summary', { total: result.totalLines, valid: result.validRows, invalid: result.invalidRows, skipped: result.skippedLines })}</p>
          <p className="text-sm text-sub">{t('batch.formalHint', { count: result.unavailableFormalRows })}</p>
          <p className="text-xs text-muted">{t('batch.blankHint')}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" data-number-copy="batch" data-number-copied={copied} disabled={!hasResults || copying || copyDisabled} onClick={copyTable} className="ui-btn min-h-11 px-4 py-3 disabled:opacity-50">{t(copying ? 'batch.copying' : 'batch.copyTable')}</button>
        <button type="button" data-number-download="csv" disabled={!hasResults} onClick={downloadCsv} className="ui-btn-soft min-h-11 px-4 py-3 disabled:opacity-50">{t('batch.downloadCsv')}</button>
      </div>
      {copied && <p role="status" className="text-sm text-primary">{t('batch.copied')}</p>}
      {notice && <p role="alert" className="text-sm text-body">{t(`batch.${notice}`)}</p>}
      {recovery}
      <p className="text-sm text-sub">{t('batch.exportHint')}</p>
      <p className="text-sm text-sub">{t('batch.spreadsheetHint')}</p>
      {hasResults && (
        <div className="max-w-full overflow-x-auto rounded-xl border border-line" role="region" aria-label={t('batch.results')} tabIndex={0}>
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">{t('batch.results')}</caption>
            <thead className="bg-subtle text-body">
              <tr>{exportText.headers.map((header) => <th key={header} scope="col" className="px-3 py-3 text-left font-medium">{header}</th>)}</tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.line} className="border-t border-line align-top">
                  <th scope="row" className="px-3 py-3 text-left font-medium tabular-nums text-body">{row.line}</th>
                  <td className="max-w-40 px-3 py-3 text-body [overflow-wrap:anywhere]">{row.label || t('batch.noValue')}</td>
                  <td className="max-w-60 whitespace-pre-wrap px-3 py-3 font-mono text-sub [overflow-wrap:anywhere]">{row.raw}</td>
                  <td className="max-w-60 px-3 py-3 tabular-nums text-body [overflow-wrap:anywhere]">{row.status === 'valid' ? row.number : t('batch.noValue')}</td>
                  <td className="max-w-60 px-3 py-3 text-fg [overflow-wrap:anywhere]">{row.status === 'valid' ? row.reading : t('batch.noValue')}</td>
                  <td className="max-w-60 px-3 py-3 text-fg [overflow-wrap:anywhere]">{row.status === 'valid' && row.formal ? row.formal : t('batch.noValue')}</td>
                  <td className="max-w-56 px-3 py-3 text-sub [overflow-wrap:anywhere]">{row.status === 'invalid' ? t(`batch.errors.${row.error}`) : row.formal ? t('batch.valid') : t('batch.formalUnavailable')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
