'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/lunarConverter'
import type { LunarDate, SolarDate } from '@/utils/lunarCalendar'
import {
  LUNAR_ANNIVERSARIES_KEY, LUNAR_ANNIVERSARY_LIMIT, LUNAR_ANNIVERSARY_NAME_LIMIT,
  isSavedLunarDate, nextSavedLunarAnniversary, readLunarAnniversaries, readLunarAnniversaryForLoad,
  withLunarAnniversariesLock, writeLunarAnniversaryAction,
  type LunarAnniversaryAction, type LunarAnniversaryError, type LunarAnniversaryRead, type SavedLunarAnniversary,
} from '@/utils/lunarSavedAnniversaries'

type Notice = { error: LunarAnniversaryError } | { status: 'saved' | 'renamed' | 'deleted' | 'loaded' | 'refreshed' | 'cancelled' }
type Selection = { kind: 'load' | 'rename' | 'delete'; id: string }
const token = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
function read(): LunarAnniversaryRead {
  try { return readLunarAnniversaries(window.localStorage) }
  catch { return { ok: false, error: 'unavailable' } }
}

export default function LunarSavedAnniversaries({ lunar, today, ready, inputKey, onLoad }: {
  lunar: LunarDate | null
  today: SolarDate | null
  ready: boolean
  inputKey: string
  onLoad: (record: SavedLunarAnniversary) => boolean
}) {
  const t = useTranslations('lunarConverter')
  const hydrated = useHydrated()
  const nameId = useId()
  const [stored, setStored] = useState<LunarAnniversaryRead | null>(null)
  const [name, setName] = useState('')
  const [rename, setRename] = useState('')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastInputKey, setLastInputKey] = useState(inputKey)
  const mounted = useRef(false)
  const request = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const working = useRef(false)

  if (hydrated && stored === null) setStored(read())
  if (lastInputKey !== inputKey) {
    setLastInputKey(inputKey); setSelection(null); setBusy(false); setNotice(null)
  }
  const invalidate = useCallback(() => {
    request.current++; controller.current?.abort(); controller.current = null; working.current = false
  }, [])
  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; invalidate() }
  }, [invalidate])
  useLayoutEffect(() => { invalidate() }, [inputKey, invalidate])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== null && event.key !== LUNAR_ANNIVERSARIES_KEY) return
      if (stored?.ok && event.key !== null && event.newValue === stored.snapshot.raw) return
      invalidate(); setBusy(false); setConflict(true); setSelection(null); setNotice({ error: 'conflict' })
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [stored, invalidate])

  const records = stored?.ok ? stored.snapshot.anniversaries : []
  const blocked = !ready || !stored?.ok || conflict || busy
  const error = stored && !stored.ok ? stored.error : notice && 'error' in notice ? notice.error : conflict ? 'conflict' : null
  const lunarLabel = (date: LunarDate) => t('lunarDate', { year: date.year, leap: date.isLeap ? t('leapPrefix') : '', month: date.month, day: date.day })
  const refresh = () => {
    invalidate(); setBusy(false); setSelection(null); setConflict(false)
    const next = read(); setStored(next); setNotice(next.ok ? { status: 'refreshed' } : { error: next.error })
  }
  const cancel = () => { invalidate(); setBusy(false); setSelection(null); setNotice({ status: 'cancelled' }) }
  const run = async (action: LunarAnniversaryAction | { kind: 'load'; id: string }) => {
    if (blocked || working.current || !stored?.ok) return
    working.current = true
    const generation = ++request.current
    const abort = new AbortController()
    controller.current = abort
    const current = () => mounted.current && request.current === generation && !abort.signal.aborted
    setBusy(true); setNotice(null)
    try {
      const result = await withLunarAnniversariesLock(() => {
        if (!current()) return null
        return action.kind === 'load'
          ? readLunarAnniversaryForLoad(stored.snapshot, action.id, window.localStorage)
          : writeLunarAnniversaryAction(stored.snapshot, action, token(), window.localStorage)
      }, abort.signal)
      if (!current() || !result) return
      if (!result.ok) {
        setNotice({ error: result.error })
        if (['conflict', 'unverified', 'missing'].includes(result.error)) setConflict(true)
        return
      }
      if ('record' in result) {
        if (!onLoad(result.record)) { setNotice({ error: 'invalid' }); return }
        setNotice({ status: 'loaded' })
      } else {
        setStored(result)
        setNotice({ status: action.kind === 'add' ? 'saved' : action.kind === 'rename' ? 'renamed' : 'deleted' })
        if (action.kind === 'add') setName('')
      }
      setSelection(null)
    } catch { if (current()) setNotice({ error: 'unavailable' }) }
    finally {
      if (current()) { working.current = false; controller.current = null; setBusy(false) }
    }
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSavedLunarDate(lunar)) { setNotice({ error: 'invalid' }); return }
    void run({ kind: 'add', record: { id: token(), name, lunar: { ...lunar } } })
  }

  return <details open id="lunar-saved-anniversaries" className="ui-card min-w-0 p-4 sm:p-6">
    <summary className="min-h-11 cursor-pointer text-base font-semibold text-fg">{t('savedAnniversaries.title')} <span className="text-sm font-normal text-sub">{t('savedAnniversaries.count', { count: records.length, max: LUNAR_ANNIVERSARY_LIMIT })}</span></summary>
    <div className="mt-2 space-y-4">
      <p className="text-sm text-sub">{t('savedAnniversaries.description')}</p>
      <form onSubmit={save} className="space-y-2">
        <label htmlFor={nameId} className="block text-sm font-medium text-body">{t('savedAnniversaries.name')}</label>
        <input id={nameId} data-lunar-anniversary-name value={name} onChange={event => setName(event.target.value)} maxLength={LUNAR_ANNIVERSARY_NAME_LIMIT} disabled={busy} autoComplete="off" className="ui-field min-h-11 w-full min-w-0 px-3 py-2 text-base" />
        <p className="text-xs text-muted">{t('savedAnniversaries.nameHint', { max: LUNAR_ANNIVERSARY_NAME_LIMIT })}</p>
        <p className="text-sm text-body [overflow-wrap:anywhere]">{lunar && ready ? t('savedAnniversaries.current', { date: lunarLabel(lunar) }) : t('savedAnniversaries.noCurrent')}</p>
        <button type="submit" disabled={blocked || !name.trim() || !isSavedLunarDate(lunar) || records.length >= LUNAR_ANNIVERSARY_LIMIT} className="ui-btn min-h-11 w-full px-3 py-3 disabled:opacity-50">{t('savedAnniversaries.save')}</button>
      </form>
      {busy && <div className="flex flex-wrap items-center gap-2"><p role="status" className="text-sm text-sub">{t('savedAnniversaries.working')}</p><button type="button" onClick={cancel} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('savedAnniversaries.cancelPending')}</button></div>}
      {error && <p role="alert" className="text-sm text-body">{t(`savedAnniversaries.errors.${error}`)}</p>}
      {!error && notice && 'status' in notice && <p role="status" className="text-sm text-primary">{t(`savedAnniversaries.${notice.status}`)}</p>}
      {!ready || !stored ? <p role="status" className="text-sm text-muted">{t('savedAnniversaries.loading')}</p> : stored.ok && !records.length && <p className="text-sm text-muted">{t('savedAnniversaries.empty')}</p>}
      {records.length >= LUNAR_ANNIVERSARY_LIMIT && <p className="text-xs text-muted">{t('savedAnniversaries.errors.limit')}</p>}
      {!!records.length && <ul aria-label={t('savedAnniversaries.list')} className="space-y-3">
        {records.map(record => {
          const next = today ? nextSavedLunarAnniversary(record, today) : null
          const adjustment = next ? [next.leapFallback ? t('yearly.leapFallback', { month: record.lunar.month }) : '', next.dayFallback ? t('yearly.dayFallback') : ''].filter(Boolean).join(' · ') : ''
          const active = selection?.id === record.id ? selection : null
          return <li key={record.id} data-lunar-anniversary={record.id} className="space-y-2 rounded-xl bg-subtle p-3">
            <h3 className="text-base font-semibold text-fg [overflow-wrap:anywhere]">{record.name}</h3>
            <p className="text-sm text-body [overflow-wrap:anywhere]">{t('savedAnniversaries.original', { date: lunarLabel(record.lunar) })}</p>
            <p className="text-sm text-sub">{next ? t('savedAnniversaries.next', { date: t('solarDate', { year: next.solar.year, month: next.solar.month, day: next.solar.day }) }) : t(today ? 'savedAnniversaries.noNext' : 'savedAnniversaries.loading')}</p>
            {!!adjustment && <p className="text-xs text-muted">{adjustment}</p>}
            {active ? <div className="space-y-2">
              {active.kind === 'rename' ? <label className="block text-sm text-body">{t('savedAnniversaries.renameLabel')}<input value={rename} maxLength={LUNAR_ANNIVERSARY_NAME_LIMIT} onChange={event => setRename(event.target.value)} disabled={busy} className="ui-field mt-2 min-h-11 w-full min-w-0 px-3 py-2 text-base" /></label> : <p className="text-sm text-body [overflow-wrap:anywhere]">{t(active.kind === 'load' ? 'savedAnniversaries.loadPrompt' : 'savedAnniversaries.deletePrompt', { name: record.name, date: lunarLabel(record.lunar) })}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={blocked || (active.kind === 'rename' && !rename.trim())} onClick={() => {
                  if (active.kind === 'rename') void run({ kind: 'rename', id: active.id, name: rename })
                  else if (active.kind === 'load') void run({ kind: 'load', id: active.id })
                  else void run({ kind: 'delete', id: active.id })
                }} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t(`savedAnniversaries.${active.kind}Confirm`)}</button>
                <button type="button" onClick={cancel} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('savedAnniversaries.cancel')}</button>
              </div>
            </div> : <div className="flex flex-wrap gap-2">
              {(['load', 'rename', 'delete'] as const).map(kind => <button key={kind} type="button" disabled={blocked} onClick={() => { setSelection({ kind, id: record.id }); setRename(record.name); setNotice(null) }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t(`savedAnniversaries.${kind}`)}</button>)}
            </div>}
          </li>
        })}
      </ul>}
      <button type="button" disabled={!hydrated || busy} onClick={refresh} className="ui-btn-soft min-h-11 w-full px-3 py-2 text-sm disabled:opacity-50">{t('savedAnniversaries.refresh')}</button>
      <p className="text-xs text-muted">{t('savedAnniversaries.localOnly')}</p>
    </div>
  </details>
}
