'use client'

import { useId, useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/jsonFormatter'
import { jsonTreeTextPage, type JsonTreePathStatus, type JsonTreeValueResult } from '@/utils/jsonTreeSelection'
import type { JsonTreeCopyTarget } from '@/utils/jsonTreeCopy'

export interface JsonTreeSelectionPanelProps {
  /** Changes with source revision, typed selection, or value formatting. */
  selectionKey: string
  pointer: string
  value: JsonTreeValueResult
  path: JsonTreePathStatus
  pending: JsonTreeCopyTarget | null
  copied: JsonTreeCopyTarget | null
  onCopy: (target: 'value' | 'pointer' | 'path', text: string) => void
}

export default function JsonTreeSelectionPanel({ selectionKey, pointer, value, path, pending, copied, onCopy }: JsonTreeSelectionPanelProps) {
  const t = useTranslations('jsonFormatter'), id = useId()
  const [view, setView] = useState({ key: selectionKey, page: 0 })
  if (view.key !== selectionKey) setView({ key: selectionKey, page: 0 })
  const pageIndex = view.key === selectionKey ? view.page : 0
  const page = useMemo(() => jsonTreeTextPage(value.ok ? value.text : '', pageIndex), [value, pageIndex])
  const copyButton = (target: 'value' | 'pointer' | 'path', text: string | null) => <button
    type="button" data-json-tree-copy={target} data-json-tree-copied={copied === target}
    disabled={text === null || pending === target} onClick={() => { if (text !== null) onCopy(target, text) }}
    className="ui-btn-soft min-h-11 max-w-full px-3 py-2 text-sm whitespace-normal disabled:opacity-40">
    {t(pending === target ? 'selection.copying' : copied === target ? 'selection.copied' : `selection.copy.${target}`)}
  </button>
  const go = (next: number) => setView({ key: selectionKey, page: next })

  return <section data-json-tree-selection="" data-json-tree-selection-key={selectionKey} className="min-w-0 space-y-4 rounded-xl bg-subtle p-4" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="font-semibold text-fg">{t('selection.title')}</h3>
    <p className="text-sm text-sub">{t('selection.hint')}</p>
    <div className="space-y-2">
      <label htmlFor={`${id}-pointer`} className="block text-sm font-medium text-body">{t('selection.pointer')}</label>
      <textarea id={`${id}-pointer`} data-json-tree-pointer="" value={pointer} readOnly rows={2} wrap="off" spellCheck={false}
        className="ui-field w-full min-w-0 resize-y px-3 py-2 text-base" aria-describedby={pointer === '' ? `${id}-root` : undefined} />
      {pointer === '' && <p id={`${id}-root`} className="text-sm text-sub">{t('selection.rootPointer')}</p>}
      {copyButton('pointer', pointer)}
    </div>
    <div className="space-y-2">
      <p id={`${id}-path-label`} className="text-sm font-medium text-body">{t('selection.path')}</p>
      {'checking' in path ? <p role="status" data-json-tree-path-status="checking" className="text-sm text-sub">{t('selection.checking')}</p>
        : path.ok ? <textarea id={`${id}-path`} data-json-tree-path="" value={path.expression} readOnly rows={2} wrap="off" spellCheck={false} className="ui-field w-full min-w-0 resize-y px-3 py-2 text-base" aria-labelledby={`${id}-path-label`} />
          : <p role="status" data-json-tree-path-status={path.reason} className="text-sm text-body">{t(`selection.pathStatus.${path.reason}`)}</p>}
      {copyButton('path', !('checking' in path) && path.ok ? path.expression : null)}
    </div>
    <div className="space-y-2">
      <p id={`${id}-value-label`} className="text-sm font-medium text-body">{t('selection.value')}</p>
      {value.ok ? <>
        <textarea key={`${selectionKey}:${page.page}`} id={`${id}-value`} data-json-tree-value="" data-json-tree-preview-start={page.start} data-json-tree-preview-end={page.end} data-json-tree-preview-total={page.total}
          value={page.text} readOnly rows={6} wrap="off" spellCheck={false} className="ui-field w-full min-w-0 resize-y px-3 py-2 text-base" aria-labelledby={`${id}-value-label`} aria-describedby={`${id}-range`} />
        <p id={`${id}-range`} data-json-tree-preview-range="" className="text-xs text-sub tabular-nums">{t('selection.previewRange', { start: page.total ? page.start + 1 : 0, end: page.end, total: page.total, page: page.page + 1, pages: page.pages })}</p>
        {page.pages > 1 && <div className="flex flex-wrap gap-2">
          <button type="button" data-json-tree-page="first" disabled={page.page === 0} onClick={() => go(0)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('selection.first')}</button>
          <button type="button" data-json-tree-page="previous" disabled={page.page === 0} onClick={() => go(page.page - 1)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('selection.previous')}</button>
          <button type="button" data-json-tree-page="next" disabled={page.page === page.pages - 1} onClick={() => go(page.page + 1)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('selection.next')}</button>
          <button type="button" data-json-tree-page="last" disabled={page.page === page.pages - 1} onClick={() => go(page.pages - 1)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('selection.last')}</button>
        </div>}
      </> : <p role="status" data-json-tree-value-error={value.reason} className="text-sm text-body">{t(`selection.valueStatus.${value.reason}`)}</p>}
      {copyButton('value', value.ok ? value.text : null)}
    </div>
  </section>
}
