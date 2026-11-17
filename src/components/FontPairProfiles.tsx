'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/fontPreview'
import { getPairFont } from '@/utils/fontPairing'
import FontPairBackupPanel from '@/components/FontPairBackupPanel'
import {
  FONT_PAIR_PROFILES_KEY, FONT_PAIR_PROFILE_LIMIT, FONT_PAIR_PROFILE_NAME_LIMIT,
  isFontPairStyles, readFontPairProfiles, withFontPairProfilesLock, writeFontPairProfileAction,
  type FontPairProfileAction, type FontPairProfilesError, type FontPairProfilesSnapshot, type FontPairStyles,
} from '@/utils/fontPairProfiles'

type Notice = { success: 'saved' | 'deleted' | 'loaded' | 'refreshed' } | { error: FontPairProfilesError }

export default function FontPairProfiles({ styles, ready, onLoad }: { styles: FontPairStyles; ready: boolean; onLoad: (styles: FontPairStyles) => boolean }) {
  const t = useTranslations('fontPreview')
  const hydrated = useHydrated()
  const [snapshot, setSnapshot] = useState<FontPairProfilesSnapshot | null>(null)
  const [name, setName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [backupRevision, setBackupRevision] = useState(0)
  const writing = useRef(false)
  const mounted = useRef(false), mutation = useRef(0)

  // Reading storage never applies a profile. Shared URL restoration belongs to the parent.
  if (hydrated && snapshot === null) setSnapshot(readFontPairProfiles())

  useLayoutEffect(() => {
    mounted.current = true
    const activation = mutation.current
    queueMicrotask(() => { if (mounted.current && mutation.current === activation) setBusy(false) })
    const invalidate = () => { mutation.current++; writing.current = false }
    const suspend = () => { invalidate(); setBusy(false) }
    const hidden = () => { if (document.visibilityState === 'hidden') suspend() }
    window.addEventListener('pagehide', suspend); document.addEventListener('visibilitychange', hidden)
    return () => { mounted.current = false; invalidate(); window.removeEventListener('pagehide', suspend); document.removeEventListener('visibilitychange', hidden) }
  }, [])

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== null && event.key !== FONT_PAIR_PROFILES_KEY) return
      if (snapshot?.status === 'ready' && (event.key === null || event.newValue !== snapshot.raw)) {
        setConflict(true)
        setNotice({ error: 'conflict' })
        setDeletingId(null)
      }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [snapshot])

  const profiles = snapshot?.status === 'ready' ? snapshot.profiles : []
  const blocked = !ready || snapshot?.status !== 'ready' || conflict || busy
  const error = snapshot && snapshot.status !== 'ready' ? snapshot.status : conflict ? 'conflict' : notice && 'error' in notice ? notice.error : null
  const summary = (value: FontPairStyles, role: 'title' | 'body') => t('pairing.profiles.styleSummary', {
    role: t(`pairing.roles.${role}`), font: getPairFont(value[role].fontId).name, size: value[role].size, weight: value[role].weight,
  })
  const refresh = () => {
    if (writing.current) return
    const next = readFontPairProfiles()
    setSnapshot(next); setConflict(false); setDeletingId(null); setBackupRevision(value => value + 1)
    setNotice(next.status === 'ready' ? { success: 'refreshed' } : { error: next.status })
  }
  const imported = useCallback((next: Extract<FontPairProfilesSnapshot, { status: 'ready' }>) => {
    setSnapshot(next); setConflict(false); setNotice(null); setDeletingId(null)
  }, [])
  const importConflict = useCallback(() => { setConflict(true); setNotice({ error: 'conflict' }); setDeletingId(null) }, [])
  const mutate = async (action: FontPairProfileAction) => {
    if (blocked || writing.current || !snapshot || !mounted.current || document.visibilityState === 'hidden') return
    const ticket = ++mutation.current, current = () => mounted.current && mutation.current === ticket && document.visibilityState !== 'hidden'
    writing.current = true; setBusy(true); setNotice(null)
    try {
      const result = await withFontPairProfilesLock(() => current() ? writeFontPairProfileAction(snapshot, action) : null)
      if (!current() || !result) return
      if (!result.ok) {
        setNotice({ error: result.error })
        if (result.error === 'conflict') setConflict(true)
        return
      }
      setSnapshot(result.snapshot)
      setNotice({ success: action.kind === 'add' ? 'saved' : 'deleted' })
      if (action.kind === 'add') setName('')
      setDeletingId(null)
    } catch { if (current()) setNotice({ error: 'unavailable' }) }
    finally { if (current()) { writing.current = false; setBusy(false) } }
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFontPairStyles(styles)) { setNotice({ error: 'invalidStyles' }); return }
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    void mutate({ kind: 'add', id, name, styles })
  }
  const load = (id: string) => {
    if (blocked || writing.current || snapshot?.status !== 'ready') return
    const current = readFontPairProfiles()
    if (current.status !== 'ready') { setSnapshot(current); setNotice({ error: current.status }); return }
    if (current.raw !== snapshot.raw) { setConflict(true); setNotice({ error: 'conflict' }); return }
    const profile = current.profiles.find(item => item.id === id)
    if (!profile) { setNotice({ error: 'missingProfile' }); return }
    if (!onLoad(profile.styles)) { setNotice({ error: 'invalidStyles' }); return }
    setNotice({ success: 'loaded' }); setDeletingId(null)
  }

  return <details open data-font-pair-profiles className="min-w-0 border-t border-line pt-4">
    <summary className="min-h-11 cursor-pointer text-base font-semibold text-fg [overflow-wrap:anywhere]">
      {t('pairing.profiles.title')} <span className="text-sm font-normal text-sub">{t('pairing.profiles.count', { count: profiles.length, max: FONT_PAIR_PROFILE_LIMIT })}</span>
    </summary>
    <div className="mt-2 space-y-4">
      <p className="text-sm text-sub">{t('pairing.profiles.description')}</p>
      <form onSubmit={save} className="space-y-2">
        <label htmlFor="font-pair-profile-name" className="block text-sm font-medium text-body">{t('pairing.profiles.name')}</label>
        <input id="font-pair-profile-name" value={name} onChange={event => setName(event.target.value)} maxLength={FONT_PAIR_PROFILE_NAME_LIMIT} autoComplete="off" disabled={blocked} className="ui-field min-h-11 min-w-0 w-full px-3 py-3 text-base" aria-describedby="font-pair-profile-name-hint" />
        <p id="font-pair-profile-name-hint" className="text-xs text-muted">{t('pairing.profiles.nameHint', { max: FONT_PAIR_PROFILE_NAME_LIMIT })}</p>
        <button type="submit" disabled={blocked || !name.trim() || profiles.length >= FONT_PAIR_PROFILE_LIMIT} className="ui-btn min-h-11 w-full px-3 py-3 disabled:opacity-50">{t(busy ? 'pairing.profiles.saving' : 'pairing.profiles.save')}</button>
      </form>
      {error && <p role="alert" className="text-sm text-body">{t(`pairing.profiles.errors.${error}`)}</p>}
      {!error && notice && 'success' in notice && <p role="status" className="text-sm text-primary">{t(`pairing.profiles.${notice.success}`)}</p>}
      {!ready || snapshot === null ? <p role="status" className="text-sm text-muted">{t('pairing.profiles.loading')}</p> : snapshot.status === 'ready' && profiles.length === 0 && <p className="text-sm text-muted">{t('pairing.profiles.empty')}</p>}
      {profiles.length >= FONT_PAIR_PROFILE_LIMIT && <p className="text-xs text-muted">{t('pairing.profiles.errors.limit')}</p>}
      {profiles.length > 0 && <ul aria-label={t('pairing.profiles.list')} className="space-y-3">
        {profiles.map(profile => <li key={profile.id} className="rounded-xl bg-subtle p-3 space-y-2">
          <h3 className="text-base font-semibold text-fg [overflow-wrap:anywhere]">{profile.name}</h3>
          {(['title', 'body'] as const).map(role => <p key={role} className="text-sm text-sub [overflow-wrap:anywhere]">{summary(profile.styles, role)}</p>)}
          {deletingId === profile.id ? <div className="space-y-2">
            <p className="text-sm text-body [overflow-wrap:anywhere]">{t('pairing.profiles.deletePrompt', { name: profile.name })}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={blocked} onClick={() => { void mutate({ kind: 'delete', id: profile.id }) }} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('pairing.profiles.deleteConfirm')}</button>
              <button type="button" disabled={busy} onClick={() => setDeletingId(null)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('pairing.profiles.cancel')}</button>
            </div>
          </div> : <div className="flex flex-wrap gap-2">
            <button type="button" disabled={blocked} onClick={() => load(profile.id)} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('pairing.profiles.load')}</button>
            <button type="button" disabled={blocked} onClick={() => setDeletingId(profile.id)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('pairing.profiles.delete')}</button>
          </div>}
        </li>)}
      </ul>}
      <FontPairBackupPanel snapshot={snapshot} disabled={blocked} revision={backupRevision} onImported={imported} onConflict={importConflict} />
      <button type="button" disabled={!hydrated || busy} onClick={refresh} className="ui-btn-soft min-h-11 w-full px-3 py-2 text-sm disabled:opacity-50">{t('pairing.profiles.refresh')}</button>
      <p className="text-xs text-muted">{t('pairing.profiles.localOnly')}</p>
    </div>
  </details>
}
