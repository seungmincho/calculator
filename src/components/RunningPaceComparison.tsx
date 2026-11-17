'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n/runningPace'
import MobileResultLink from '@/components/MobileResultLink'
import { formatClock, formatDistance, type RunningResult } from '@/utils/runningPace'
import { captureRunningComparison, currentRunningGoal, evaluateRunningGoals, updateRunningGoal, type RunningGoalDraft, type RunningComparisonSnapshot } from '@/utils/runningPaceComparison'

export interface RunningPaceComparisonProps {
  distanceKm: number | null
  splitKm: 1 | 5
  currentResult: RunningResult | null
  goals: readonly RunningGoalDraft[]
  onChange: (update: (previous: readonly RunningGoalDraft[]) => RunningGoalDraft[]) => void
  onExport: (format: 'tsv' | 'csv' | 'print', snapshot: RunningComparisonSnapshot) => void
  share?: ReactNode
  feedback?: ReactNode
}
export default function RunningPaceComparison({ distanceKm, splitKm, currentResult, goals, onChange, onExport, share, feedback }: RunningPaceComparisonProps) {
  const t = useTranslations('runningPace'), id = useId(), sequence = useRef(0)
  const comparison = evaluateRunningGoals(distanceKm, goals, splitKm), current = currentRunningGoal(currentResult)
  const snapshot = captureRunningComparison(distanceKm, goals, splitKm)
  const key = JSON.stringify([distanceKm, splitKm, goals])
  const [paging, setPaging] = useState({ key: '', page: 0 })
  const pages = Math.max(1, Math.ceil(comparison.splitRows.length / 50))
  const page = paging.key === key ? Math.min(paging.page, pages - 1) : 0
  const pageRows = comparison.splitRows.slice(page * 50, (page + 1) * 50)
  const full = goals.length >= 3
  const add = (fromCurrent: boolean) => {
    if (fromCurrent && current.kind !== 'ready') return
    const nextId = `${id}-goal-${++sequence.current}`
    const fields = fromCurrent && current.kind === 'ready' ? current.fields : { hours: '0', minutes: '', seconds: '0' }
    onChange(previous => previous.length >= 3 ? [...previous] : [...previous.map(goal => ({ ...goal })), { id: nextId, ...fields }])
  }
  const emit = (format: 'tsv' | 'csv' | 'print') => { if (snapshot) onExport(format, snapshot) }
  return <section className="ui-card min-w-0 p-5 sm:p-6 space-y-5" data-running-comparison aria-labelledby={`${id}-title`}>
    <div className="print:hidden"><MobileResultLink href="#running-comparison-result" label={t('comparison.title')} value={t('comparison.validCount', { valid: comparison.validCount, total: goals.length })} /></div>
    <div><h2 id={`${id}-title`} className="text-xl font-bold text-fg">{t('comparison.title')}</h2><p className="mt-2 text-sm text-sub">{t('comparison.description')}</p></div>
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        <button type="button" data-running-goal-action="addCurrent" disabled={full || current.kind !== 'ready'} onClick={() => add(true)} className="ui-btn min-h-11 px-4 py-2.5 disabled:opacity-50">{t('comparison.addCurrent')}</button>
        <button type="button" data-running-goal-action="addBlank" disabled={full} onClick={() => add(false)} className="ui-btn-soft min-h-11 px-4 py-2.5 disabled:opacity-50">{t('comparison.addBlank')}</button>
      </div>
      <p className="text-sm text-sub">{t(full ? 'comparison.limit' : 'comparison.secondsNotice')}</p>
      {!full && current.kind !== 'ready' && <p className="text-sm text-sub">{t(`comparison.addErrors.${current.kind}`)}</p>}
      {goals.length === 0 && <p className="text-sm text-muted">{t('comparison.empty')}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {comparison.rows.map(row => <fieldset key={row.id} data-running-goal={row.id} className="min-w-0 rounded-xl border border-line p-4">
          <legend className="px-1 font-semibold text-fg">{t('comparison.goal', { number: row.number })}</legend>
          <div className="grid grid-cols-3 gap-2">
            {(['hours', 'minutes', 'seconds'] as const).map(field => <label key={field} className="min-w-0 text-sm text-body" htmlFor={`${id}-${row.id}-${field}`}>{t(`unit.${field}`)}
              <input id={`${id}-${row.id}-${field}`} data-running-goal-field={field} type="text" inputMode="numeric" value={row.draft[field]} aria-invalid={row.finishSeconds === null}
                onChange={event => { const value = event.target.value; onChange(previous => updateRunningGoal(previous, row.id, { [field]: value })) }} className="ui-field mt-1 w-full min-w-0 px-2 py-3 text-base tabular-nums" />
            </label>)}
          </div>
          {row.finishSeconds === null && <p role="status" className="mt-2 text-sm text-sub">{t('comparison.invalidTime')}</p>}
          <button type="button" data-running-goal-action="remove" onClick={() => onChange(previous => previous.filter(goal => goal.id !== row.id).map(goal => ({ ...goal })))} className="ui-btn-soft mt-3 min-h-11 px-3 py-2">{t('comparison.remove', { number: row.number })}</button>
        </fieldset>)}
      </div>
    </div>
    <div id="running-comparison-result" className="min-w-0 scroll-mt-20 space-y-4" data-running-comparison-result>
      <p role="status" className="text-sm text-sub">{t('comparison.validCount', { valid: comparison.validCount, total: goals.length })}</p>
      {!comparison.distanceValid && <p className="text-sm text-sub">{t('comparison.invalidDistance')}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {comparison.rows.map(row => <div key={row.id} className="min-w-0 rounded-xl bg-subtle p-4" data-running-goal-summary={row.number}>
          <h3 className="font-semibold text-fg">{t('comparison.goal', { number: row.number })}</h3>
          {row.result ? <dl className="mt-3 space-y-2 text-sm [overflow-wrap:anywhere]">
            <div><dt className="text-sub">{t('result.finish')}</dt><dd className="text-lg font-bold tabular-nums text-fg">{formatClock(row.result.finishSeconds, true)}</dd></div>
            <div><dt className="text-sub">{t('result.pace')}</dt><dd className="tabular-nums text-fg">{formatClock(row.result.secondsPerKm)}/km</dd></div>
            <div><dt className="text-sub">{t('result.speed')}</dt><dd className="tabular-nums text-fg">{row.result.speedKmh.toFixed(2)} km/h</dd></div>
            {row.deltaSeconds !== null && <div><dt className="text-sub">{t('comparison.difference')}</dt><dd className="tabular-nums text-fg">{row.shortest ? t('comparison.shortest') : t('comparison.slower', { time: formatClock(row.deltaSeconds, true) })}</dd></div>}
          </dl> : <p className="mt-3 text-sm text-sub">{t(row.finishSeconds === null ? 'comparison.invalidTime' : 'comparison.invalidDistance')}</p>}
        </div>)}
      </div>
      {comparison.splitRows.length > 0 && <>
        <h3 className="font-semibold text-fg">{t('comparison.splitsTitle', { interval: splitKm })}</h3>
        <p className="text-sm text-sub">{t('comparison.tableNotice', { total: comparison.splitRows.length })}</p>
        <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={t('comparison.tableLabel')}>
          <table className="w-full min-w-[24rem] text-left text-sm tabular-nums">
            <caption className="sr-only">{t('comparison.tableLabel')}</caption>
            <thead><tr className="border-b border-line"><th scope="col" className="px-2 py-3 text-sub">{t('splits.distance')}</th>{comparison.rows.map(row => <th key={row.id} scope="col" className="px-2 py-3 text-sub">{t('comparison.goal', { number: row.number })}</th>)}</tr></thead>
            <tbody>{pageRows.map(row => <tr key={row.distanceKm} className="border-b border-line last:border-0"><th scope="row" className="px-2 py-3 font-normal text-body">{formatDistance(row.distanceKm)}</th>{row.elapsedSeconds.map((elapsed, index) => <td key={comparison.rows[index].id} className="px-2 py-3 text-body">{elapsed === null ? t('comparison.notCalculated') : formatClock(elapsed, true)}</td>)}</tr>)}</tbody>
          </table>
        </div>
        {pages > 1 && <div className="flex flex-wrap items-center gap-3 print:hidden"><button type="button" data-running-page="previous" disabled={page === 0} onClick={() => setPaging({ key, page: page - 1 })} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-50">{t('comparison.previous')}</button><span className="text-sm text-sub">{t('comparison.page', { page: page + 1, pages })}</span><button type="button" data-running-page="next" disabled={page + 1 >= pages} onClick={() => setPaging({ key, page: page + 1 })} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-50">{t('comparison.next')}</button></div>}
      </>}
      <div className="flex flex-wrap gap-2 print:hidden">{(['tsv', 'csv', 'print'] as const).map(format => <button key={format} type="button" data-running-export={format} disabled={!snapshot} onClick={() => emit(format)} className="ui-btn-soft min-h-11 px-4 py-2.5 disabled:opacity-50">{t(`comparison.export.${format}`)}</button>)}</div>
      {goals.length > 0 && !snapshot && <p className="text-sm text-sub print:hidden">{t('comparison.export.invalid')}</p>}
      {feedback}
      {snapshot && share}
    </div>
  </section>
}
