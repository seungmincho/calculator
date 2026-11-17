'use client'

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/textConverter'
import { CASE_IDS, REGEX_MAX, type Step } from '@/utils/textConvert'
import { reduceTextPipelineHistory, TEXT_PIPELINE_HISTORY_LIMIT, type TextPipelineAction, type TextPipelineHistory } from '@/utils/textPipelineHistory'

interface Props {
  history: TextPipelineHistory
  errors: readonly (string | null)[]
  onChange: (next: TextPipelineHistory) => void
}

/** Step editing only. The parent owns source/form inputs and safe URL synchronization. */
export default function TextPipelineHistoryControls({ history, errors, onChange }: Props) {
  const t = useTranslations('textConverter')
  const headingId = useId()
  const root = useRef<HTMLElement>(null)
  const focusRequest = useRef<{ expected: TextPipelineHistory; selector: string } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const steps = history.present

  useLayoutEffect(() => {
    const request = focusRequest.current
    if (!request) return
    focusRequest.current = null
    if (request.expected === history) root.current?.querySelector<HTMLElement>(request.selector)?.focus()
  }, [history])

  function label(step: Step) {
    if (step.op === 'replace') return t('steps.replace', { find: step.find, repl: step.repl || '∅' })
    if (step.op === 'affix') return t('steps.affix', { prefix: step.prefix, suffix: step.suffix })
    if (step.op === 'list') return t(`list.${step.preset}`)
    return t((CASE_IDS as readonly string[]).includes(step.op) ? `cases.${step.op}` : `ops.${step.op}`)
  }
  function apply(action: TextPipelineAction) {
    const next = reduceTextPipelineHistory(history, action)
    if (next === history) return
    let selector = '[data-history-action="undo"]'
    if (action.type === 'move') {
      const position = action.index + (action.direction === 'up' ? -1 : 1)
      selector = `[data-text-step-index="${position}"]`
      setAnnouncement(t('history.moved', { step: label(steps[action.index]), position: position + 1 }))
    } else if (action.type === 'remove') {
      if (next.present.length) selector = `[data-text-step-index="${Math.min(action.index, next.present.length - 1)}"]`
      setAnnouncement(t('history.removed', { step: label(steps[action.index]), position: action.index + 1 }))
    } else if (action.type === 'undo') {
      selector = next.past.length ? selector : '[data-history-action="redo"]'
      setAnnouncement(t('history.undone', { remaining: next.past.length }))
    } else if (action.type === 'redo') {
      selector = next.future.length ? '[data-history-action="redo"]' : selector
      setAnnouncement(t('history.redone', { remaining: next.future.length }))
    } else if (action.type === 'reset') setAnnouncement(t('history.cleared', { count: steps.length }))
    focusRequest.current = { expected: next, selector }
    onChange(next)
  }
  function ignoreShortcut(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    return event.nativeEvent.isComposing || event.keyCode === 229
      || !!target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
  }
  function historyKey(event: KeyboardEvent<HTMLElement>) {
    if (ignoreShortcut(event)) return
    const key = event.key.toLowerCase()
    if (event.altKey || (!event.ctrlKey && !event.metaKey)) return
    const type = key === 'z' ? event.shiftKey ? 'redo' : 'undo'
      : key === 'y' && event.ctrlKey && !event.shiftKey ? 'redo' : null
    if (!type) return
    event.preventDefault(); event.stopPropagation(); apply({ type })
  }
  function stepKey(event: KeyboardEvent<HTMLLIElement>, index: number) {
    if (ignoreShortcut(event)) return
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault(); event.stopPropagation()
    apply({ type: 'move', index, direction: event.key === 'ArrowUp' ? 'up' : 'down' })
  }

  return <section ref={root} aria-labelledby={headingId} onKeyDown={historyKey} className="min-w-0 space-y-3" data-text-pipeline-history>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id={headingId} className="text-sm font-medium text-fg">{t('pipeline.steps', { n: steps.length })}</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-history-action="undo" aria-keyshortcuts="Control+Z Meta+Z" disabled={!history.past.length} onClick={() => apply({ type: 'undo' })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('history.undo')}</button>
        <button type="button" data-history-action="redo" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y" disabled={!history.future.length} onClick={() => apply({ type: 'redo' })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('history.redo')}</button>
        <button type="button" data-history-action="reset" disabled={!steps.length} onClick={() => apply({ type: 'reset' })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('pipeline.reset')}</button>
      </div>
    </div>
    <p className="text-xs leading-relaxed text-sub">{t('history.scope', { max: TEXT_PIPELINE_HISTORY_LIMIT })}</p>
    <p className="text-xs text-muted tabular-nums">{t('history.available', { undo: history.past.length, redo: history.future.length })}</p>
    {!steps.length ? <p className="rounded-xl bg-subtle p-3 text-sm text-muted">{t('pipeline.empty')}</p> : <ol className="space-y-2">
      {steps.map((step, index) => {
        const title = label(step), error = errors[index]
        return <li key={index} tabIndex={-1} data-text-step-index={index} aria-label={t('history.stepLabel', { position: index + 1, step: title })} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" onKeyDown={event => stepKey(event, index)} className="min-w-0 rounded-xl border border-line bg-subtle p-3">
          <p className="break-words text-sm font-medium text-fg"><span className="mr-2 text-xs text-muted tabular-nums">{index + 1}</span><span className="font-mono">{title}</span></p>
          {error && <p role="status" className="mt-2 text-xs text-body">{t(error === 'badRegex' || error === 'tooLong' ? `errors.${error}` : 'history.stepFailed', { max: REGEX_MAX.toLocaleString() })}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" data-step-action="up" disabled={index === 0} aria-label={t('history.moveUpAria', { position: index + 1, step: title })} onClick={() => apply({ type: 'move', index, direction: 'up' })} className="ui-btn-soft min-h-11 min-w-11 px-3 py-2 text-sm disabled:opacity-40">{t('history.moveUp')}</button>
            <button type="button" data-step-action="down" disabled={index + 1 === steps.length} aria-label={t('history.moveDownAria', { position: index + 1, step: title })} onClick={() => apply({ type: 'move', index, direction: 'down' })} className="ui-btn-soft min-h-11 min-w-11 px-3 py-2 text-sm disabled:opacity-40">{t('history.moveDown')}</button>
            <button type="button" data-step-action="remove" aria-label={t('history.removeAria', { position: index + 1, step: title })} onClick={() => apply({ type: 'remove', index })} className="ui-btn-soft min-h-11 min-w-11 px-3 py-2 text-sm">{t('history.remove')}</button>
          </div>
        </li>
      })}
    </ol>}
    <p className="text-xs leading-relaxed text-muted">{t('history.keyboard')}</p>
    <p className="text-xs leading-relaxed text-muted">{t('history.urlNotice')}</p>
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
  </section>
}
