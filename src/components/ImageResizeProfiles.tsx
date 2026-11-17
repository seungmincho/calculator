'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/imageResizer'
import {
  IMAGE_RESIZE_PROFILES_KEY, IMAGE_RESIZE_PROFILE_LIMIT, IMAGE_RESIZE_PROFILE_NAME_LIMIT,
  readImageResizeProfiles, writeImageResizeProfileAction, imageResizeProfileApplyError,
  type ImageResizeProfileSettings, type ImageResizeProfileAction, type ImageResizeProfilesError, type ImageResizeProfilesSnapshot,
} from '@/utils/imageResizeProfiles'

type Notice = { success: 'saved' | 'renamed' | 'deleted' | 'loaded' | 'refreshed' } | { error: ImageResizeProfilesError }

export default function ImageResizeProfiles({ settings, webpSupported, onLoad }: {
  settings: ImageResizeProfileSettings | null
  webpSupported: boolean | null
  onLoad: (settings: ImageResizeProfileSettings) => void
}) {
  const t = useTranslations('imageResizer')
  const hydrated = useHydrated()
  const [snapshot, setSnapshot] = useState<ImageResizeProfilesSnapshot | null>(null)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)

  // Storage becomes visible after hydration; it never automatically changes URL/output settings.
  if (hydrated && snapshot === null) setSnapshot(readImageResizeProfiles())

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== IMAGE_RESIZE_PROFILES_KEY) return
      if (snapshot?.status === 'ready' && (event.key === null || event.newValue !== snapshot.raw)) {
        setConflict(true)
        setNotice({ error: 'conflict' })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [snapshot])

  const profiles = snapshot?.status === 'ready' ? snapshot.profiles : []
  const blocked = snapshot?.status !== 'ready' || conflict || busy
  const storageError = snapshot && snapshot.status !== 'ready' ? snapshot.status : null
  const error = storageError ?? (conflict ? 'conflict' : notice && 'error' in notice ? notice.error : null)

  const summary = (value: ImageResizeProfileSettings) => {
    const size = value.mode === 'pct'
      ? t('profiles.percentSize', { value: value.percent })
      : value.mode === 'long'
        ? t('profiles.longSize', { value: value.longSide })
        : t('profiles.pixelSize', { width: value.width || t('auto'), height: value.height || t('auto') })
    return t('profiles.summary', {
      size, fit: t(`fit.${value.fit}`), ratio: t(value.lock ? 'profiles.ratioLocked' : 'profiles.ratioUnlocked'),
      format: t(`profiles.formats.${value.format}`), quality: value.format === 'png' ? t('profiles.qualityIgnored') : t('profiles.qualityValue', { value: value.quality }),
      target: value.targetKB ? t('profiles.targetSize', { value: value.targetKB }) : t('targetOff'), bg: value.bg,
    })
  }

  const refresh = () => {
    const next = readImageResizeProfiles()
    setSnapshot(next)
    setConflict(false)
    setEditingId(null)
    setDeletingId(null)
    setNotice(next.status === 'ready' ? { success: 'refreshed' } : { error: next.status })
  }

  const mutate = async (action: ImageResizeProfileAction) => {
    if (blocked || !snapshot) return
    setBusy(true)
    setNotice(null)
    try {
      // Serialize writes from cooperating tabs where Web Locks are available. The raw comparison
      // still detects an older view, and remains the fallback on browsers without Web Locks.
      const commit = () => writeImageResizeProfileAction(snapshot, action)
      const result = navigator.locks
        ? await navigator.locks.request(IMAGE_RESIZE_PROFILES_KEY, commit)
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
    if (!settings) {
      setNotice({ error: 'invalidSettings' })
      return
    }
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    void mutate({ kind: 'add', id, name, settings })
  }

  const load = (id: string) => {
    if (blocked || snapshot?.status !== 'ready') return
    const current = readImageResizeProfiles()
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
    const profile = current.profiles.find((item) => item.id === id)
    if (!profile) {
      setNotice({ error: 'missingProfile' })
      return
    }
    const applyError = imageResizeProfileApplyError(profile.settings, webpSupported)
    if (applyError) {
      setNotice({ error: applyError })
      return
    }
    onLoad({ ...profile.settings })
    setNotice({ success: 'loaded' })
  }

  return (
    <details className="ui-card min-w-0 p-4 sm:p-5" data-testid="image-resize-profiles">
      <summary className="min-h-11 cursor-pointer text-base font-semibold text-fg [overflow-wrap:anywhere]">
        {t('profiles.title')} <span className="text-sm font-normal text-sub">{t('profiles.count', { count: profiles.length, max: IMAGE_RESIZE_PROFILE_LIMIT })}</span>
      </summary>
      <div className="mt-2 space-y-4">
        <p className="text-sm text-sub">{t('profiles.description')}</p>
        {settings && (
          <div className="rounded-xl bg-subtle p-3">
            <p className="text-sm font-medium text-body">{t('profiles.current')}</p>
            <p className="mt-1 text-sm text-sub [overflow-wrap:anywhere]">{summary(settings)}</p>
          </div>
        )}
        {!settings && <p className="text-sm text-sub">{t('profiles.errors.invalidSettings')}</p>}
        <form onSubmit={save} className="space-y-2">
          <label htmlFor="image-profile-name" className="block text-sm font-medium text-body">{t('profiles.name')}</label>
          <input id="image-profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={IMAGE_RESIZE_PROFILE_NAME_LIMIT} placeholder={t('profiles.namePlaceholder')} autoComplete="off" className="ui-field min-h-11 min-w-0 px-3 py-3 text-base" disabled={blocked} aria-describedby="image-profile-name-hint" />
          <p id="image-profile-name-hint" className="text-xs text-muted">{t('profiles.nameHint', { max: IMAGE_RESIZE_PROFILE_NAME_LIMIT })}</p>
          <button type="submit" disabled={blocked || !settings || profiles.length >= IMAGE_RESIZE_PROFILE_LIMIT} className="ui-btn min-h-11 w-full px-3 py-3 disabled:opacity-50">{t(busy ? 'profiles.saving' : 'profiles.save')}</button>
        </form>
        {profiles.length >= IMAGE_RESIZE_PROFILE_LIMIT && <p className="text-sm text-sub">{t('profiles.errors.limit')}</p>}
        {error && (
          <div role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">
            <p>{t(`profiles.errors.${error}`)}</p>
          </div>
        )}
        {!error && notice && 'success' in notice && <p role="status" className="text-sm text-primary">{t(`profiles.${notice.success}`)}</p>}
        {snapshot === null && <p role="status" className="text-sm text-muted">{t('profiles.loading')}</p>}
        {snapshot?.status === 'ready' && profiles.length === 0 && <p className="text-sm text-muted">{t('profiles.empty')}</p>}
        {profiles.length > 0 && (
          <ul className="space-y-3" aria-label={t('profiles.list')}>
            {profiles.map((profile) => (
              <li key={profile.id} className="rounded-xl bg-subtle p-3">
                <h3 className="text-base font-semibold text-fg [overflow-wrap:anywhere]">{profile.name}</h3>
                <p className="mt-1 text-sm text-sub [overflow-wrap:anywhere]">{summary(profile.settings)}</p>
                {profile.settings.format === 'webp' && webpSupported === false && <p className="mt-2 text-xs text-muted">{t('profiles.errors.webpUnsupported')}</p>}
                {editingId === profile.id ? (
                  <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void mutate({ kind: 'rename', id: profile.id, name: editName }) }}>
                    <label htmlFor={`image-profile-rename-${profile.id}`} className="block text-sm font-medium text-body">{t('profiles.newName')}</label>
                    <input id={`image-profile-rename-${profile.id}`} value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={IMAGE_RESIZE_PROFILE_NAME_LIMIT} autoComplete="off" className="ui-field min-h-11 min-w-0 px-3 py-3 text-base" disabled={blocked} />
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('profiles.renameSave')}</button>
                      <button type="button" onClick={() => setEditingId(null)} disabled={busy} className="ui-btn-soft min-h-11 px-3 py-2">{t('profiles.cancel')}</button>
                    </div>
                  </form>
                ) : deletingId === profile.id ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-body [overflow-wrap:anywhere]">{t('profiles.deletePrompt', { name: profile.name })}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { void mutate({ kind: 'delete', id: profile.id }) }} disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('profiles.deleteConfirm')}</button>
                      <button type="button" onClick={() => setDeletingId(null)} disabled={busy} className="ui-btn-soft min-h-11 px-3 py-2">{t('profiles.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => load(profile.id)} disabled={blocked} className="ui-btn min-h-11 px-3 py-2 disabled:opacity-50">{t('profiles.load')}</button>
                    <button type="button" onClick={() => { setEditingId(profile.id); setEditName(profile.name); setDeletingId(null) }} disabled={blocked} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-50">{t('profiles.rename')}</button>
                    <button type="button" onClick={() => { setDeletingId(profile.id); setEditingId(null) }} disabled={blocked} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-50">{t('profiles.delete')}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={refresh} disabled={!hydrated || busy} className="ui-btn-soft min-h-11 w-full px-3 py-2 disabled:opacity-50">{t('profiles.refresh')}</button>
        <p className="text-xs text-muted">{t('profiles.localOnly')}</p>
      </div>
    </details>
  )
}
