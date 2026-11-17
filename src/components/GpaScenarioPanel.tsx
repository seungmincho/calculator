'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gpaCalculator'
import GpaScenarioBackup from '@/components/GpaScenarioBackup'
import {
  GPA_SCENARIOS_KEY, GPA_SCENARIO_LIMIT, GPA_SCENARIO_NAME_LIMIT,
  appendGpaScenario, compareGpaSnapshots, gpaStorageError, isGpaSnapshot,
  readGpaScenarios, withGpaStorageLock, writeGpaScenarios,
  type GpaReadResult, type GpaScenario, type GpaSnapshot, type GpaStorageError,
} from '@/utils/gpaScenarios'

type PendingAction = { kind: 'save'; name: string; snapshot: GpaSnapshot } | { kind: 'load' | 'delete'; scenario: GpaScenario }

export default function GpaScenarioPanel({ current, fromLink, onRestore }: {
  current: GpaSnapshot
  fromLink: boolean
  onRestore: (snapshot: GpaSnapshot) => void
}) {
  const t = useTranslations('gpaCalculator')
  const [view, setView] = useState<GpaReadResult | null>(null)
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<GpaStorageError | null>(null)
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [busy, setBusy] = useState(false)

  function refresh() {
    try { setView(readGpaScenarios(window.localStorage)) }
    catch (cause) { setView({ ok: false, error: gpaStorageError(cause) }) }
    setError(null)
    setNotice('')
    setPending(null)
  }

  useEffect(() => {
    refresh()
    const changed = (event: StorageEvent) => {
      if (event.key !== GPA_SCENARIOS_KEY && event.key !== null) return
      setError('conflict')
      setNotice('')
      setPending(null)
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])

  useEffect(() => {
    if (pending) document.getElementById('gpa-scenario-confirm-cancel')?.focus()
  }, [pending])

  const scenarios = view?.ok ? view.store.scenarios : []
  const selected = scenarios.find(item => item.id === selectedId)
  const comparison = useMemo(() => selected ? compareGpaSnapshots(current, selected.snapshot) : null, [current, selected])
  const storageIssue = view && !view.ok ? view.error : error
  const canWrite = !!view?.ok && error !== 'conflict' && !busy
  const validCurrent = isGpaSnapshot(current)

  async function confirmAction() {
    if (!pending || !view?.ok || !canWrite) return
    const action = pending
    const expectedView = view
    setBusy(true)
    setNotice('')
    try {
      await withGpaStorageLock(GPA_SCENARIOS_KEY, () => {
        const storage = window.localStorage
        if (storage.getItem(GPA_SCENARIOS_KEY) !== expectedView.raw) {
          setError('conflict')
          return
        }
        if (action.kind === 'load') {
          onRestore(structuredClone(action.scenario.snapshot))
          setNotice(t('scenarios.loaded', { name: action.scenario.name }))
          setError(null)
          return
        }
        const id = crypto.randomUUID()
        const next = action.kind === 'save'
          ? appendGpaScenario(expectedView.store, action.snapshot, action.name, id, new Date().toISOString())
          : { ...expectedView.store, revision: id, scenarios: expectedView.store.scenarios.filter(item => item.id !== action.scenario.id) }
        const result = writeGpaScenarios(storage, expectedView.raw, next)
        if (!result.ok) { setError(result.error); return }
        setView({ ok: true, raw: result.raw, store: next })
        setError(null)
        if (action.kind === 'save') {
          setSelectedId(id)
          setName('')
          setNotice(t('scenarios.saved', { name: action.name }))
        } else {
          setSelectedId('')
          setNotice(t('scenarios.deleted', { name: action.scenario.name }))
        }
      })
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : ''
      setError(code === 'name' || code === 'limit' || code === 'invalid' ? code : gpaStorageError(cause))
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const number = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}`
  const gpa = (value: number, credits: number, scale: string) => credits ? `${value.toFixed(2)} / ${scale}` : t('scenarios.noGrades')

  return (
    <section className="ui-card min-w-0 p-4 sm:p-6" aria-labelledby="gpa-scenarios-title">
      <h2 id="gpa-scenarios-title" className="text-lg font-semibold text-fg">{t('scenarios.title')}</h2>
      <p className="mt-1 text-sm text-sub">{t('scenarios.description', { max: GPA_SCENARIO_LIMIT })}</p>
      <p className="mt-2 text-xs text-muted">{t(fromLink ? 'scenarios.sharedHint' : 'scenarios.localHint')}</p>

      {storageIssue && (
        <div className="mt-4 rounded-xl bg-subtle p-4 text-sm text-body" role="alert">
          <p>{t(`scenarios.errors.${storageIssue}`)}</p>
          <button type="button" className="ui-btn-soft mt-3 min-h-11 px-4 py-2" onClick={refresh} disabled={busy}>{t('scenarios.refresh')}</button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-body">{t('scenarios.name')}</span>
          <input value={name} maxLength={GPA_SCENARIO_NAME_LIMIT} onChange={event => setName(event.target.value)} placeholder={t('scenarios.namePlaceholder')} className="ui-field min-h-11 w-full px-3 py-2 text-base" disabled={busy || !!pending} />
        </label>
        <button type="button" disabled={!canWrite || !!pending || !name.trim() || !validCurrent || scenarios.length >= GPA_SCENARIO_LIMIT} className="ui-btn min-h-11 w-full px-4 py-2.5" onClick={() => { setNotice(''); setPending({ kind: 'save', name: name.trim(), snapshot: structuredClone(current) }) }}>{t('scenarios.save')}</button>
        {!validCurrent && <p className="text-sm text-sub" role="status">{t('scenarios.errors.invalid')}</p>}
        {scenarios.length >= GPA_SCENARIO_LIMIT && <p className="text-sm text-sub">{t('scenarios.errors.limit')}</p>}
      </div>

      {view?.ok && !scenarios.length && <p className="mt-4 text-sm text-muted">{t('scenarios.empty')}</p>}
      {scenarios.length > 0 && (
        <label className="mt-5 block">
          <span className="mb-1 block text-sm font-medium text-body">{t('scenarios.select')}</span>
          <select className="ui-field min-h-11 w-full min-w-0 px-3 py-2 text-base" value={selected ? selectedId : ''} disabled={busy || !!pending} onChange={event => { setSelectedId(event.target.value); setNotice('') }}>
            <option value="">{t('scenarios.selectPlaceholder')}</option>
            {scenarios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}

      {selected && comparison && (
        <div className="mt-4 space-y-4">
          <h3 className="break-words font-semibold text-fg">{t('scenarios.comparison', { name: selected.name })}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([
              ['current', comparison.current, current.scale],
              ['savedVersion', comparison.saved, selected.snapshot.scale],
            ] as const).map(([label, stats, scale]) => (
              <div key={label} className="min-w-0 rounded-xl bg-subtle p-3">
                <p className="mb-3 text-sm font-semibold text-fg">{t(`scenarios.${label}`)}</p>
                <dl className="space-y-2 text-sm tabular-nums">
                  {[
                    [t('result.cumulativeGpa'), gpa(stats.gpa, stats.gpaCredits, scale)],
                    [t('majorGpa'), gpa(stats.majorGpa, stats.majorCredits, scale)],
                    [t('earnedCredits'), String(stats.earnedCredits)],
                  ].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-sub">{label}</dt><dd className="font-medium text-fg">{value}</dd></div>)}
                </dl>
              </div>
            ))}
          </div>
          {comparison.sameScale ? (
            <p className="text-sm text-sub">{t('scenarios.difference', { gpa: number(comparison.gpaDifference), major: number(comparison.majorDifference), credits: number(comparison.creditDifference) })}</p>
          ) : (
            <div className="text-sm text-sub"><p>{t('scenarios.differentScale')}</p><p className="mt-1">{t('scenarios.creditDifference', { credits: number(comparison.creditDifference) })}</p></div>
          )}
          <p className="text-xs text-muted">{t('scenarios.savedGoal', { target: selected.snapshot.targetGpa || '—', remaining: selected.snapshot.remainingCredits || '—' })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-btn min-h-11 flex-1 px-4 py-2" disabled={!canWrite || !!pending} onClick={() => { setNotice(''); setPending({ kind: 'load', scenario: selected }) }}>{t('scenarios.load')}</button>
            <button type="button" className="ui-btn-soft min-h-11 px-4 py-2" disabled={!canWrite || !!pending} onClick={() => { setNotice(''); setPending({ kind: 'delete', scenario: selected }) }}>{t('scenarios.delete')}</button>
          </div>
        </div>
      )}

      {pending && (
        <div role="alertdialog" aria-labelledby="gpa-scenario-confirm-title" aria-describedby="gpa-scenario-confirm-body" className="mt-4 rounded-xl border border-line-strong bg-subtle p-4">
          <h3 id="gpa-scenario-confirm-title" className="font-semibold text-fg">{t(`scenarios.confirm.${pending.kind}Title`)}</h3>
          <p id="gpa-scenario-confirm-body" className="mt-2 break-words text-sm text-body">{t(`scenarios.confirm.${pending.kind}Body`, { name: pending.kind === 'save' ? pending.name : pending.scenario.name })}</p>
          {pending.kind === 'load' && fromLink && <p className="mt-2 text-sm text-sub">{t('scenarios.sharedRestore')}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="ui-btn min-h-11 px-4 py-2" disabled={busy} onClick={confirmAction}>{t(busy ? 'scenarios.working' : `scenarios.confirm.${pending.kind}Action`)}</button>
            <button id="gpa-scenario-confirm-cancel" type="button" className="ui-btn-soft min-h-11 px-4 py-2" disabled={busy} onClick={() => setPending(null)}>{t('scenarios.cancel')}</button>
          </div>
        </div>
      )}
      {notice && <p role="status" className="mt-3 break-words text-sm text-sub">{notice}</p>}
      <GpaScenarioBackup view={view} disabled={!canWrite || !!pending} onCommitted={result => { setView(result); setError(null); setNotice(''); setPending(null) }} />
    </section>
  )
}
