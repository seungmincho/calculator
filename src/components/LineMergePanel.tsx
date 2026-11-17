'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/diffViewer'
import { lineMergePreview, shortenLineMergePreview, type LineMergeDocument, type LineMergeOutput, type LineMergeSide } from '@/utils/lineMerge'

const BLOCKS_PER_PAGE = 6
interface Props {
  document: LineMergeDocument; output: LineMergeOutput; stale: boolean; disabled?: boolean; copying?: boolean
  onChoose: (document: LineMergeDocument, blockId: string, side: LineMergeSide) => void
  onAll: (document: LineMergeDocument, side: LineMergeSide) => void
  onCopy: (output: LineMergeOutput) => void; onDownload: (output: LineMergeOutput) => void
}
export default function LineMergePanel({ document, output, stale, disabled = false, copying = false, onChoose, onAll, onCopy, onDownload }: Props) {
  const t = useTranslations('diffViewer')
  const [blockPage, setBlockPage] = useState(0), [resultPage, setResultPage] = useState(0)
  const matches = document.id === output.documentId
  const blockPages = Math.max(1, Math.ceil(document.blocks.length / BLOCKS_PER_PAGE)), shownBlockPage = Math.min(blockPage, blockPages - 1)
  const blocks = document.blocks.slice(shownBlockPage * BLOCKS_PER_PAGE, (shownBlockPage + 1) * BLOCKS_PER_PAGE)
  const preview = useMemo(() => lineMergePreview(output, resultPage), [output, resultPage])
  const choices = new Map(output.choices.map(choice => [choice.blockId, choice.side]))
  const selected = output.choices.filter(choice => choice.side === 'modified').length
  const blocked = disabled || !matches
  return <section id="line-merge-result" data-line-merge="" data-line-merge-document={document.id} aria-labelledby="line-merge-title" className="ui-card min-w-0 scroll-mt-20 space-y-5 p-4 sm:p-6">
    <div><h2 id="line-merge-title" className="text-xl font-semibold text-fg">{t('merge.title')}</h2><p className="mt-2 text-sm text-sub">{t('merge.description')}</p></div>
    {stale && <p role="status" data-line-merge-stale="" className="rounded-xl bg-subtle p-3 text-sm text-body">{t('merge.previous')}</p>}
    {!matches && <p role="alert" className="text-sm text-body">{t('merge.invalid')}</p>}
    <p data-line-merge-summary="" className="text-sm text-sub">{t('merge.selected', { selected, total: document.blocks.length })}</p>
    {document.blocks.length > 0 ? <>
      <div className="flex flex-wrap gap-2"><button type="button" data-line-merge-all="original" onClick={() => onAll(document, 'original')} disabled={blocked || selected === 0} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('merge.allOriginal')}</button><button type="button" data-line-merge-all="modified" onClick={() => onAll(document, 'modified')} disabled={blocked || selected === document.blocks.length} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('merge.allModified')}</button></div>
      <div className="space-y-4">{blocks.map(block => <fieldset key={block.id} data-line-merge-block={block.id} className="min-w-0 rounded-xl border border-line p-3">
        <legend className="px-1 text-sm font-semibold text-fg">{t('merge.block', { number: block.number })}</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{(['original', 'modified'] as const).map(side => <div key={side} className="min-w-0">
          <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ${choices.get(block.id) === side ? 'bg-primary-soft text-primary' : 'bg-soft text-body'}`}>
            <input type="radio" name={`merge-${block.id}`} value={side} checked={choices.get(block.id) === side} disabled={blocked} onChange={event => { if (event.target.checked) onChoose(document, block.id, side) }} className="size-5 shrink-0 accent-primary" />{t(`merge.${side}`)}
          </label>
          <p className="mt-2 text-xs text-sub">{t('merge.lines', { count: block[side].length })}</p>
          <div className="mt-2 min-w-0 rounded-lg bg-subtle p-2 font-mono text-xs leading-relaxed text-body [overflow-wrap:anywhere]">
            {block[side].length ? block[side].slice(0, 3).map((line, index) => <p key={index} className="whitespace-pre-wrap">{shortenLineMergePreview(line, 384) || t('merge.blankLine')}{line.length > 384 ? t('merge.ellipsis') : ''}</p>) : <p className="text-muted">{t('merge.noLines')}</p>}
            {block[side].length > 3 && <p className="mt-1 text-muted">{t('merge.moreLines', { count: block[side].length - 3 })}</p>}
          </div>
        </div>)}</div>
      </fieldset>)}</div>
      {blockPages > 1 && <nav aria-label={t('merge.blockPages')} className="flex flex-wrap items-center gap-2">
        <button type="button" data-line-merge-block-prev="" onClick={() => setBlockPage(shownBlockPage - 1)} disabled={shownBlockPage === 0} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('merge.previousPage')}</button>
        <span className="text-xs tabular-nums text-sub">{t('merge.page', { current: shownBlockPage + 1, total: blockPages })}</span>
        <button type="button" data-line-merge-block-next="" onClick={() => setBlockPage(shownBlockPage + 1)} disabled={shownBlockPage + 1 >= blockPages} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('merge.nextPage')}</button>
      </nav>}
    </> : <p className="text-sm text-sub">{t('merge.noChanges')}</p>}
    <div className="min-w-0 space-y-3 border-t border-line pt-4">
      <h3 className="text-base font-semibold text-fg">{t('merge.resultTitle')}</h3>
      <p className="text-xs tabular-nums text-sub">{t('merge.resultSummary', { lines: output.lineCount, bytes: output.bytes })}</p>
      {output.lineCount ? <ol data-line-merge-preview="" className="max-h-96 overflow-auto rounded-xl bg-subtle p-3 font-mono text-xs leading-relaxed">
        {preview.rows.map(row => <li key={row.number} data-line-merge-row={row.number} className="flex min-w-0 gap-3"><span aria-hidden="true" className="w-9 shrink-0 text-right tabular-nums text-muted">{row.number}</span><span className="min-w-0 whitespace-pre-wrap break-all text-body">{row.text || (row.shortened ? '' : t('merge.blankLine'))}{row.shortened ? t('merge.ellipsis') : ''}</span></li>)}
      </ol> : <p data-line-merge-empty="" className="rounded-xl bg-subtle p-3 text-sm text-sub">{t('merge.empty')}</p>}
      <p className="text-xs text-muted">{t(preview.omitted > 0 ? 'merge.shortened' : 'merge.previewHint')}</p>
      {preview.pageCount > 1 && <nav aria-label={t('merge.resultPages')} className="flex flex-wrap items-center gap-2">
        <button type="button" data-line-merge-result-prev="" onClick={() => setResultPage(preview.page - 1)} disabled={preview.page === 0} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('merge.previousPage')}</button>
        <span className="text-xs tabular-nums text-sub">{t('merge.page', { current: preview.page + 1, total: preview.pageCount })}</span>
        <button type="button" data-line-merge-result-next="" onClick={() => setResultPage(preview.page + 1)} disabled={preview.page + 1 >= preview.pageCount} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('merge.nextPage')}</button>
      </nav>}
      <div className="flex flex-wrap gap-2"><button type="button" data-line-merge-copy="" onClick={() => onCopy(output)} disabled={blocked || copying} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t(copying ? 'output.copying' : output.text ? 'merge.copy' : 'merge.copyEmpty')}</button><button type="button" data-line-merge-download="" onClick={() => onDownload(output)} disabled={blocked} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('merge.download')}</button></div>
      <p className="text-xs text-muted">{t('merge.lineEndings')}</p>
    </div>
  </section>
}
