'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/whiteNoise'
import { cloneWhiteNoiseSettings, type WhiteNoiseSettings } from '@/utils/whiteNoise'
import { WHITE_NOISE_PROFILES_KEY, WHITE_NOISE_PROFILE_LIMIT, WHITE_NOISE_PROFILE_NAME_LIMIT,
  readWhiteNoiseProfiles, readWhiteNoiseProfileForLoad, writeWhiteNoiseProfileAction, withWhiteNoiseProfilesLock,
  type WhiteNoiseProfilesRead, type WhiteNoiseProfilesError, type WhiteNoiseProfileAction } from '@/utils/whiteNoiseProfiles'

type Notice = { error: WhiteNoiseProfilesError } | { status: 'saved' | 'loaded' | 'renamed' | 'deleted' | 'refreshed' | 'cancelled' | 'changed' }
const read = (): WhiteNoiseProfilesRead => { try { return readWhiteNoiseProfiles(window.localStorage) } catch { return { ok: false, error: 'unavailable' } } }
const id = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export default function WhiteNoiseProfiles({ settings, inputKey, onLoad }: { settings: WhiteNoiseSettings; inputKey: string; onLoad: (settings: WhiteNoiseSettings) => void }) {
  const t = useTranslations('whiteNoise'), hydrated = useHydrated(), nameId = useId(), selectId = useId(), renameId = useId()
  const [stored, setStored] = useState<WhiteNoiseProfilesRead | null>(null)
  const [name, setName] = useState(''), [selected, setSelected] = useState(''), [rename, setRename] = useState('')
  const [confirm, setConfirm] = useState<'load' | 'delete' | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null), [conflict, setConflict] = useState(false), [busy, setBusy] = useState(false)
  const [lastKey, setLastKey] = useState(inputKey)
  const mounted = useRef(false), working = useRef(false), generation = useRef(0), controller = useRef<AbortController | null>(null)
  const latestKey = useRef(inputKey)
  if (hydrated && stored === null) setStored(read())
  if (lastKey !== inputKey) { setLastKey(inputKey); setConfirm(null); setBusy(false); if (busy) setNotice({ status: 'changed' }) }
  const invalidate = useCallback(() => { generation.current++; controller.current?.abort(); controller.current = null; working.current = false }, [])
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; invalidate() } }, [invalidate])
  useLayoutEffect(() => { latestKey.current = inputKey; invalidate() }, [inputKey, invalidate])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== null && event.key !== WHITE_NOISE_PROFILES_KEY) return
      if (stored?.ok && event.key !== null && event.newValue === stored.snapshot.raw) return
      invalidate(); setBusy(false); setConfirm(null); setConflict(true); setNotice({ error: 'conflict' })
    }
    window.addEventListener('storage', changed); return () => window.removeEventListener('storage', changed)
  }, [stored, invalidate])
  const profiles = stored?.ok ? stored.snapshot.profiles : [], currentProfile = profiles.find(profile => profile.id === selected)
  const blocked = !hydrated || !stored?.ok || conflict || busy
  const error = stored && !stored.ok ? stored.error : notice && 'error' in notice ? notice.error : conflict ? 'conflict' : null
  const cancel = () => { invalidate(); setBusy(false); setConfirm(null); setNotice({ status: 'cancelled' }) }
  const reload = () => { invalidate(); setBusy(false); setConfirm(null); setConflict(false); const next = read(); setStored(next); setNotice(next.ok ? { status: 'refreshed' } : { error: next.error }); if (!next.ok || !next.snapshot.profiles.some(profile => profile.id === selected)) setSelected('') }
  const select = (value: string) => { invalidate(); setBusy(false); setSelected(value); setRename(profiles.find(profile => profile.id === value)?.name ?? ''); setConfirm(null); setNotice(null) }
  const run = async (action: WhiteNoiseProfileAction | { kind: 'load'; id: string }) => {
    if (blocked || working.current || !stored?.ok) return
    working.current = true
    const request = ++generation.current, abort = new AbortController(), key = inputKey
    controller.current = abort
    const active = () => mounted.current && request === generation.current && !abort.signal.aborted && latestKey.current === key
    setBusy(true); setNotice(null)
    try {
      const result = await withWhiteNoiseProfilesLock(() => {
        if (!active()) return null
        return action.kind === 'load' ? readWhiteNoiseProfileForLoad(stored.snapshot, action.id, window.localStorage) : writeWhiteNoiseProfileAction(stored.snapshot, action, window.localStorage)
      }, abort.signal)
      if (!active() || !result) return
      if (!result.ok) {
        setNotice({ error: result.error })
        if (['conflict', 'unconfirmed', 'missing'].includes(result.error)) setConflict(true)
        return
      }
      if ('record' in result) { onLoad(cloneWhiteNoiseSettings(result.record.settings)); setNotice({ status: 'loaded' }) }
      else {
        setStored(result); setNotice({ status: action.kind === 'add' ? 'saved' : action.kind === 'rename' ? 'renamed' : 'deleted' })
        if (action.kind === 'add') { setName(''); setSelected(action.record.id); setRename(action.record.name.trim()) }
        if (action.kind === 'delete') { setSelected(''); setRename('') }
      }
      setConfirm(null)
    } catch { if (active()) setNotice({ error: 'unavailable' }) }
    finally { if (active()) { working.current = false; controller.current = null; setBusy(false) } }
  }
  const save = (event: FormEvent) => { event.preventDefault(); void run({ kind: 'add', record: { id: id(), name, settings: cloneWhiteNoiseSettings(settings) } }) }
  const summary = (value: WhiteNoiseSettings) => t('profiles.summary', { type: t(`types.${value.type}`), volume: value.volume, timer: value.timerMinutes ? t('profiles.minutes', { minutes: value.timerMinutes }) : t('profiles.noTimer'), fade: t(value.fade ? 'profiles.fadeOn' : 'profiles.fadeOff') })
  return <section data-white-noise-profiles className="ui-card min-w-0 space-y-4 p-4 sm:p-6">
    <h2 className="text-lg font-semibold text-fg">{t('profiles.title')} <span className="text-sm font-normal text-sub">{profiles.length}/{WHITE_NOISE_PROFILE_LIMIT}</span></h2>
    <p className="text-sm text-sub">{t('profiles.hint')}</p>
    <form data-noise-profile-save onSubmit={save} className="space-y-2">
      <label htmlFor={nameId} className="block text-sm font-medium text-body">{t('profiles.name')}</label>
      <input id={nameId} data-noise-profile-name value={name} onChange={event => setName(event.target.value)} disabled={busy} maxLength={WHITE_NOISE_PROFILE_NAME_LIMIT} autoComplete="off" placeholder={t('profiles.namePlaceholder')} className="ui-field min-h-11 w-full min-w-0 px-3 py-2 text-base" />
      <p className="text-xs text-muted">{t('profiles.nameHint')}</p>
      <p className="text-sm text-sub [overflow-wrap:anywhere]">{summary(settings)}</p>
      <button type="submit" disabled={blocked || !name.trim() || profiles.length >= WHITE_NOISE_PROFILE_LIMIT} className="ui-btn min-h-11 w-full px-4 py-2">{t('profiles.save')}</button>
    </form>
    {busy && <div className="flex flex-wrap items-center gap-2"><p role="status" className="text-sm text-sub">{t('profiles.busy')}</p><button type="button" data-noise-profile-cancel onClick={cancel} className="ui-btn-soft min-h-11 px-3 py-2">{t('profiles.cancel')}</button></div>}
    {error && <p role="alert" className="text-sm text-body">{t(`profiles.errors.${error}`)}</p>}
    {!error && notice && 'status' in notice && <p role="status" className="text-sm text-body">{t(`profiles.${notice.status}`)}</p>}
    {!stored ? <p role="status" className="text-sm text-muted">{t('profiles.loading')}</p> : stored.ok && !profiles.length && <p className="text-sm text-sub">{t('profiles.empty')}</p>}
    {!!profiles.length && <div className="space-y-3 border-t border-line pt-4">
      <label htmlFor={selectId} className="block text-sm font-medium text-body">{t('profiles.savedList')}</label>
      <select id={selectId} data-noise-profile-select value={selected} onChange={event => select(event.target.value)} disabled={busy} className="ui-field min-h-11 w-full min-w-0 px-3 py-2 text-base">
        <option value="">{t('profiles.choose')}</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
      </select>
      {currentProfile && <div className="space-y-3 rounded-xl bg-subtle p-3">
        <p className="text-sm text-body [overflow-wrap:anywhere]">{summary(currentProfile.settings)}</p>
        <div className="flex flex-wrap gap-2"><button type="button" data-noise-profile-load disabled={blocked} onClick={() => { setConfirm('load'); setNotice(null) }} className="ui-btn min-h-11 px-3 py-2">{t('profiles.load')}</button><button type="button" data-noise-profile-delete disabled={blocked} onClick={() => { setConfirm('delete'); setNotice(null) }} className="ui-btn-soft min-h-11 px-3 py-2">{t('profiles.delete')}</button></div>
        {confirm && <div className="space-y-2"><p className="text-sm text-body [overflow-wrap:anywhere]">{t(confirm === 'load' ? 'profiles.confirmLoad' : 'profiles.confirmDelete', { name: currentProfile.name })}</p><div className="flex flex-wrap gap-2"><button type="button" data-noise-profile-confirm={confirm} disabled={blocked} onClick={() => { void run({ kind: confirm, id: currentProfile.id }) }} className="ui-btn min-h-11 px-3 py-2">{t('profiles.confirm')}</button><button type="button" onClick={cancel} className="ui-btn-soft min-h-11 px-3 py-2">{t('profiles.cancel')}</button></div></div>}
        <label htmlFor={renameId} className="block text-sm font-medium text-body">{t('profiles.renameLabel')}</label>
        <input id={renameId} data-noise-profile-rename value={rename} onChange={event => setRename(event.target.value)} disabled={busy} maxLength={WHITE_NOISE_PROFILE_NAME_LIMIT} className="ui-field min-h-11 w-full min-w-0 px-3 py-2 text-base" />
        <button type="button" data-noise-profile-rename-save disabled={blocked || !rename.trim()} onClick={() => { void run({ kind: 'rename', id: currentProfile.id, name: rename }) }} className="ui-btn-soft min-h-11 px-3 py-2">{t('profiles.rename')}</button>
      </div>}
    </div>}
    <button type="button" data-noise-profile-reload disabled={!hydrated || busy} onClick={reload} className="ui-btn-soft min-h-11 w-full px-4 py-2">{t('profiles.reload')}</button>
    <p className="text-xs text-muted">{t('profiles.localHint')}</p>
  </section>
}
