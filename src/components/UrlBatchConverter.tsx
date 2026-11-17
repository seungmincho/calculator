'use client'

import { useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/urlEncoder'
import {
  URL_BATCH_MAX_CHARACTERS, URL_BATCH_MAX_LINES, convertUrlBatch, urlBatchText, urlBatchTsv,
  type UrlBatchMode, type UrlBatchResult, type UrlBatchTableText,
} from '@/utils/urlBatch'

export default function UrlBatchConverter() {
  const t = useTranslations('urlEncoder')
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<UrlBatchMode>('encode')
  const [result, setResult] = useState<UrlBatchResult | null>(null)
  const [notice, setNotice] = useState<'copiedText' | 'copiedTable' | 'copyFailed' | 'downloadFailed' | null>(null)
  const [copying, setCopying] = useState(false)
  const revision = useRef(0)
  const hasResults = !!result && !result.limit && result.rows.length > 0
  const tableText: UrlBatchTableText = {
    headers: [t('batch.columns.line'), t('batch.columns.status'), t('batch.columns.source'), t('batch.columns.result'), t('batch.columns.error')],
    success: t('batch.status.success'), blank: t('batch.status.blank'), error: t('batch.status.error'),
    errorDescription: (error) => t(`batch.errors.${error}`),
  }
  const invalidate = () => { revision.current++; setResult(null); setNotice(null) }
  const convert = () => {
    revision.current++
    setNotice(null)
    setResult(convertUrlBatch(input, mode))
  }

  const copy = async (format: 'text' | 'tsv') => {
    if (!hasResults || !result || copying) return
    const text = format === 'text' ? urlBatchText(result) : urlBatchTsv(result, tableText)
    const currentRevision = revision.current
    setCopying(true)
    setNotice(null)
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        try {
          textarea.select()
          if (!document.execCommand('copy')) throw new Error('Copy failed')
        } finally { textarea.remove() }
      }
      if (revision.current === currentRevision) setNotice(format === 'text' ? 'copiedText' : 'copiedTable')
    } catch {
      if (revision.current === currentRevision) setNotice('copyFailed')
    } finally { setCopying(false) }
  }

  const download = () => {
    if (!hasResults || !result) return
    setNotice(null)
    let url: string | undefined
    try {
      url = URL.createObjectURL(new Blob([urlBatchText(result)], { type: 'text/plain;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = result.mode === 'encode' ? 'url-encoded-lines.txt' : 'url-decoded-lines.txt'
      document.body.appendChild(link)
      try { link.click() } finally { link.remove() }
    } catch { setNotice('downloadFailed') }
    finally {
      if (url) { const downloadUrl = url; setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000) }
    }
  }

  return (
    <section className="ui-card mt-8 min-w-0 space-y-5 p-4 sm:p-6" aria-labelledby="url-batch-heading">
      <div>
        <h2 id="url-batch-heading" className="text-xl font-semibold text-fg">{t('batch.title')}</h2>
        <p className="mt-2 text-sm text-sub">{t('batch.description')}</p>
      </div>
      <div role="group" aria-label={t('batch.modeLabel')} className="grid grid-cols-2 gap-2">
        {(['encode', 'decode'] as const).map((value) => (
          <button key={value} type="button" onClick={() => { setMode(value); invalidate() }} aria-pressed={mode === value} className={`min-h-11 rounded-xl px-3 py-3 text-sm font-medium ${mode === value ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>{t(`batch.modes.${value}`)}</button>
        ))}
      </div>
      <div>
        <label htmlFor="url-batch-input" className="mb-2 block text-sm font-medium text-body">{t('batch.inputLabel')}</label>
        <textarea id="url-batch-input" value={input} onChange={(event) => { setInput(event.target.value); invalidate() }} rows={7} spellCheck={false} autoComplete="off" aria-describedby="url-batch-input-hint" placeholder={t(mode === 'encode' ? 'batch.encodePlaceholder' : 'batch.decodePlaceholder')} className="ui-field min-h-44 min-w-0 w-full resize-y px-4 py-3 font-mono text-base" />
        <p id="url-batch-input-hint" className="mt-2 text-sm text-sub">{t('batch.inputHint', { lines: URL_BATCH_MAX_LINES, characters: URL_BATCH_MAX_CHARACTERS.toLocaleString() })}</p>
        <p className="mt-1 text-xs text-muted">{t('batch.privacy')}</p>
      </div>
      <button type="button" onClick={convert} disabled={input === ''} className="ui-btn min-h-11 px-4 py-3 disabled:opacity-50">{t('batch.convert')}</button>
      {result?.limit && <p role="alert" className="rounded-xl bg-subtle p-4 text-sm text-body">{t(`batch.errors.${result.limit}`)}</p>}
      {hasResults && result && (
        <div className="rounded-xl bg-subtle p-4 space-y-2">
          <p role="status" className="text-sm font-medium text-body">{t('batch.summary', { total: result.rows.length, success: result.successRows, error: result.errorRows, blank: result.blankRows })}</p>
          <p className="text-sm text-sub">{t('batch.errorRowPolicy')}</p>
          {result.multilineRows > 0 && <p className="text-sm text-sub">{t('batch.multilineHint', { count: result.multilineRows })}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { void copy('text') }} disabled={!hasResults || copying} className="ui-btn-soft min-h-11 px-4 py-3 disabled:opacity-50">{t('batch.copyText')}</button>
        <button type="button" onClick={download} disabled={!hasResults} className="ui-btn-soft min-h-11 px-4 py-3 disabled:opacity-50">{t('batch.downloadTxt')}</button>
        <button type="button" onClick={() => { void copy('tsv') }} disabled={!hasResults || copying} className="ui-btn-soft min-h-11 px-4 py-3 disabled:opacity-50">{t('batch.copyTable')}</button>
      </div>
      {notice && <p role={notice === 'copyFailed' || notice === 'downloadFailed' ? 'alert' : 'status'} className="text-sm text-body">{t(`batch.${notice}`)}</p>}
      <p className="text-sm text-sub">{t('batch.spreadsheetHint')}</p>
      {hasResults && result && (
        <div className="max-w-full overflow-x-auto rounded-xl border border-line" role="region" aria-label={t('batch.results')} tabIndex={0}>
          <table className="w-full min-w-[700px] text-sm">
            <caption className="sr-only">{t('batch.results')}</caption>
            <thead className="bg-subtle text-body"><tr>{tableText.headers.map((header) => <th key={header} scope="col" className="px-3 py-3 text-left font-medium">{header}</th>)}</tr></thead>
            <tbody>{result.rows.map((row) => (
              <tr key={row.line} className="border-t border-line align-top">
                <th scope="row" className="px-3 py-3 text-left font-medium tabular-nums text-body">{row.line}</th>
                <td className="px-3 py-3 text-sub">{tableText[row.status]}</td>
                <td className="max-w-72 whitespace-pre-wrap px-3 py-3 font-mono text-body [overflow-wrap:anywhere]">{row.source || t('batch.blankCell')}</td>
                <td className="max-w-72 whitespace-pre-wrap px-3 py-3 font-mono text-fg [overflow-wrap:anywhere]">{row.result || t('batch.blankCell')}</td>
                <td className="max-w-56 px-3 py-3 text-sub [overflow-wrap:anywhere]">{row.error ? t(`batch.errors.${row.error}`) : t('batch.noError')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
