'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import MobileResultLink from '@/components/MobileResultLink'
import ShareResult from '@/components/ShareResult'
import RunningPaceComparison from '@/components/RunningPaceComparison'
import RunningPacePrint, { type RunningPrintSnapshot } from '@/components/RunningPacePrint'
import { useTranslations } from '@/lib/i18n/runningPace'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { useHydrated } from '@/hooks/useHydrated'
import { calculateRunning, formatClock, formatDistance, parseClock, parseDistance, parsePace, type RunningMode } from '@/utils/runningPace'
import { captureRunningComparison, type RunningGoalDraft, type RunningComparisonSnapshot } from '@/utils/runningPaceComparison'
import { createRunningDraft, createRunningInitialOwner, restoreRunningQuery, updateRunningQuery, type RunningDraft } from '@/utils/runningPaceQuery'
import { copyRunningText, createRunningActionGuard, createRunningDownloads, serializeRunningComparison, type RunningActionToken, type RunningExportLabels } from '@/utils/runningPaceActions'

const DISTANCES = [5, 10, 21.0975, 42.195] as const
type QueryError = 'invalid' | 'unsupported' | 'tooLong' | 'draft' | 'writeFailed' | null
type Model = { draft: RunningDraft; ready: boolean; blocked: boolean; queryError: QueryError; shareUrl: string | null }
type OutputView = { token: RunningActionToken; scope: string; status: 'copying' | 'copied' | 'failed' | 'downloaded' | 'downloadFailed' | 'printFailed' | 'printing'; text: string; selectionFailed?: boolean }

export default function RunningPaceCalculator() {
  const t = useTranslations('runningPace')
  const language = useOptionalLanguage()?.language ?? 'ko', hydrated = useHydrated()
  const [model, setModel] = useState<Model>(() => ({ draft: createRunningDraft(), ready: false, blocked: false, queryError: null, shareUrl: null }))
  const live = useRef(model), initialOwner = useRef(createRunningInitialOwner()), search = useRef('')
  const guard = useMemo(() => createRunningActionGuard(), []), downloads = useMemo(() => createRunningDownloads(), [])
  const [output, setOutput] = useState<OutputView | null>(null), [shareRevision, setShareRevision] = useState(0)
  const [printJob, setPrintJob] = useState<{ token: RunningActionToken; scope: string; snapshot: RunningPrintSnapshot } | null>(null)
  const manual = useRef<HTMLTextAreaElement>(null)
  const { preset, customDistance, mode, hours, minutes, seconds, paceMinutes, paceSeconds, splitKm, goals } = model.draft
  const scope = JSON.stringify([model.draft, model.ready, model.blocked, model.shareUrl, language, t('title'), t('comparison.copy.failed'), t('comparison.export.distanceKm')])
  const committedScope = useRef('')
  useLayoutEffect(() => { guard.activate(); downloads.activate(); return () => { guard.dispose(); downloads.dispose() } }, [guard, downloads])
  useLayoutEffect(() => { committedScope.current = scope; guard.setContext(scope) }, [guard, scope])
  const isCurrent = (token: RunningActionToken) => guard.current(token) && live.current.ready && !live.current.blocked
  const visible = output && output.scope === scope && isCurrent(output.token) ? output : null
  const printVisible = printJob && printJob.scope === scope && isCurrent(printJob.token) ? printJob : null

  function invalidateOwn() { guard.invalidate(); setOutput(null); setPrintJob(null) }
  function invalidateAll() { invalidateOwn(); setShareRevision(previous => previous + 1) }
  function commit(next: Model, synchronize: boolean) {
    let value = next
    if (synchronize && next.ready && !next.blocked) {
      try {
        const updated = updateRunningQuery(window.location.href, next.draft)
        if (updated.href !== window.location.href) window.history.replaceState(window.history.state, '', updated.href)
        search.current = window.location.search
        value = { ...next, shareUrl: updated.shareUrl, queryError: updated.kind === 'ready' ? null : updated.kind === 'invalid' ? 'draft' : 'tooLong' }
      } catch { value = { ...next, shareUrl: null, queryError: 'writeFailed' } }
    }
    live.current = value; setModel(value)
  }
  useEffect(() => {
    if (!hydrated) return
    let active = true
    function restoreRunningLocation() {
      if (!active) return
      const restored = restoreRunningQuery(new URLSearchParams(window.location.search))
      const first = initialOwner.current.finish(restored)
      const value = first ?? { draft: restored.kind === 'ready' ? restored.draft : createRunningDraft(), blocked: restored.kind !== 'ready' && restored.kind !== 'absent' }
      search.current = window.location.search
      invalidateAll()
      commit({ draft: value.draft, ready: true, blocked: value.blocked, shareUrl: null, queryError: value.blocked && restored.kind !== 'ready' && restored.kind !== 'absent' ? restored.kind : null }, true)
    }
    const timer = window.setTimeout(function restoreInitialRunningLocation() { if (!live.current.ready) restoreRunningLocation() }, 0)
    const pop = () => { if (window.location.search !== search.current) restoreRunningLocation() }
    window.addEventListener('popstate', pop)
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener('popstate', pop) }
    // The location callback uses refs so locale rerenders never restore over drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])
  function update(patch: Partial<RunningDraft>) {
    const next = { ...live.current.draft, ...patch }
    if (JSON.stringify(next) === JSON.stringify(live.current.draft) && !live.current.blocked) return
    initialOwner.current.edit(patch); invalidateAll()
    commit({ ...live.current, draft: next, blocked: false, queryError: null, shareUrl: null }, true)
  }
  function updateGoals(change: (previous: readonly RunningGoalDraft[]) => RunningGoalDraft[]) { update({ goals: change(live.current.draft.goals) }) }
  function reset() {
    invalidateAll(); initialOwner.current.edit(createRunningDraft())
    commit({ draft: createRunningDraft(), ready: live.current.ready, blocked: false, queryError: null, shareUrl: null }, true)
  }

  const distance = parseDistance(preset === 'custom' ? customDistance : String(preset))
  const value = mode === 'time' ? parseClock(hours, minutes, seconds) : parsePace(paceMinutes, paceSeconds)
  const result = useMemo(() => !model.blocked && distance !== null && value !== null
    ? calculateRunning(distance, mode, value, splitKm) : null, [distance, mode, value, splitKm, model.blocked])
  const comparison = useMemo(() => model.blocked ? null : captureRunningComparison(distance, goals, splitKm), [model.blocked, distance, goals, splitKm])

  const selectMode = (next: RunningMode) => {
    if (next === mode) return
    if (result) {
      const roundedPace = Math.round(result.secondsPerKm)
      if (next === 'pace') {
        update({ mode: next, paceMinutes: String(Math.floor(roundedPace / 60)), paceSeconds: String(roundedPace % 60) })
      } else {
        const total = Math.round(result.finishSeconds)
        update({ mode: next, hours: String(Math.floor(total / 3600)), minutes: String(Math.floor((total % 3600) / 60)), seconds: String(total % 60) })
      }
    } else update({ mode: next })
  }

  function beginOutput() {
    if (!live.current.ready || live.current.blocked || live.current !== model || committedScope.current !== scope) return null
    invalidateAll()
    return guard.begin()
  }
  async function copyText(text: string) {
    const token = beginOutput(); if (!token) return
    setOutput({ token, scope, status: 'copying', text })
    const outcome = await copyRunningText(text, () => isCurrent(token))
    if (isCurrent(token) && outcome !== 'stale') setOutput({ token, scope, text, status: outcome === 'copied' ? 'copied' : 'failed' })
  }
  const copy = () => {
    if (!result) return
    const lines = [
      `${t('title')} — ${formatDistance(result.distanceKm)}`,
      `${t('result.finish')}: ${formatClock(result.finishSeconds, true)}`,
      `${t('result.pace')}: ${formatClock(result.secondsPerKm)}/km`,
      `${t('result.speed')}: ${result.speedKmh.toFixed(2)} km/h`,
      `${t('splits.distance')}\t${t('splits.elapsed')}`,
      ...result.splits.map(row => `${formatDistance(row.distanceKm)}\t${formatClock(row.elapsedSeconds, true)}`),
    ]
    void copyText(lines.join('\n'))
  }

  const labels = (): RunningExportLabels => ({ distanceKm: t('comparison.export.distanceKm'), splitIntervalKm: t('comparison.export.splitIntervalKm'), splitDistanceKm: t('comparison.export.splitDistanceKm'), goals: [1, 2, 3].map(number => t('comparison.goal', { number })), totalSeconds: t('comparison.export.totalSeconds'), paceSecondsPerKm: t('comparison.export.paceSecondsPerKm'), speedKmh: t('comparison.export.speedKmh'), elapsedSeconds: t('comparison.export.elapsedSeconds'), elapsedClock: t('comparison.export.elapsedClock') })
  function preparePrint(snapshot: RunningPrintSnapshot) {
    const token = beginOutput(); if (!token) return
    setPrintJob({ token, scope, snapshot }); setOutput({ token, scope, text: '', status: 'printing' })
  }
  function printSingle() {
    if (!result) return
    preparePrint({ title: t('title'), distance: formatDistance(result.distanceKm), headers: [t('splits.distance'), t('splits.elapsed')], summary: [`${t('result.finish')}: ${formatClock(result.finishSeconds, true)}`, `${t('result.pace')}: ${formatClock(result.secondsPerKm)}/km`, `${t('result.speed')}: ${result.speedKmh.toFixed(2)} km/h`], rows: result.splits.map(row => ({ distance: formatDistance(row.distanceKm), values: [formatClock(row.elapsedSeconds, true)] })) })
  }
  function exportComparison(format: 'tsv' | 'csv' | 'print', snapshot: RunningComparisonSnapshot) {
    // A captured handler from an older child must not export a superseded table.
    const state = live.current.draft, currentDistance = parseDistance(state.preset === 'custom' ? state.customDistance : String(state.preset))
    if (JSON.stringify(snapshot) !== JSON.stringify(captureRunningComparison(currentDistance, state.goals, state.splitKm))) return
    if (format === 'tsv') { void copyText(serializeRunningComparison(snapshot, labels(), 'tsv')); return }
    if (format === 'print') {
      preparePrint({ title: t('comparison.title'), distance: formatDistance(snapshot.distanceKm), headers: [t('splits.distance'), ...snapshot.goals.map(goal => t('comparison.goal', { number: goal.number }))], summary: snapshot.goals.map(goal => `${t('comparison.goal', { number: goal.number })}: ${formatClock(goal.finishSeconds, true)} · ${formatClock(goal.secondsPerKm)}/km · ${goal.speedKmh.toFixed(2)} km/h`), rows: snapshot.splits.map(row => ({ distance: formatDistance(row.distanceKm), values: row.elapsedSeconds.map(seconds => formatClock(seconds, true)) })) }); return
    }
    const token = beginOutput(); if (!token) return
    try {
      const outcome = downloads.download(serializeRunningComparison(snapshot, labels(), 'csv'), () => isCurrent(token))
      if (isCurrent(token) && outcome !== 'stale') setOutput({ token, scope, text: '', status: outcome === 'started' ? 'downloaded' : 'downloadFailed' })
    } catch { if (isCurrent(token)) setOutput({ token, scope, text: '', status: 'downloadFailed' }) }
  }
  useEffect(() => {
    if (!printJob) return
    const job = printJob
    const after = () => { if (guard.current(job.token)) { setPrintJob(null); setOutput(null) } }
    window.addEventListener('afterprint', after)
    const frame = window.requestAnimationFrame(function printRunningSnapshot() {
      if (!isCurrent(job.token)) return
      try { window.print() } catch { if (isCurrent(job.token)) { setPrintJob(null); setOutput({ token: job.token, scope: job.scope, text: '', status: 'printFailed' }) } }
    })
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('afterprint', after) }
    // Ownership, not render closure identity, decides whether the committed print DOM is current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printJob])
  function selectManual(item: OutputView) {
    if (!isCurrent(item.token)) return
    try { if (!manual.current) throw new Error('missingField'); manual.current.focus(); if (!isCurrent(item.token)) return; manual.current.select(); if (isCurrent(item.token)) manual.current.setSelectionRange(0, item.text.length) }
    catch { if (isCurrent(item.token)) setOutput({ ...item, selectionFailed: true }) }
  }

  const timeField = (id: string, label: string, value: string, setter: (next: string) => void, invalid: boolean) => (
    <label htmlFor={id} className="block min-w-0 text-sm font-medium text-body">
      {label}
      <input id={id} type="text" inputMode="numeric" value={value} onChange={event => setter(event.target.value)}
        aria-invalid={invalid} className="ui-field mt-1.5 px-3 py-2.5 text-base tabular-nums" />
    </label>
  )

  return (
    <div className="space-y-8" data-running-workspace>
      <div className="space-y-8 print:hidden">
      <header className="print:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">{t('title')}</h1>
        <p className="mt-2 text-sm sm:text-base text-muted">{t('description')}</p>
      </header>

      {model.queryError && <div data-running-query-error={model.queryError} role="status" className="rounded-xl bg-subtle p-4 text-sm text-body"><p>{t(`comparison.query.${model.queryError}`)}</p>{model.blocked && <button type="button" data-running-query-reset onClick={reset} className="ui-btn-soft mt-3 min-h-11 px-4 py-2">{t('comparison.query.reset')}</button>}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] print:block">
        <section aria-labelledby="running-input-title" className="ui-card p-5 sm:p-6 space-y-5 print:hidden">
          {result && <MobileResultLink href="#running-pace-result" label={t(mode === 'time' ? 'result.pace' : 'result.finish')} value={mode === 'time' ? `${formatClock(result.secondsPerKm)}/km` : formatClock(result.finishSeconds, true)} />}
          <h2 id="running-input-title" className="text-lg font-semibold text-fg">{t('input.title')}</h2>
          <div>
            <p className="mb-2 text-sm font-medium text-body">{t('input.distance')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DISTANCES.map((km, index) => (
                <button key={km} data-running-distance={km} type="button" aria-pressed={preset === km} onClick={() => update({ preset: km })}
                  className={`min-h-11 rounded-lg px-2 py-2.5 text-sm font-medium ${preset === km ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {t(`distance.${index}`)}
                </button>
              ))}
              <button type="button" data-running-distance="custom" aria-pressed={preset === 'custom'} onClick={() => update({ preset: 'custom' })}
                className={`min-h-11 rounded-lg px-2 py-2.5 text-sm font-medium ${preset === 'custom' ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                {t('distance.custom')}
              </button>
            </div>
            {preset === 'custom' && (
              <label htmlFor="running-distance" className="mt-3 block text-sm font-medium text-body">
                {t('input.customDistance')}
                <input id="running-distance" type="text" inputMode="decimal" value={customDistance}
                  onChange={event => update({ customDistance: event.target.value })} aria-invalid={distance === null}
                  aria-describedby={distance === null ? 'running-distance-error' : undefined}
                  placeholder="12.5" className="ui-field mt-1.5 px-3 py-2.5 text-base tabular-nums" />
              </label>
            )}
            {preset === 'custom' && distance === null && <p id="running-distance-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{t('error.distance')}</p>}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-body">{t('input.mode')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['time', 'pace'] as const).map(option => (
                <button key={option} type="button" data-running-mode={option} aria-pressed={mode === option} onClick={() => selectMode(option)}
                  className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium ${mode === option ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {t(`mode.${option}`)}
                </button>
              ))}
            </div>
          </div>

          {mode === 'time' ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-body">{t('input.goalTime')}</legend>
              <div className="grid grid-cols-3 gap-2">
                {timeField('running-hours', t('unit.hours'), hours, next => update({ hours: next }), value === null)}
                {timeField('running-minutes', t('unit.minutes'), minutes, next => update({ minutes: next }), value === null)}
                {timeField('running-seconds', t('unit.seconds'), seconds, next => update({ seconds: next }), value === null)}
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-body">{t('input.targetPace')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {timeField('running-pace-minutes', t('unit.minutes'), paceMinutes, next => update({ paceMinutes: next }), value === null)}
                {timeField('running-pace-seconds', t('unit.seconds'), paceSeconds, next => update({ paceSeconds: next }), value === null)}
              </div>
            </fieldset>
          )}
          {value === null && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{mode === 'time' ? t('error.time') : t('error.pace')}</p>}

          <div>
            <p className="mb-2 text-sm font-medium text-body">{t('input.splitInterval')}</p>
            <div className="grid grid-cols-2 gap-2">
              {([1, 5] as const).map(km => (
                <button key={km} type="button" data-running-split={km} aria-pressed={splitKm === km} onClick={() => update({ splitKm: km })}
                  className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium ${splitKm === km ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="running-pace-result" aria-labelledby="running-result-title" className="ui-card p-5 sm:p-6 scroll-mt-20 print:border-0 print:shadow-none print:p-0">
          <div className="flex items-center justify-between gap-3">
            <h2 id="running-result-title" className="text-lg font-semibold text-fg">{t('result.title')}</h2>
            <div className="flex gap-2 print:hidden">
              <button type="button" data-running-single-action="copy" disabled={!result || !model.ready} onClick={copy} className="min-h-11 rounded-lg bg-soft px-3 py-2 text-sm text-body hover:bg-subtle disabled:opacity-50">{t('action.copy')}</button>
              <button type="button" data-running-single-action="print" disabled={!result || !model.ready} onClick={printSingle} className="min-h-11 rounded-lg bg-soft px-3 py-2 text-sm text-body hover:bg-subtle disabled:opacity-50">{t('action.print')}</button>
            </div>
          </div>
          {result ? (
            <div className="mt-5 space-y-5" aria-live="polite">
              <p className="text-sm text-muted">{formatDistance(result.distanceKm)}</p>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-soft p-4"><dt className="text-sm text-muted">{t('result.finish')}</dt><dd className="mt-1 text-xl font-bold tabular-nums text-fg">{formatClock(result.finishSeconds, true)}</dd></div>
                <div className="rounded-xl bg-soft p-4"><dt className="text-sm text-muted">{t('result.pace')}</dt><dd className="mt-1 text-xl font-bold tabular-nums text-fg">{formatClock(result.secondsPerKm)}<span className="ml-1 text-sm font-normal">/km</span></dd></div>
                <div className="rounded-xl bg-soft p-4"><dt className="text-sm text-muted">{t('result.speed')}</dt><dd className="mt-1 text-xl font-bold tabular-nums text-fg">{result.speedKmh.toFixed(2)}<span className="ml-1 text-sm font-normal">km/h</span></dd></div>
              </dl>
              <div>
                <h3 className="mb-2 font-semibold text-fg">{t('splits.title', { interval: splitKm })}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left tabular-nums">
                    <caption className="sr-only">{t('splits.title', { interval: splitKm })}</caption>
                    <thead><tr className="border-b border-line text-muted"><th scope="col" className="py-2 pr-4">{t('splits.distance')}</th><th scope="col" className="py-2">{t('splits.elapsed')}</th></tr></thead>
                    <tbody>{result.splits.map((row, index) => (
                      <tr key={row.distanceKm} className={`border-b border-line last:border-0 ${index === result.splits.length - 1 ? 'font-semibold text-fg' : 'text-body'}`}>
                        <th scope="row" className="py-2 pr-4 font-inherit">{formatDistance(row.distanceKm)}{index === result.splits.length - 1 ? ` · ${t('splits.finish')}` : ''}</th>
                        <td className="py-2">{formatClock(row.elapsedSeconds, true)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : <p className="mt-5 text-sm text-muted" role="status">{t('result.invalid')}</p>}
        </section>
      </div>

      <RunningPaceComparison distanceKm={model.blocked ? null : distance} splitKm={splitKm} currentResult={result} goals={goals} onChange={updateGoals} onExport={exportComparison} />
      {visible && <section data-running-output={visible.status} className="rounded-xl bg-subtle p-4 text-sm text-body" aria-live="polite">
        <p>{t(`comparison.copy.${visible.status}`)}</p>
        {visible.status === 'failed' && <div className="mt-3 space-y-3">
          <label htmlFor="running-copy-manual" className="block">{t('comparison.copy.label')}</label>
          <textarea ref={manual} id="running-copy-manual" data-running-copy-manual readOnly value={visible.text} className="ui-field min-h-40 w-full p-3 text-base" />
          <div className="flex flex-wrap gap-2">
            <button type="button" data-running-recovery="select" onClick={() => selectManual(visible)} className="ui-btn-soft min-h-11 px-4 py-2">{t('comparison.copy.select')}</button>
            <button type="button" data-running-recovery="retry" onClick={() => { if (isCurrent(visible.token)) void copyText(visible.text) }} className="ui-btn-soft min-h-11 px-4 py-2">{t('comparison.copy.retry')}</button>
            <button type="button" data-running-recovery="close" onClick={() => { if (isCurrent(visible.token)) invalidateOwn() }} className="ui-btn-soft min-h-11 px-4 py-2">{t('comparison.copy.close')}</button>
          </div>
          {visible.selectionFailed && <p role="status">{t('comparison.copy.selectionFailed')}</p>}
        </div>}
      </section>}
      {model.shareUrl && result && <div data-running-share-boundary onClickCapture={invalidateOwn}>
        <ShareResult resultKey={`${scope}:${shareRevision}`} url={model.shareUrl} card={{ tool: t('title'), label: goals.length ? t('comparison.title') : t('result.title'), headline: formatDistance(result.distanceKm), sub: t('comparison.shareNotice'), rows: comparison ? comparison.goals.map(goal => ({ label: t('comparison.goal', { number: goal.number }), value: `${formatClock(goal.finishSeconds, true)} · ${formatClock(goal.secondsPerKm)}/km` })) : [{ label: t('result.finish'), value: formatClock(result.finishSeconds, true) }, { label: t('result.pace'), value: `${formatClock(result.secondsPerKm)}/km` }, { label: t('result.speed'), value: `${result.speedKmh.toFixed(2)} km/h` }] }} />
        <p className="mt-2 text-xs text-sub">{t('comparison.query.notice')}</p>
      </div>}

      <section className="ui-card p-5 sm:p-6 space-y-3 print:break-before-page">
        <h2 className="text-lg font-semibold text-fg">{t('guide.title')}</h2>
        <p className="text-sm text-body">{t('guide.formula')}</p>
        <p className="text-sm text-body">{t('guide.splits')}</p>
        <p className="text-sm text-muted">{t('guide.note')}</p>
        <Link href="/exercise-calorie/" prefetch={false} className="inline-block text-sm font-medium text-primary hover:underline print:hidden">{t('guide.exerciseLink')}</Link>
      </section>
      </div>
      {printVisible && <RunningPacePrint snapshot={printVisible.snapshot} />}
    </div>
  )
}
