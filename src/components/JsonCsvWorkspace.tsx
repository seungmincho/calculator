'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/jsonCsvConverter'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'
import { convertJsonCsv, DEFAULT_JSON_CSV_OPTIONS, JSON_CSV_LIMITS, JsonCsvError, type CsvDelimiter, type JsonCsvMode, type JsonCsvOptions, type JsonCsvResult } from '@/utils/jsonCsv'
import { createJsonCsvActionGuard, copyJsonCsvText, type JsonCsvFileEncoding } from '@/utils/jsonCsvActions'
import { createJsonCsvClient } from '@/lib/jsonCsv/client'
import { JsonCsvExecutionError, type JsonCsvExecutionCode } from '@/lib/jsonCsv/protocol'
import { JSON_CSV_VISIBLE_CELLS, jsonCsvTextPage } from '@/utils/jsonCsvPreview'

type Confirmed = { result: JsonCsvResult; revision: number; elapsed: number; example: boolean }
type Issue = { kind: 'conversion'; error: JsonCsvError } | { kind: 'file'; error: 'fileLimit' | 'decodedLimit' | 'encoding' | 'read' } | { kind: 'worker'; error: JsonCsvExecutionCode }
const field = 'ui-field min-h-11 w-full px-3 py-2 text-base'
const button = 'ui-btn-soft min-h-11 px-4 py-2 text-base disabled:opacity-40'
function executionIssue(cause: unknown): Issue | null {
  if (!(cause instanceof JsonCsvExecutionError)) return { kind: 'worker', error: 'workerFailed' }
  const failure = cause.failure
  if (failure.scope === 'conversion') return { kind: 'conversion', error: new JsonCsvError(failure.code, failure.position) }
  if (failure.scope === 'file') return { kind: 'file', error: failure.code }
  return failure.code === 'canceled' ? null : { kind: 'worker', error: failure.code }
}

function legacyCopy(text: string): boolean {
  const previous = document.activeElement, input = document.createElement('textarea')
  input.value = text; input.readOnly = true; input.style.position = 'fixed'; input.style.left = '-9999px'
  document.body.appendChild(input)
  try { input.focus(); input.select(); return document.execCommand('copy') === true }
  finally { input.remove(); if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) }
}

export default function JsonCsvWorkspace() {
  const t = useTranslations('jsonCsvConverter')
  const [sample] = useState(() => {
    const json = JSON.stringify([
      { [t('fidelity.sample.name')]: t('fidelity.sample.first'), [t('fidelity.sample.code')]: '00123', [t('fidelity.sample.note')]: t('fidelity.sample.multiline') },
      { [t('fidelity.sample.name')]: t('fidelity.sample.second'), [t('fidelity.sample.code')]: '00987', [t('fidelity.sample.note')]: '' },
    ], null, 2)
    const result = convertJsonCsv(json, 'jsonToCsv')
    return { json, csv: result.text, result }
  })
  const [mode, setMode] = useState<JsonCsvMode>('jsonToCsv')
  const [inputs, setInputs] = useState({ jsonToCsv: sample.json, csvToJson: sample.csv })
  const [options, setOptions] = useState<JsonCsvOptions>({ ...DEFAULT_JSON_CSV_OPTIONS })
  const [encoding, setEncoding] = useState<JsonCsvFileEncoding>('utf-8')
  const [revision, setRevision] = useState(0)
  const [confirmed, setConfirmed] = useState<Confirmed>({ result: sample.result, revision: 0, elapsed: 0, example: true })
  const [issue, setIssue] = useState<Issue | null>(null)
  const [processing, setProcessing] = useState(false), [reading, setReading] = useState(false)
  const [collapsed, setCollapsed] = useState(false), [view, setView] = useState<'text' | 'table'>('text')
  const [page, setPage] = useState(0), [pageSize, setPageSize] = useState(100)
  const [textPageIndex, setTextPageIndex] = useState(0), [canceled, setCanceled] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'pending' | 'copied' | 'failed'>('idle')
  const [selectionFailed, setSelectionFailed] = useState(false)
  const [downloadState, setDownloadState] = useState<'idle' | 'requested' | 'failed'>('idle')
  const guard = useRef(createJsonCsvActionGuard()), operation = useRef(0), alive = useRef(true)
  const client = useRef<ReturnType<typeof createJsonCsvClient> | null>(null)
  const abortRead = useRef<(() => void) | null>(null), fileInput = useRef<HTMLInputElement>(null), manual = useRef<HTMLTextAreaElement>(null)
  const urls = useRef(new Set<string>())
  const result = confirmed.result, dirty = confirmed.revision !== revision || result.mode !== mode
  const locked = dirty || processing || reading
  const rowsOnPage = Math.max(1, Math.min(pageSize, Math.floor(JSON_CSV_VISIBLE_CELLS / Math.max(1, result.headers.length))))
  const pageCount = Math.max(1, Math.ceil(result.rows.length / rowsOnPage)), currentPage = Math.min(page, pageCount - 1)
  const textPage = useMemo(() => jsonCsvTextPage(result.text, textPageIndex), [result.text, textPageIndex])

  function cancelPending() {
    guard.current.invalidate(); operation.current++; client.current?.cancel()
    const abort = abortRead.current; abortRead.current = null; abort?.()
    setReading(false); setProcessing(false); setCopyState('idle'); setDownloadState('idle'); setIssue(null); setExpanded(null); setSelectionFailed(false); setCanceled(false)
  }
  function changeInput(value: string) { cancelPending(); setInputs(previous => ({ ...previous, [mode]: value })); setRevision(previous => previous + 1) }
  function changeOptions(patch: Partial<JsonCsvOptions>) { cancelPending(); setOptions(previous => ({ ...previous, ...patch })); setRevision(previous => previous + 1) }
  function changeMode(next: JsonCsvMode) { if (next !== mode) { cancelPending(); setMode(next); setRevision(previous => previous + 1) } }
  function changeEncoding(value: JsonCsvFileEncoding) { cancelPending(); setEncoding(value) }
  useEffect(() => {
    alive.current = true
    const actions = guard.current, activeUrls = urls.current, input = fileInput.current, jobCounter = operation, jobs = client
    const onCancel = () => { actions.cancelRead(); jobs.current?.cancel(); const abort = abortRead.current; abortRead.current = null; abort?.(); if (alive.current) { setReading(false); setCanceled(true) } }
    input?.addEventListener('cancel', onCancel)
    return () => {
      alive.current = false; actions.invalidate(); jobCounter.current++
      jobs.current?.dispose(); jobs.current = null
      const abort = abortRead.current; abortRead.current = null; abort?.()
      input?.removeEventListener('cancel', onCancel)
      activeUrls.forEach(url => URL.revokeObjectURL(url)); activeUrls.clear()
    }
  }, [])
  async function convert() {
    cancelPending()
    const ticket = operation.current, input = inputs[mode], chosenMode = mode, chosenOptions = { ...options }, chosenRevision = revision
    setProcessing(true)
    try {
      client.current ??= createJsonCsvClient()
      const converted = await client.current.convert(input, chosenMode, chosenOptions)
      if (!alive.current || ticket !== operation.current) return
      setConfirmed({ result: converted.result, revision: chosenRevision, elapsed: converted.computeMs, example: false }); setPage(0); setTextPageIndex(0); setExpanded(null)
    } catch (cause) {
      if (alive.current && ticket === operation.current) setIssue(executionIssue(cause))
    } finally { if (alive.current && ticket === operation.current) setProcessing(false) }
  }
  async function openFile(file?: File) {
    cancelPending()
    if (!file) return
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > JSON_CSV_LIMITS.inputBytes) { setIssue({ kind: 'file', error: 'fileLimit' }); return }
    const actions = guard.current, token = actions.beginRead(), chosenMode = mode, chosenEncoding = encoding
    const current = () => alive.current && actions.isCurrent(token)
    setReading(true)
    try {
      const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader(); abortRead.current = () => reader.abort()
        reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('read'))
        reader.onerror = () => reject(new Error('read')); reader.onabort = () => reject(new Error('canceled')); reader.readAsArrayBuffer(file)
      })
      if (!current()) return
      abortRead.current = null
      client.current ??= createJsonCsvClient()
      const outcome = await client.current.decode(bytes, chosenEncoding)
      if (!current()) return
      setInputs(previous => ({ ...previous, [chosenMode]: outcome.text })); setRevision(previous => previous + 1)
    } catch (cause) {
      if (current()) setIssue(cause instanceof JsonCsvExecutionError ? executionIssue(cause) : { kind: 'file', error: 'read' })
    } finally { if (current()) { abortRead.current = null; setReading(false) } }
  }
  async function copy() {
    if (locked) return
    const actions = guard.current, token = actions.beginCopy(), text = result.text
    const current = () => alive.current && actions.isCurrent(token)
    setCopyState('pending'); setSelectionFailed(false)
    const outcome = await copyJsonCsvText(text, { write: navigator.clipboard?.writeText ? value => navigator.clipboard.writeText(value) : undefined, fallback: legacyCopy }, current)
    if (current() && outcome !== 'stale') setCopyState(outcome === 'copied' ? 'copied' : 'failed')
  }
  function selectManual() {
    try { if (!manual.current) throw new Error('missing'); manual.current.focus(); manual.current.select(); setSelectionFailed(false) } catch { setSelectionFailed(true) }
  }
  function download() {
    if (locked) return
    let url: string | null = null, anchor: HTMLAnchorElement | null = null
    try {
      url = URL.createObjectURL(new Blob([result.text], { type: result.mime })); urls.current.add(url)
      anchor = document.createElement('a'); anchor.href = url; anchor.download = result.filename
      document.body.appendChild(anchor); anchor.click(); setDownloadState('requested')
      const created = url
      setTimeout(() => { if (urls.current.delete(created)) URL.revokeObjectURL(created) }, 1000)
    } catch { if (url && urls.current.delete(url)) URL.revokeObjectURL(url); setDownloadState('failed') }
    finally { anchor?.remove() }
  }
  // Retain the same React element subtree during input/copy status updates.
  const resultView = useMemo(() => (view === 'text' ? <>
      <p data-json-csv-preview-range className="text-sm text-sub">{t('fidelity.previewRange', { start: textPage.total ? textPage.start + 1 : 0, end: textPage.end, total: textPage.total })}</p>
      <p className="text-xs text-muted">{t('fidelity.previewHint')}</p>
      {textPage.pages > 1 && <nav aria-label={t('fidelity.textPages')} className="flex flex-wrap items-center gap-2">
        <button type="button" data-json-csv-text-page="first" disabled={textPage.page === 0} className={button} onClick={() => { setTextPageIndex(0); setExpanded(null) }}>{t('pagination.first')}</button>
        <button type="button" data-json-csv-text-page="previous" disabled={textPage.page === 0} className={button} onClick={() => { setTextPageIndex(textPage.page - 1); setExpanded(null) }}>{t('fidelity.previous')}</button>
        <span data-json-csv-text-page-index={textPage.page} className="text-sm text-sub">{t('fidelity.page', { page: textPage.page + 1, pages: textPage.pages })}</span>
        <button type="button" data-json-csv-text-page="next" disabled={textPage.page >= textPage.pages - 1} className={button} onClick={() => { setTextPageIndex(textPage.page + 1); setExpanded(null) }}>{t('fidelity.next')}</button>
        <button type="button" data-json-csv-text-page="last" disabled={textPage.page >= textPage.pages - 1} className={button} onClick={() => { setTextPageIndex(textPage.pages - 1); setExpanded(null) }}>{t('pagination.last')}</button>
      </nav>}
      <textarea key={textPage.page} id="json-csv-output" data-json-csv-preview-start={textPage.start} data-json-csv-preview-end={textPage.end} data-json-csv-preview-total={textPage.total} aria-label={t('fidelity.previewLabel')} readOnly wrap="off" value={textPage.text} className={`${field} min-h-80 font-mono`} />
    </> : <>
        <div className="flex flex-wrap items-center gap-2"><label className="text-sm text-body">{t('pagination.rowsPerPage')}<select data-json-csv-page-size value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(0); setExpanded(null) }} className={`${field} mt-1`}>{[50, 100, 500, 1000].map(value => <option key={value} value={value}>{value}</option>)}</select></label><button type="button" className={button} disabled={currentPage === 0} onClick={() => { setPage(0); setExpanded(null) }}>{t('pagination.first')}</button><button type="button" className={button} disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setExpanded(null) }}>{t('fidelity.previous')}</button><span className="text-sm text-sub">{t('fidelity.page', { page: currentPage + 1, pages: pageCount })}</span><button type="button" className={button} disabled={currentPage >= pageCount - 1} onClick={() => { setPage(currentPage + 1); setExpanded(null) }}>{t('fidelity.next')}</button><button type="button" className={button} disabled={currentPage >= pageCount - 1} onClick={() => { setPage(pageCount - 1); setExpanded(null) }}>{t('pagination.last')}</button></div>
        {rowsOnPage < pageSize && <p className="text-xs text-muted">{t('fidelity.pageLimit', { rows: rowsOnPage })}</p>}
        <div className="max-h-[60vh] overflow-auto rounded-xl border border-line" tabIndex={0} aria-label={t('result.tableView')}><table data-json-csv-table className="w-full border-collapse text-sm"><thead className="bg-subtle"><tr>{result.headers.map((header, index) => <th key={index} className="border-b border-line p-2 text-left"><button type="button" onClick={() => setExpanded(header)} className="min-h-11 max-w-64 break-all text-left font-semibold text-fg" aria-label={t('fidelity.expandHeader', { column: index + 1, name: header.slice(0, 80) })}>{header.slice(0, 80)}{header.length > 80 ? '…' : ''}</button></th>)}</tr></thead><tbody>{result.rows.slice(currentPage * rowsOnPage, (currentPage + 1) * rowsOnPage).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column} className="border-b border-line p-2 align-top"><button type="button" data-json-csv-cell={`${currentPage * rowsOnPage + rowIndex}-${column}`} onClick={() => setExpanded(String(cell))} aria-label={t('fidelity.expandCellAt', { row: currentPage * rowsOnPage + rowIndex + 1, column: column + 1, preview: String(cell).slice(0, 80) })} className="min-h-11 min-w-28 max-w-64 whitespace-pre-wrap break-all text-left text-base text-body">{String(cell).slice(0, 80)}{String(cell).length > 80 ? '…' : ''}</button></td>)}</tr>)}</tbody></table></div>
        <p className="text-sm text-sub">{t('result.showingRows', { start: result.rows.length ? currentPage * rowsOnPage + 1 : 0, end: Math.min((currentPage + 1) * rowsOnPage, result.rows.length), total: result.rows.length })}</p>
      </>), [view, textPage, result, currentPage, rowsOnPage, pageSize, pageCount, t])
  const manualField = useMemo(() => <textarea id="json-csv-manual" ref={manual} readOnly wrap="off" value={result.text} className={`${field} min-h-40 font-mono`} />, [result.text])
  const issueMessage = issue?.kind === 'conversion' ? t(`fidelity.errors.${issue.error.code}`) : issue?.kind === 'worker' ? t(`fidelity.workerErrors.${issue.error}`) : issue ? t(`fidelity.${({ fileLimit: 'fileLimit', decodedLimit: 'decodedLimit', encoding: 'encodingFailed', read: 'readFailed' } as const)[issue.error]}`) : ''

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6" data-json-csv-mode={mode}>
    <header><h1 className="text-2xl font-bold text-fg">{t('title')}</h1><p className="mt-1 text-sm text-sub">{t('description')}</p></header>
    <div role="group" aria-label={t('fidelity.direction')} className="grid grid-cols-2 gap-2">{(['jsonToCsv', 'csvToJson'] as const).map(value => <button type="button" key={value} data-json-csv-mode-button={value} aria-pressed={mode === value} onClick={() => changeMode(value)} className={`min-h-11 rounded-xl px-3 py-3 text-base ${mode === value ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(`tabs.${value}`)}</button>)}</div>
    <section className="ui-card min-w-0 space-y-4 p-4 sm:p-6">
      <MobileResultLink href="#json-csv-result" label={t('result.title')} value={dirty ? t('fidelity.needsConversion') : t('result.totalRows', { count: result.stats.rows })} />
      <button type="button" aria-expanded={!collapsed} aria-controls="json-csv-input-area" onClick={() => setCollapsed(value => !value)} className={`${button} w-full text-left`}>{t(collapsed ? 'fidelity.showInput' : 'fidelity.hideInput')}</button>
      <div id="json-csv-input-area" hidden={collapsed} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <label htmlFor="json-csv-input" className="block font-semibold text-fg">{t(mode === 'jsonToCsv' ? 'input.jsonInput' : 'input.csvInput')}</label>
          <label onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void openFile(event.dataTransfer.files[0]) }} className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line-strong bg-subtle p-4 text-center text-base text-body focus-within:ring-2 focus-within:ring-primary">{t('input.dragDrop')}<input id="json-csv-file" ref={fileInput} type="file" accept={mode === 'jsonToCsv' ? '.json,.txt' : '.csv,.tsv,.txt'} className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void openFile(file) }} /></label>
          <textarea id="json-csv-input" data-json-csv-input wrap="off" value={inputs[mode]} onChange={event => changeInput(event.target.value)} spellCheck={false} className={`${field} min-h-64 resize-y font-mono`} />
          <p className="text-xs leading-relaxed text-muted">{t('fidelity.limits')}</p>
          <button type="button" data-json-csv-convert onClick={() => { void convert() }} disabled={processing || reading} className="ui-btn min-h-11 w-full px-4 py-3 text-base disabled:opacity-40">{t(processing ? 'fidelity.processing' : 'fidelity.convert')}</button>
          {(processing || reading) && <div className="flex flex-wrap items-center gap-3"><p data-json-csv-job={reading ? 'reading' : 'processing'} role="status" className="text-sm text-sub">{t(reading ? 'fidelity.reading' : 'fidelity.processing')}</p><button type="button" data-json-csv-cancel className={button} onClick={() => { cancelPending(); setCanceled(true) }}>{t('fidelity.cancel')}</button></div>}
          {canceled && <p data-json-csv-canceled role="status" className="text-sm text-sub">{t('fidelity.canceled')}</p>}
        </div>
        <div className="min-w-0 space-y-4">
          <h2 className="font-semibold text-fg">{t('options.title')}</h2>
          <div className="flex flex-wrap gap-2" aria-label={t('presets.title')}>{(['standard', 'excel', 'tsv', 'pipe', 'korean'] as const).map(preset => <button type="button" key={preset} className={button} onClick={() => { changeOptions({ delimiter: preset === 'tsv' ? '\t' : preset === 'pipe' ? '|' : ',', header: true, bom: preset === 'excel' }); if (preset === 'korean') setEncoding('euc-kr') }}>{t(`presets.${preset}`)}</button>)}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-body"><span>{t('options.delimiter')}</span><select data-json-csv-option="delimiter" value={options.delimiter} onChange={event => changeOptions({ delimiter: event.target.value as CsvDelimiter })} className={field}>{([',', '\t', '|', ';'] as const).map((value, index) => <option key={value} value={value}>{t(`fidelity.delimiters.${index}`)}</option>)}</select></label>
            <label className="space-y-1 text-sm text-body"><span>{t('fidelity.fileEncoding')}</span><select data-json-csv-option="encoding" value={encoding} onChange={event => changeEncoding(event.target.value as JsonCsvFileEncoding)} className={field}><option value="utf-8">{t('fidelity.utf8')}</option><option value="euc-kr">{t('fidelity.eucKr')}</option></select></label>
          </div>
          <p className="text-xs text-muted">{t('fidelity.encodingHint')}</p>
          <label className="flex min-h-11 items-center gap-3 text-base text-body"><input data-json-csv-option="header" type="checkbox" checked={options.header} onChange={event => changeOptions({ header: event.target.checked })} className="size-5 accent-primary" />{t('options.header')}</label>
          {mode === 'jsonToCsv' ? <>
            <label className="block space-y-1 text-sm text-body"><span>{t('options.nested')}</span><select data-json-csv-option="nested" value={options.nested} onChange={event => changeOptions({ nested: event.target.value as JsonCsvOptions['nested'] })} className={field}><option value="flatten">{t('options.flatten')}</option><option value="preserve">{t('options.preserve')}</option></select></label>
            <label className="block space-y-1 text-sm text-body"><span>{t('options.arrayHandling')}</span><select data-json-csv-option="arrayHandling" value={options.arrayHandling} disabled={options.nested === 'preserve'} onChange={event => changeOptions({ arrayHandling: event.target.value as JsonCsvOptions['arrayHandling'] })} className={field}><option value="join">{t('options.join')}</option><option value="separate">{t('options.separate')}</option></select></label>
            <p className="text-xs text-muted">{t('fidelity.nestedHint')}</p>
            <label className="flex min-h-11 items-center gap-3 text-base text-body"><input data-json-csv-option="bom" type="checkbox" checked={options.bom} onChange={event => changeOptions({ bom: event.target.checked })} className="size-5 accent-primary" />{t('fidelity.bom')}</label>
          </> : <><p className="text-sm text-sub">{t('fidelity.strings')}</p><label className="flex min-h-11 items-center gap-3 text-base text-body"><input data-json-csv-option="numbers" type="checkbox" checked={options.numbers} onChange={event => changeOptions({ numbers: event.target.checked })} className="size-5 accent-primary" />{t('fidelity.numbers')}</label><p className="text-xs leading-relaxed text-muted">{t('fidelity.numbersHint')}</p></>}
        </div>
      </div>
      {issue && <div role="alert" data-json-csv-error className="space-y-1 rounded-xl bg-subtle p-4 text-sm text-body"><p>{issueMessage}</p>{issue.kind === 'conversion' && issue.error.position.row && <p>{t('fidelity.position', { row: issue.error.position.row, column: issue.error.position.column ?? 1 })}</p>}{issue.kind === 'conversion' && issue.error.position.line && <p>{t('fidelity.physicalLine', { line: issue.error.position.line })}</p>}</div>}
    </section>
    <section id="json-csv-result" data-json-csv-result={dirty ? 'stale' : 'current'} className="ui-card min-w-0 scroll-mt-20 space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-fg">{t('result.title')}</h2><p role="status" className="text-sm text-sub">{t(dirty ? 'fidelity.changed' : confirmed.example ? 'fidelity.exampleResult' : 'fidelity.confirmed')}</p>
      <dl data-json-csv-stats className="grid grid-cols-2 gap-3 rounded-xl bg-subtle p-4 text-sm sm:grid-cols-4">
        <div><dt className="text-muted">{t('result.rows')}</dt><dd data-json-csv-stat="rows" className="font-semibold text-fg">{result.stats.rows}</dd></div><div><dt className="text-muted">{t('result.columns')}</dt><dd data-json-csv-stat="columns" className="font-semibold text-fg">{result.stats.columns}</dd></div><div><dt className="text-muted">{t('result.size')}</dt><dd data-json-csv-stat="bytes" className="break-all font-semibold text-fg">{t('fidelity.bytes', { bytes: result.stats.bytes })}</dd></div><div><dt className="text-muted">{t('fidelity.workerTime')}</dt><dd data-json-csv-compute-ms={confirmed.example ? undefined : confirmed.elapsed} className="font-semibold text-fg">{confirmed.example ? t('fidelity.notMeasured') : t('fidelity.milliseconds', { ms: confirmed.elapsed.toFixed(1) })}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">{(['text', 'table'] as const).map(value => <button type="button" key={value} data-json-csv-view={value} aria-pressed={view === value} onClick={() => { setView(value); setExpanded(null) }} className={`min-h-11 rounded-xl px-4 py-2 text-base ${view === value ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(value === 'text' ? 'result.textView' : 'result.tableView')}</button>)}</div>
      {resultView}
      {expanded !== null && <div className="space-y-2 rounded-xl bg-subtle p-3"><label htmlFor="json-csv-cell-full" className="text-sm text-body">{t('fidelity.cellContent')}</label><textarea id="json-csv-cell-full" readOnly wrap="off" value={expanded} className={`${field} min-h-32 font-mono`} /><button type="button" className={button} onClick={() => setExpanded(null)}>{t('fidelity.closeCell')}</button></div>}
      <div className="flex flex-wrap gap-2"><button type="button" data-json-csv-copy disabled={locked} className={button} onClick={() => { void copy() }}>{t(copyState === 'pending' ? 'fidelity.copying' : 'fidelity.copyAll')}</button><button type="button" data-json-csv-download disabled={locked} className={button} onClick={download}>{t('fidelity.downloadAll')}</button></div>
      {copyState === 'copied' && <p role="status" className="text-sm text-sub">{t('fidelity.copied')}</p>}
      {copyState === 'failed' && !locked && <div data-json-csv-copy-recovery className="space-y-3 rounded-xl bg-subtle p-4"><p role="alert" className="text-sm text-body">{t('fidelity.copyFailed')}</p><label htmlFor="json-csv-manual" className="block text-sm text-body">{t('fidelity.manualCopy')}</label><p className="text-xs text-muted">{t('fidelity.manualHint')}</p>{manualField}<div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={selectManual}>{t('fidelity.select')}</button><button type="button" className={button} onClick={() => { void copy() }}>{t('fidelity.retry')}</button></div>{selectionFailed && <p role="alert" className="text-sm text-body">{t('fidelity.selectionFailed')}</p>}</div>}
      {downloadState !== 'idle' && <p role={downloadState === 'failed' ? 'alert' : 'status'} className="text-sm text-sub">{t(downloadState === 'failed' ? 'fidelity.downloadFailed' : 'fidelity.downloadRequested')}</p>}
    </section>
    <GuideSection namespace="jsonCsvConverter" />
  </div>
}
