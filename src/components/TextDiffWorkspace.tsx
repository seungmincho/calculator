'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/diffViewer'
import MobileResultLink from '@/components/MobileResultLink'
import LineMergePanel from '@/components/LineMergePanel'
import DiffCopyRecovery from '@/components/DiffCopyRecovery'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { useHydrated } from '@/hooks/useHydrated'
import { createLineDiffClient } from '@/lib/diff/client'
import { createTextDiffOutput, type DiffOutputState } from '@/lib/diff/output'
import { DiffExecutionError, type DiffExecutionErrorCode } from '@/lib/diff/protocol'
import { formatTextDiff, type TextDiffResult } from '@/utils/lineDiff'
import { prepareLineMerge, createLineMergeChoices, selectLineMerge, LineMergeError, type LineMergeDocument, type LineMergeOutput, type LineMergeSide } from '@/utils/lineMerge'
import { createWritingDiffReceiver, type WritingDiffHandoff, type WritingDiffReceiveResult } from '@/utils/writingDiffHandoff'

type Snapshot = { left: string; right: string }
type Comparison = { snapshot: Snapshot; result: TextDiffResult; example: boolean }
type Completed = Comparison & { document: LineMergeDocument; output: LineMergeOutput }
type HandoffState =
  | { ok: true; payload: WritingDiffHandoff; edited: boolean; cleanupFailed: boolean }
  | { ok: false; error: Exclude<Extract<WritingDiffReceiveResult, { ok: false }>['error'], 'stale'> }
const PAGE_SIZE = 200

function exampleResult(labels: { heading: string; before: string; after: string; unchanged: string; added: string }): Comparison {
  return {
    example: true,
    snapshot: { left: [labels.heading, labels.before, labels.unchanged].join('\n'), right: [labels.heading, labels.after, labels.unchanged, labels.added].join('\n') },
    result: {
      lines: [
        { type: 'unchanged', content: labels.heading, left: 1, right: 1 },
        { type: 'removed', content: labels.before, left: 2 },
        { type: 'added', content: labels.after, right: 2 },
        { type: 'unchanged', content: labels.unchanged, left: 3, right: 3 },
        { type: 'added', content: labels.added, right: 4 },
      ],
      summary: { added: 2, removed: 1, unchanged: 2 },
    },
  }
}

function completeComparison(id: number, comparison: Comparison): Completed {
  const document = prepareLineMerge(id, comparison.snapshot.left, comparison.snapshot.right, comparison.result)
  return { ...comparison, document, output: selectLineMerge(document, createLineMergeChoices(document)) }
}

export default function TextDiffWorkspace() {
  const t = useTranslations('diffViewer')
  const language = useOptionalLanguage()?.language ?? 'ko'
  const hydrated = useHydrated()
  const [example] = useState(() => completeComparison(1, exampleResult({ heading: t('workspace.example.heading'), before: t('workspace.example.before'), after: t('workspace.example.after'), unchanged: t('workspace.example.unchanged'), added: t('workspace.example.added') })))
  const [draft, setDraft] = useState<Snapshot>(() => ({ ...example.snapshot }))
  const [completed, setCompleted] = useState<Completed | null>(example)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<DiffExecutionErrorCode | null>(null)
  const [canceled, setCanceled] = useState(false)
  const [filter, setFilter] = useState<'all' | 'changes'>('all')
  const [page, setPage] = useState(0)
  const [outputState, setOutputState] = useState<DiffOutputState | null>(null)
  const [mergeError, setMergeError] = useState(false)
  const [handoff, setHandoff] = useState<HandoffState | null>(null)
  const client = useRef<ReturnType<typeof createLineDiffClient> | null>(null)
  const lifecycle = useRef({ request: 0, document: 1, alive: true })
  const latest = useRef(completed)
  latest.current = completed
  const outputOwner = useRef<ReturnType<typeof createTextDiffOutput> | null>(null)
  const comparisonLabel = t('output.comparison'), mergedLabel = t('output.merged'), failedLabel = t('output.failed', { label: mergedLabel })
  const outputContext = useMemo(() => ({ language, comparisonLabel, mergedLabel, failedLabel }), [language, comparisonLabel, mergedLabel, failedLabel])
  const latestOutputContext = useRef<typeof outputContext | null>(null)
  const handoffReceiver = useRef(createWritingDiffReceiver())
  const pendingHandoff = useRef<number | null>(null)

  useLayoutEffect(() => {
    const state = lifecycle.current
    state.alive = true
    const owner = createTextDiffOutput(setOutputState)
    outputOwner.current = owner; owner.activate()
    return () => { state.alive = false; state.request++; client.current?.cancel(); client.current = null; owner.dispose(); outputOwner.current = null }
  }, [])
  useLayoutEffect(() => {
    latestOutputContext.current = outputContext; outputOwner.current?.invalidate()
    return () => { latestOutputContext.current = null; outputOwner.current?.invalidate() }
  }, [outputContext])
  useEffect(() => {
    if (!hydrated) return
    const receiver = handoffReceiver.current
    const ticket = receiver.begin(new URLSearchParams(window.location.search).get('from'))
    if (ticket === null) return
    pendingHandoff.current = ticket
    const timer = window.setTimeout(function receiveWritingDiffTransfer() {
      if (!lifecycle.current.alive) return
      let outcome: WritingDiffReceiveResult
      try {
        // Access inside receive so a blocked sessionStorage getter is also a completed attempt.
        outcome = receiver.receive(ticket, {
          getItem: key => window.sessionStorage.getItem(key),
          removeItem: key => window.sessionStorage.removeItem(key),
        }, payload => {
          lifecycle.current.request++; outputOwner.current?.invalidate(); client.current?.cancel()
          setDraft({ left: payload.left.text, right: payload.right.text })
          latest.current = null; setCompleted(null); setPage(0); setFilter('all')
          setRunning(false); setError(null); setCanceled(false); setMergeError(false)
        })
      } catch { outcome = { ok: false, error: 'unavailable' } }
      if (pendingHandoff.current === ticket) pendingHandoff.current = null
      if (!lifecycle.current.alive) return
      if (outcome.ok) setHandoff({ ok: true, payload: outcome.payload, edited: false, cleanupFailed: outcome.cleanup !== 'cleared' })
      else if (outcome.error !== 'stale') setHandoff({ ok: false, error: outcome.error })
    }, 0)
    return () => { window.clearTimeout(timer); receiver.cancel(ticket); if (pendingHandoff.current === ticket) pendingHandoff.current = null }
  }, [hydrated])

  const stale = !!completed && (completed.snapshot.left !== draft.left || completed.snapshot.right !== draft.right)
  const filtered = useMemo(() => !completed ? [] : filter === 'all' ? completed.result.lines : completed.result.lines.filter(line => line.type !== 'unchanged'), [completed, filter])
  const exportText = useMemo(() => completed ? formatTextDiff(completed.result) : '', [completed])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const shownPage = Math.min(page, pageCount - 1)
  const shownLines = filtered.slice(shownPage * PAGE_SIZE, (shownPage + 1) * PAGE_SIZE)

  function invalidate() {
    lifecycle.current.request++; outputOwner.current?.invalidate(); client.current?.cancel()
    setRunning(false); setError(null); setCanceled(false); setMergeError(false)
  }
  function userAction(changesInput = false) {
    handoffReceiver.current.edit()
    if (pendingHandoff.current !== null) setHandoff({ ok: false, error: 'edited' })
    else if (changesInput) setHandoff(previous => previous?.ok ? { ...previous, edited: true } : previous)
  }
  function change(side: keyof Snapshot, value: string) { userAction(true); invalidate(); setDraft(previous => ({ ...previous, [side]: value })) }
  function swap() { userAction(true); invalidate(); setDraft(previous => ({ left: previous.right, right: previous.left })) }
  function clear() { userAction(true); invalidate(); setDraft({ left: '', right: '' }); latest.current = null; setCompleted(null); setPage(0) }
  function cancel() { userAction(); invalidate(); setCanceled(true) }
  async function compare() {
    userAction()
    invalidate()
    const token = ++lifecycle.current.request
    const snapshot = { ...draft }
    setRunning(true)
    try {
      client.current ??= createLineDiffClient()
      const result = await client.current.run(snapshot.left, snapshot.right)
      if (!lifecycle.current.alive || lifecycle.current.request !== token) return
      const next = completeComparison(++lifecycle.current.document, { snapshot, result, example: false })
      outputOwner.current?.invalidate()
      latest.current = next; setCompleted(next); setPage(0); setRunning(false)
    } catch (cause) {
      if (!lifecycle.current.alive || lifecycle.current.request !== token) return
      setRunning(false)
      const code = cause instanceof DiffExecutionError ? cause.code : cause instanceof LineMergeError ? 'invalidResponse' : 'workerFailed'
      if (code !== 'canceled') setError(code)
    }
  }
  function currentOutput() { return lifecycle.current.alive && latestOutputContext.current === outputContext ? outputOwner.current : null }
  function emitComparison(action: 'copy' | 'download') {
    const owner = currentOutput()
    if (!owner || !completed || latest.current !== completed) return
    userAction()
    void owner[action]({ target: 'comparison', text: exportText, label: comparisonLabel, filename: 'toolhub-text-comparison.txt' })
  }
  function emitMerged(action: 'copy' | 'download', output: LineMergeOutput) {
    const owner = currentOutput()
    if (!owner || latest.current?.output !== output) return
    userAction()
    void owner[action]({ target: 'merged', text: output.text, label: mergedLabel, filename: 'toolhub-merged-document.txt' })
  }
  function choose(document: LineMergeDocument, side: LineMergeSide, blockId?: string) {
    if (!currentOutput() || latest.current?.document !== document) return
    userAction()
    const current = latest.current
    try {
      const choices = blockId === undefined ? createLineMergeChoices(document, side) : current.output.choices.map(choice => choice.blockId === blockId ? { ...choice, side } : choice)
      const output = selectLineMerge(document, choices)
      outputOwner.current?.invalidate(); setMergeError(false)
      const next = { ...current, output }; latest.current = next; setCompleted(next)
    } catch { setMergeError(true) }
  }
  function outputNotice(target: 'comparison' | 'merged') {
    if (!outputState || outputState.target !== target) return null
    if (outputState.kind === 'copy' && outputState.status === 'failed') return <DiffCopyRecovery state={outputState} onRetry={token => { void currentOutput()?.retry(token) }} onClose={token => currentOutput()?.close(token)} />
    if (outputState.kind === 'copy' && outputState.status !== 'copied') return null
    return <p data-diff-output-status="" role={outputState.status === 'failed' ? 'alert' : 'status'} className="rounded-xl bg-subtle p-3 text-sm text-sub">{t(outputState.kind === 'copy' ? 'output.copied' : outputState.status === 'started' ? 'output.downloadStarted' : 'output.downloadFailed', { label: outputState.label })}</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="mt-1 text-sm text-sub">{t('description')}</p>
      </header>
      {handoff && <section data-writing-diff-handoff={handoff.ok ? 'loaded' : handoff.error} className="ui-card min-w-0 space-y-3 p-4 sm:p-5" aria-labelledby="writing-diff-handoff-title">
        <h2 id="writing-diff-handoff-title" className="text-lg font-semibold text-fg">{t('handoff.title')}</h2>
        {handoff.ok ? <>
          <p role="status" className="text-sm text-body">{t(handoff.edited ? 'handoff.edited' : 'handoff.loaded')}</p>
          {!handoff.edited && <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 text-sm text-sub [overflow-wrap:anywhere]">
            <div><p className="font-medium text-fg">{t('handoff.saved', { name: handoff.payload.left.name })}</p>{handoff.payload.left.title && <p>{t('handoff.documentTitle', { title: handoff.payload.left.title })}</p>}</div>
            <div><p className="font-medium text-fg">{t('handoff.current', { tab: handoff.payload.right.sourceTab })}</p>{handoff.payload.right.title && <p>{t('handoff.documentTitle', { title: handoff.payload.right.title })}</p>}</div>
          </div>}
          {handoff.cleanupFailed && <p role="status" className="text-sm text-body">{t('handoff.cleanupFailed')}</p>}
        </> : <p role="alert" className="text-sm text-body">{t(`handoff.errors.${handoff.error}`)}</p>}
        <p className="text-xs text-muted">{t('handoff.privacy')}</p>
      </section>}
      {completed && <MobileResultLink href="#diff-result" label={t(stale ? 'workspace.previousResult' : 'results.title')} value={t('workspace.quickSummary', completed.result.summary)} />}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(['left', 'right'] as const).map(side => <div key={side} className="ui-card min-w-0 overflow-hidden">
          <label htmlFor={`diff-${side}`} className="block border-b border-line bg-subtle px-4 py-3 text-sm font-medium text-fg">{t(side === 'left' ? 'input.original' : 'input.modified')}</label>
          <textarea id={`diff-${side}`} value={draft[side]} onChange={event => change(side, event.target.value)} placeholder={t(side === 'left' ? 'input.originalPlaceholder' : 'input.modifiedPlaceholder')} spellCheck={false} className="ui-field block min-h-64 w-full resize-y rounded-none border-0 p-4 font-mono text-base leading-relaxed" />
        </div>)}
      </div>
      <div className="space-y-3">
        <p className="text-xs text-sub">{t('workspace.limits')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { void compare() }} className="ui-btn min-h-11 px-5 py-2.5">{t(running ? 'workspace.compareAgain' : 'actions.compare')}</button>
          {running && <button type="button" onClick={cancel} className="ui-btn-soft min-h-11 px-4 py-2.5">{t('workspace.cancel')}</button>}
          <button type="button" onClick={swap} className="ui-btn-soft min-h-11 px-4 py-2.5">{t('actions.swap')}</button>
          <button type="button" onClick={clear} className="ui-btn-soft min-h-11 px-4 py-2.5">{t('actions.clear')}</button>
        </div>
        {running && <p role="status" className="text-sm text-sub">{t('workspace.running')}</p>}
        {canceled && <p role="status" className="text-sm text-sub">{t('workspace.canceled')}</p>}
        {error && <p role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">{t(`workspace.errors.${error}`)}</p>}
      </div>

      {completed ? <section id="diff-result" aria-labelledby="diff-result-title" className="ui-card min-w-0 scroll-mt-20 overflow-hidden">
        <div className="space-y-3 border-b border-line p-4 sm:p-5">
          <h2 id="diff-result-title" className="text-lg font-semibold text-fg">{t('results.title')}</h2>
          {completed.example && <p className="text-xs text-sub">{t('workspace.exampleNotice')}</p>}
          {stale && <p role="status" className="rounded-xl bg-subtle p-3 text-sm font-medium text-body">{t('workspace.stale')}</p>}
          <dl className="flex flex-wrap gap-3 text-sm tabular-nums">
            {(['added', 'removed', 'unchanged'] as const).map(type => <div key={type} className="rounded-lg bg-subtle px-3 py-2"><dt className="inline text-sub">{t(`results.${type}`)}</dt><dd className="ml-2 inline font-semibold text-fg">{completed.result.summary[type]}</dd></div>)}
          </dl>
          <div className="flex flex-wrap gap-2">
            {(['all', 'changes'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(0) }} className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium ${filter === value ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(`workspace.filter.${value}`)}</button>)}
          </div>
          <p className="text-xs text-sub">{t('workspace.fullResultScope')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-diff-output="copy-comparison" onClick={() => emitComparison('copy')} disabled={outputState?.kind === 'copy' && outputState.status === 'copying' && outputState.target === 'comparison'} className="ui-btn-soft min-h-11 px-4 py-2.5 disabled:opacity-50">{t(outputState?.kind === 'copy' && outputState.status === 'copying' && outputState.target === 'comparison' ? 'workspace.copying' : 'actions.copyDiff')}</button>
            <button type="button" data-diff-output="download-comparison" onClick={() => emitComparison('download')} className="ui-btn-soft min-h-11 px-4 py-2.5">{t('workspace.download')}</button>
            <a href="#line-merge-result" data-line-merge-jump="" className="ui-btn-soft min-h-11 px-4 py-2.5">{t('merge.jump')}</a>
          </div>
          <p className="text-xs text-sub">{t(stale ? 'workspace.staleExport' : 'workspace.exportScope')}</p>
          {outputNotice('comparison')}
        </div>
        {filtered.length === 0 ? <p className="p-5 text-sm text-sub">{t(completed.result.lines.length === 0 ? 'workspace.bothEmpty' : 'workspace.noChanges')}</p> : <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
            <p className="text-xs text-sub tabular-nums">{t('workspace.rowRange', { from: shownPage * PAGE_SIZE + 1, to: Math.min((shownPage + 1) * PAGE_SIZE, filtered.length), total: filtered.length })}</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('workspace.previousPage')}</button>
              <span className="text-xs text-sub tabular-nums">{t('workspace.page', { page: shownPage + 1, total: pageCount })}</span>
              <button type="button" disabled={shownPage + 1 >= pageCount} onClick={() => setPage(shownPage + 1)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('workspace.nextPage')}</button>
            </div>
          </div>
          <div className="max-h-[36rem] overflow-auto" tabIndex={0} aria-label={t('workspace.tableScroll')}>
            <table className="min-w-full border-collapse font-mono text-sm">
              <thead><tr className="border-b border-line bg-subtle text-left text-xs text-sub"><th className="px-2 py-2">{t('workspace.leftLine')}</th><th className="px-2 py-2">{t('workspace.rightLine')}</th><th className="px-2 py-2"><span className="sr-only">{t('workspace.changeType')}</span></th><th className="px-2 py-2">{t('workspace.lineText')}</th></tr></thead>
              <tbody>{shownLines.map((line, index) => <tr key={`${shownPage}-${index}`} data-diff-type={line.type} className={line.type === 'added' ? 'bg-primary-soft' : line.type === 'removed' ? 'bg-subtle' : 'bg-surface'}>
                <td className="border-r border-line px-2 py-1 text-right text-muted tabular-nums">{line.left ?? ''}</td>
                <td className="border-r border-line px-2 py-1 text-right text-muted tabular-nums">{line.right ?? ''}</td>
                <td className="px-2 py-1 text-center text-body" aria-label={t(`results.${line.type}`)}>{line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}</td>
                <td className="whitespace-pre px-2 py-1 text-fg" aria-label={line.content === '' ? t('workspace.emptyLine') : undefined}>{line.content || '\u00a0'}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </>}
      </section> : <p id="diff-result" className="rounded-2xl bg-subtle p-5 text-sm text-sub">{t('workspace.noResult')}</p>}

      {completed && <LineMergePanel key={completed.document.id} document={completed.document} output={completed.output} stale={stale}
        copying={outputState?.kind === 'copy' && outputState.status === 'copying' && outputState.target === 'merged'}
        onChoose={(document, blockId, side) => choose(document, side, blockId)} onAll={(document, side) => choose(document, side)}
        onCopy={output => emitMerged('copy', output)} onDownload={output => emitMerged('download', output)} />}
      {mergeError && <p role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">{t('merge.failed')}</p>}
      {outputNotice('merged')}

      <section className="ui-card space-y-4 p-5 sm:p-6" aria-labelledby="diff-guide-title">
        <h2 id="diff-guide-title" className="text-lg font-semibold text-fg">{t('guide.title')}</h2>
        <p className="text-sm leading-relaxed text-sub">{t('workspace.linePolicy')}</p>
        <p className="text-sm leading-relaxed text-sub">{t('workspace.privacy')}</p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {(['howToUse', 'useCases'] as const).map(section => <div key={section} className="space-y-2">
            <h3 className="text-sm font-medium text-fg">{t(`guide.${section}.title`)}</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-sub">{(t.raw(`guide.${section}.items`) as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>)}
        </div>
      </section>
    </div>
  )
}
