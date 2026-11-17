'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/taxiFare'
import {
  TAXI_SAVED_TRIPS_KEY, TAXI_SAVED_TRIPS_LIMIT, TAXI_TRIP_NAME_LIMIT,
  readTaxiSavedTrips, writeTaxiTripAction,
  type TaxiTripConditions, type TaxiTripsAction, type TaxiTripsError, type TaxiTripsSnapshot,
} from '@/utils/taxiSavedTrips'

type Notice = { success: 'saved' | 'renamed' | 'deleted' | 'loaded' | 'refreshed' } | { error: TaxiTripsError }

export default function TaxiSavedTrips({ conditions, onLoad }: {
  conditions: TaxiTripConditions | null
  onLoad: (conditions: TaxiTripConditions) => void
}) {
  const t = useTranslations('taxiFare')
  const hydrated = useHydrated()
  const [snapshot, setSnapshot] = useState<TaxiTripsSnapshot | null>(null)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)

  // Storage becomes visible after hydration; it never automatically changes calculator inputs.
  if (hydrated && snapshot === null) setSnapshot(readTaxiSavedTrips())

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== TAXI_SAVED_TRIPS_KEY) return
      if (snapshot?.status === 'ready' && (event.key === null || event.newValue !== snapshot.raw)) {
        setConflict(true)
        setNotice({ error: 'conflict' })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [snapshot])

  const trips = snapshot?.status === 'ready' ? snapshot.trips : []
  const blocked = snapshot?.status !== 'ready' || conflict || busy
  const storageError = snapshot && snapshot.status !== 'ready' ? snapshot.status : null
  const error = storageError ?? (conflict ? 'conflict' : notice && 'error' in notice ? notice.error : null)

  const summary = (value: TaxiTripConditions) => t('savedTrips.summary', {
    region: t(`regions.${value.region}`), type: t(`typesShort.${value.taxiType}`),
    distance: value.distance, time: value.time, hour: String(value.hour).padStart(2, '0'),
    traffic: t(`traffic.${value.traffic}`), people: value.people,
    area: t(value.outOfCity ? 'savedTrips.outside' : 'savedTrips.inside'),
    mode: t(value.timeAuto ? 'savedTrips.autoTime' : 'savedTrips.manualTime'),
  })

  const refresh = () => {
    const next = readTaxiSavedTrips()
    setSnapshot(next)
    setConflict(false)
    setEditingId(null)
    setDeletingId(null)
    setNotice(next.status === 'ready' ? { success: 'refreshed' } : { error: next.status })
  }

  const mutate = async (action: TaxiTripsAction) => {
    if (blocked || !snapshot) return
    setBusy(true)
    setNotice(null)
    try {
      // Serialize writes from cooperating tabs where Web Locks are available. The raw comparison
      // still detects an older view, and remains the fallback on browsers without Web Locks.
      const commit = () => writeTaxiTripAction(snapshot, action)
      const result = navigator.locks
        ? await navigator.locks.request(TAXI_SAVED_TRIPS_KEY, commit)
        : commit()
      if (!result.ok) {
        setNotice({ error: result.error })
        if (result.error === 'conflict') setConflict(true)
        return
      }
      setSnapshot(result.snapshot)
      setNotice({ success: action.kind === 'add' ? 'saved' : action.kind === 'rename' ? 'renamed' : 'deleted' })
      if (action.kind === 'add') setName('')
      setEditingId(null)
      setDeletingId(null)
    } catch {
      setNotice({ error: 'unavailable' })
    } finally {
      setBusy(false)
    }
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!conditions) {
      setNotice({ error: 'invalidConditions' })
      return
    }
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    void mutate({ kind: 'add', id, name, conditions })
  }

  const load = (id: string) => {
    if (blocked || snapshot?.status !== 'ready') return
    const current = readTaxiSavedTrips()
    if (current.status !== 'ready') {
      setSnapshot(current)
      setNotice({ error: current.status })
      return
    }
    if (current.raw !== snapshot.raw) {
      setConflict(true)
      setNotice({ error: 'conflict' })
      return
    }
    const trip = current.trips.find((item) => item.id === id)
    if (!trip) {
      setNotice({ error: 'missingTrip' })
      return
    }
    onLoad({ ...trip.conditions })
    setNotice({ success: 'loaded' })
  }

  return (
    <details className="rounded-2xl border border-line p-4" data-testid="taxi-saved-trips">
      <summary className="min-h-11 cursor-pointer text-base font-semibold text-fg [overflow-wrap:anywhere]">
        {t('savedTrips.title')} <span className="text-sm font-normal text-sub">{t('savedTrips.count', { count: trips.length, max: TAXI_SAVED_TRIPS_LIMIT })}</span>
      </summary>
      <div className="mt-2 space-y-4">
        <p className="text-sm text-sub">{t('savedTrips.description')}</p>
        {conditions && (
          <div className="rounded-xl bg-subtle p-3">
            <p className="text-sm font-medium text-body">{t('savedTrips.current')}</p>
            <p className="mt-1 text-sm text-sub [overflow-wrap:anywhere]">{summary(conditions)}</p>
          </div>
        )}
        {!conditions && <p className="text-sm text-sub">{t('savedTrips.errors.invalidConditions')}</p>}
        <form onSubmit={save} className="space-y-2">
          <label htmlFor="taxi-trip-name" className="block text-sm font-medium text-body">{t('savedTrips.name')}</label>
          <input id="taxi-trip-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={TAXI_TRIP_NAME_LIMIT} placeholder={t('savedTrips.namePlaceholder')} autoComplete="off" className="ui-field min-h-11 min-w-0 px-3 py-3 text-base" disabled={blocked} aria-describedby="taxi-trip-name-hint" />
          <p id="taxi-trip-name-hint" className="text-xs text-muted">{t('savedTrips.nameHint', { max: TAXI_TRIP_NAME_LIMIT })}</p>
          <button type="submit" disabled={blocked || !conditions || trips.length >= TAXI_SAVED_TRIPS_LIMIT} className="ui-btn min-h-11 w-full px-3 py-3 disabled:opacity-50">{t(busy ? 'savedTrips.saving' : 'savedTrips.save')}</button>
        </form>
        {trips.length >= TAXI_SAVED_TRIPS_LIMIT && <p className="text-sm text-sub">{t('savedTrips.errors.limit')}</p>}
        {error && (
          <div role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">
            <p>{t(`savedTrips.errors.${error}`)}</p>
          </div>
        )}
        {!error && notice && 'success' in notice && <p role="status" className="text-sm text-primary">{t(`savedTrips.${notice.success}`)}</p>}
        {snapshot === null && <p role="status" className="text-sm text-muted">{t('savedTrips.loading')}</p>}
        {snapshot?.status === 'ready' && trips.length === 0 && <p className="text-sm text-muted">{t('savedTrips.empty')}</p>}
        {trips.length > 0 && (
          <ul className="space-y-3" aria-label={t('savedTrips.list')}>
            {trips.map((trip) => (
              <li key={trip.id} className="rounded-xl bg-subtle p-3">
                <h3 className="text-base font-semibold text-fg [overflow-wrap:anywhere]">{trip.name}</h3>
                <p className="mt-1 text-sm text-sub [overflow-wrap:anywhere]">{summary(trip.conditions)}</p>
                {editingId === trip.id ? (
                  <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void mutate({ kind: 'rename', id: trip.id, name: editName }) }}>
                    <label htmlFor={`taxi-trip-rename-${trip.id}`} className="block text-sm font-medium text-body">{t('savedTrips.newName')}</label>
                    <input id={`taxi-trip-rename-${trip.id}`} value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={TAXI_TRIP_NAME_LIMIT} autoComplete="off" className="ui-field min-h-11 min-w-0 px-3 py-3 text-base" disabled={blocked} />
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('savedTrips.renameSave')}</button>
                      <button type="button" onClick={() => setEditingId(null)} disabled={busy} className="ui-btn-soft min-h-11 px-3 py-2">{t('savedTrips.cancel')}</button>
                    </div>
                  </form>
                ) : deletingId === trip.id ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-body [overflow-wrap:anywhere]">{t('savedTrips.deletePrompt', { name: trip.name })}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { void mutate({ kind: 'delete', id: trip.id }) }} disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('savedTrips.deleteConfirm')}</button>
                      <button type="button" onClick={() => setDeletingId(null)} disabled={busy} className="ui-btn-soft min-h-11 px-3 py-2">{t('savedTrips.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => load(trip.id)} disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('savedTrips.load')}</button>
                    <button type="button" onClick={() => { setEditingId(trip.id); setEditName(trip.name); setDeletingId(null) }} disabled={blocked} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-50">{t('savedTrips.rename')}</button>
                    <button type="button" onClick={() => { setDeletingId(trip.id); setEditingId(null) }} disabled={blocked} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-50">{t('savedTrips.delete')}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={refresh} disabled={!hydrated || busy} className="ui-btn-soft min-h-11 w-full px-3 py-2 disabled:opacity-50">{t('savedTrips.refresh')}</button>
        <p className="text-xs text-muted">{t('savedTrips.localOnly')}</p>
      </div>
    </details>
  )
}
